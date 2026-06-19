import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import FireflyBackground from '../components/Fireflybackground';
import MovieCard from '../components/MovieCard';
import MovieDetailModal from '../components/MovieDetailModal';
import { API_BASE_URL } from '../config/api';

// ── Normalisasi field ─────────────────────────────────────────────
const normalizeMovie = (movie) => {
  const rawId = movie.movie_id ?? movie.movieId ?? movie.tmdb_id ?? movie.id;
  const cleanId = rawId ? String(rawId).trim() : null;

  return {
    ...movie,
    movieId: cleanId,
    movie_id: cleanId,
    tmdb_id: cleanId,
    title: movie.title ?? 'Judul tidak tersedia',
    genres: movie.genres ?? '',
    poster_url: movie.poster_url ?? movie.posterUrl ?? (movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null),
    overview: movie.overview ?? '',
    vote_average: movie.vote_average ?? movie.avg_rating ?? null,
    vote_count: movie.vote_count ?? movie.votes ?? null,
    popularity: movie.popularity ?? 0,
    release_year: movie.release_year ?? movie.year ?? null,
    recommendation_source: movie._recommendation_source ?? movie.recommendation_source ?? movie.source ?? null,
    _recommendation_source: movie._recommendation_source ?? movie.recommendation_source ?? movie.source ?? null,
    source: 'tmdb'
  };
};

const normalizeMovies = (movies = []) =>
  movies
    .map(normalizeMovie)
    .filter((m) => m.movieId && m.poster_url && m.poster_url.trim() !== '');

const getWeightedScore = (movie) => {
  const rating = Number(movie.vote_average ?? movie.avg_rating ?? 0);
  const popularity = Number(movie.popularity ?? 0);
  const voteCount = Number(movie.vote_count ?? 0);

  const ratingScore = Math.min(Math.max(rating, 0), 10) / 10;
  const popularityScore = Math.min(Math.max(popularity, 0), 1000) / 1000;
  const voteScore = Math.min(Math.max(voteCount, 0), 50000) / 50000;

  return (ratingScore * 0.55) + (voteScore * 0.3) + (popularityScore * 0.15);
};

// PERBAIKAN 1: Penggabungan bucket yang kebal tipe data int vs string dan menjamin anti-duplikat
const mergeRecommendationBuckets = (personal = [], fresh = [], limit = 6) => {
  const seen = new Set();
  const merged = [];

  const pushUnique = (movie, source) => {
    if (!movie || !movie.movieId) return;
    const key = String(movie.movieId || movie.movie_id || movie.tmdb_id).trim();

    if (seen.has(key)) return;
    seen.add(key);
    merged.push({ ...movie, _recommendation_source: source });
  };

  personal.forEach((movie) => pushUnique(movie, 'personal'));
  fresh.forEach((movie) => pushUnique(movie, 'fresh'));

  return merged.slice(0, limit);
};

// ── Fetch dengan timeout & abort support ─────────────────────────
const fetchWithTimeout = (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

// ── Section header dengan garis aksen kiri ───────────────────────
const SectionHeading = ({ icon, iconColor, title, badge, extra }) => (
  <div className="flex items-center gap-3 mb-5">
    <span className={`h-5 w-1 rounded-full ${iconColor.replace('text-', 'bg-')}`} />
    <h2 className="text-base font-bold flex items-center gap-2 text-white">
      <i className={`${icon} ${iconColor}`} />
      {title}
      {badge && (
        <span className="text-[10px] font-normal text-white/30 ml-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
          {badge}
        </span>
      )}
      {extra}
    </h2>
  </div>
);

// ── Section horizontal scroll ────────────────────────────────────
const MovieSection = ({ icon, iconColor, title, badge, movies, onClickDetail }) => {
  if (!movies?.length) return null;
  return (
    <section className="rounded-[1.75rem] border border-white/[0.05] bg-white/[0.015] p-5 md:p-6">
      <div className="flex items-center justify-between mb-1">
        <SectionHeading icon={icon} iconColor={iconColor} title={title} badge={badge} />
        <span className="text-[11px] text-white/25 font-medium shrink-0">{movies.length} film</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1 pt-3 scrollbar-hide snap-x">
        {movies.map((movie, index) => (
          <div
            key={`${movie.movieId || movie.movie_id}-${index}`}
            className="w-[130px] sm:w-[140px] md:w-[160px] snap-start shrink-0"
          >
            <MovieCard movie={movie} onClickDetail={onClickDetail} />
          </div>
        ))}
      </div>
    </section>
  );
};

// ── Skeleton loader card ─────────────────────────────────────────
const CardSkeleton = () => (
  <div className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] animate-pulse">
    <div className="aspect-[2/3] bg-white/[0.05]" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-white/[0.07] rounded w-3/4" />
      <div className="h-2 bg-white/[0.04] rounded w-1/2" />
    </div>
  </div>
);

// ── Quick stat pill ──────────────────────────────────────────────
// ================================================================
const Home = () => {
  const { user } = useContext(AuthContext);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const activeUser = (() => {
    if (user) return user;
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();

  const [recommended, setRecommended] = useState([]);
  const [recentRecs, setRecentRecs] = useState([]);
  const [referenceMovie, setReferenceMovie] = useState(null);
  const [topRated, setTopRated] = useState([]);
  const [latestMovies, setLatestMovies] = useState([]);
  const [actionMovies, setActionMovies] = useState([]);
  const [comedyMovies, setComedyMovies] = useState([]);
  const [dramaMovies, setDramaMovies] = useState([]);
  const [horrorMovies, setHorrorMovies] = useState([]);
  const [scifiMovies, setScifiMovies] = useState([]);
  const [nowPlaying, setNowPlaying] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [tmdbFreshMix, setTmdbFreshMix] = useState([]);

  const [leaderboard, setLeaderboard] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const [loadingStatic, setLoadingStatic] = useState(true);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recError, setRecError] = useState(false);

  const userId = activeUser?.user_id ?? activeUser?.id ?? null;
  const fetchedRef = useRef(false);

  // ── 1. Fetch data statis ──
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchStatic = async () => {
      setLoadingStatic(true);

      const [trendingRes, topRes, latestRes, actionRes, comedyRes, dramaRes, horrorRes, scifiRes, nowRes, statsRes] =
        await Promise.allSettled([
          fetchWithTimeout(`${API_BASE_URL}/movies/trending`),
          fetchWithTimeout(`${API_BASE_URL}/movies/top-rated`),
          fetchWithTimeout(`${API_BASE_URL}/movies/latest`),
          fetchWithTimeout(`${API_BASE_URL}/movies/genre/action`),
          fetchWithTimeout(`${API_BASE_URL}/movies/genre/comedy`),
          fetchWithTimeout(`${API_BASE_URL}/movies/genre/drama`),
          fetchWithTimeout(`${API_BASE_URL}/movies/genre/horror`),
          fetchWithTimeout(`${API_BASE_URL}/movies/genre/sci-fi`),
          fetchWithTimeout(`${API_BASE_URL}/movies/now-playing`),
          fetchWithTimeout(`${API_BASE_URL}/stats/home`),
        ]);

      const parse = async (settled) => {
        if (settled.status !== 'fulfilled' || !settled.value.ok) return null;
        try { return await settled.value.json(); } catch { return null; }
      };

      const [trending, top, latest, action, comedy, drama, horror, scifi, now, stats] = await Promise.all([
        parse(trendingRes), parse(topRes), parse(latestRes),
        parse(actionRes), parse(comedyRes), parse(dramaRes),
        parse(horrorRes), parse(scifiRes), parse(nowRes), parse(statsRes)
      ]);

      const trendingMoviesList = trending?.status === 'ok' ? normalizeMovies(trending.movies) : [];
      const nowPlayingMoviesList = now?.status === 'ok' ? normalizeMovies(now.movies) : [];

      const freshPool = [
        ...trendingMoviesList.slice(0, 4),
        ...nowPlayingMoviesList.slice(0, 3),
      ];

      if (trendingMoviesList.length > 0) {
        setTrendingMovies(trendingMoviesList);
      }
      if (top?.status === 'ok') {
        const weightedTop = normalizeMovies(top.movies)
          .sort((a, b) => getWeightedScore(b) - getWeightedScore(a));
        setTopRated(weightedTop);
      }
      if (latest?.status === 'ok') setLatestMovies(normalizeMovies(latest.movies));
      if (action?.status === 'ok') setActionMovies(normalizeMovies(action.movies));
      if (comedy?.status === 'ok') setComedyMovies(normalizeMovies(comedy.movies));
      if (drama?.status === 'ok') setDramaMovies(normalizeMovies(drama.movies));
      if (horror?.status === 'ok') setHorrorMovies(normalizeMovies(horror.movies));
      if (scifi?.status === 'ok') setScifiMovies(normalizeMovies(scifi.movies));
      if (now?.status === 'ok') setNowPlaying(nowPlayingMoviesList);
      if (stats?.status === 'ok') {
        const leaders = stats.top_contributors.map((c, i) => ({
          rank: i + 1,
          user_id: c.user_id,
          username: c.username,
          score: c.score,
          avatar: c.profile_picture || `https://ui-avatars.com/api/?name=${c.username}&background=random&color=fff`
        }));
        setLeaderboard(leaders);
        setRecentActivity(stats.recent_activity || []);
      }
      setTmdbFreshMix(freshPool);
      setLoadingStatic(false);
    };

    fetchStatic();
  }, []);

  // ── 3. Fetch rekomendasi ML (Anti-Infinite Loop) ──
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoadingRec(true);
        setRecError(false);
      }
    });

    const fetchRec = async () => {
      try {
        const res = await fetchWithTimeout(
          `${API_BASE_URL}/recommend`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: Number(userId), top_n: 6 }),
          },
          15000
        );

        if (cancelled) return;

        const data = await res.json();
        const list = Array.isArray(data?.recommendations)
          ? data.recommendations
          : Array.isArray(data?.movies) ? data.movies : [];

        if (res.ok && data.status === 'ok' && list.length > 0) {
          const normalized = normalizeMovies(list);
          if (normalized.length > 0) {
            // PERBAIKAN 2: Pastikan data tmdbFreshMix ikut dinormalisasi sebelum masuk pemisah agar filtering key string sukses
            const normalizedFresh = normalizeMovies(tmdbFreshMix);
            setRecommended(mergeRecommendationBuckets(normalized, normalizedFresh, 6));
          }
          const basedOnRecent = data?.based_on_recent || {};
          setReferenceMovie(basedOnRecent.reference_movie || null);
          setRecentRecs(
            normalizeMovies((basedOnRecent.movies || []).map((movie) => ({
              ...movie,
              _recommendation_source: 'recent',
              recommendation_source: 'recent',
            }))).slice(0, 6)
          );
        } else {
          setRecError(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[Home] /recommend gagal, pakai fallback:', err.message);
          setRecError(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingRec(false);
        }
      }
    };

    fetchRec();
    return () => { cancelled = true; };
  }, [userId, tmdbFreshMix]);

  const displayRecommended = userId
    ? recommended
    : (recommended.length > 0
      ? recommended
      : (tmdbFreshMix.length > 0 ? tmdbFreshMix.slice(0, 6) : trendingMovies.slice(0, 6)));

  const handleOpenDetail = (movie) => {
    setSelectedMovie(movie);
  };

  const displayName = activeUser?.username || activeUser?.name || 'Pengunjung';

  return (
    <div className="relative isolate space-y-10 pb-12">
      <FireflyBackground />

      <div className="relative z-10">
      {/* ── Header Dashboard Sapaan ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/[0.05] pb-6 mt-4 gap-4">
        <div>
          <p className="text-indigo-400 font-bold text-xs mb-1 uppercase tracking-widest">
            {activeUser ? 'Selamat Datang Kembali,' : 'Jelajahi Koleksi Film'}
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            {displayName}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-white text-sm font-semibold">{displayName}</p>
            <p className="text-white/40 text-xs">{activeUser?.email || 'Premium Member'}</p>
          </div>
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/10 shrink-0">
            <img
              src={
                activeUser?.profile_picture ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff`
              }
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {loadingStatic ? (
        <div className="space-y-10">
          <div className="w-full h-64 md:h-80 rounded-2xl bg-white/[0.04] animate-pulse" />
          <div>
            <div className="h-4 w-44 bg-white/[0.06] rounded mb-6 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ══════════════ Kolom Kiri: Main Dashboard Content ══════════════ */}
          <div className="space-y-10 min-w-0">

            {/* ── Hero Banner ── */}
            {/* ── Rekomendasi ML AI ── */}
            <section className="rounded-[1.75rem] border border-indigo-500/[0.12] bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-transparent p-5 md:p-6">
              <SectionHeading
                icon="fas fa-magic"
                iconColor="text-indigo-400"
                title={userId ? 'Rekomendasi Untukmu' : 'Film Populer'}
                extra={
                  <>
                    <span className="text-[10px] font-bold text-indigo-400/80 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider scale-90">
                      AI Recommendation
                    </span>
                    {loadingRec && (
                      <span className="text-[10px] text-indigo-300/50 flex items-center gap-1.5 ml-1">
                        <i className="fas fa-circle-notch fa-spin text-[9px]" /> memuat...
                      </span>
                    )}
                    {recError && !loadingRec && (
                      <span className="text-[10px] font-normal text-amber-400/60 ml-1 bg-amber-400/5 px-2 py-0.5 rounded-full border border-amber-400/10">
                        trending
                      </span>
                    )}
                  </>
                }
              />

              {loadingRec && recommended.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : displayRecommended.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
                  {displayRecommended.map((movie, index) => (
                    <div key={`${movie.movieId}-${index}`}>
                      {/* PERBAIKAN 3: Lempar onClickDetail ke MovieCard AI agar modal terbuka sukses */}
                      <MovieCard movie={movie} onClickDetail={handleOpenDetail} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 text-center">
                  <p className="text-white/40 text-sm">Belum ada film untuk ditampilkan.</p>
                </div>
              )}
            </section>

            {referenceMovie && recentRecs.length > 0 && (
              <MovieSection
                icon="fas fa-history"
                iconColor="text-emerald-400"
                title={`Karena kamu menonton "${referenceMovie}"`}
                badge="recent"
                movies={recentRecs}
                onClickDetail={handleOpenDetail}
              />
            )}

            <div className="flex items-center gap-3 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/25">Jelajahi Koleksi</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <MovieSection
              icon="fas fa-ticket-alt"
              iconColor="text-pink-400"
              title="Tayang Sekarang"
              badge="LIVE"
              movies={nowPlaying}
              onClickDetail={handleOpenDetail}
            />

            <MovieSection
              icon="fas fa-chart-line"
              iconColor="text-cyan-400"
              title="Trending Film"
              movies={trendingMovies}
              onClickDetail={handleOpenDetail}
            />

            <MovieSection
              icon="fas fa-star"
              iconColor="text-yellow-400"
              title="Rating Tertinggi"
              movies={topRated}
              onClickDetail={handleOpenDetail}
            />

            <MovieSection
              icon="fas fa-calendar-alt"
              iconColor="text-green-400"
              title="Rilis Terbaru"
              movies={latestMovies}
              onClickDetail={handleOpenDetail}
            />

            <div className="flex items-center gap-3 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/25">Berdasarkan Genre</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>

            <MovieSection
              icon="fas fa-bomb"
              iconColor="text-red-400"
              title="Aksi Mendebarkan"
              movies={actionMovies}
              onClickDetail={handleOpenDetail}
            />

            <MovieSection
              icon="fas fa-laugh"
              iconColor="text-yellow-400"
              title="Komedi Terlucu"
              movies={comedyMovies}
              onClickDetail={handleOpenDetail}
            />

            <MovieSection
              icon="fas fa-mask"
              iconColor="text-blue-400"
              title="Kisah Drama Pilihan"
              movies={dramaMovies}
              onClickDetail={handleOpenDetail}
            />

            <MovieSection
              icon="fas fa-ghost"
              iconColor="text-purple-400"
              title="Horor Menyeramkan"
              movies={horrorMovies}
              onClickDetail={handleOpenDetail}
            />

            <MovieSection
              icon="fas fa-rocket"
              iconColor="text-teal-400"
              title="Petualangan Sci-Fi"
              movies={scifiMovies}
              onClickDetail={handleOpenDetail}
            />

          </div>

          {/* ══════════════ Kolom Kanan: Sidebar ══════════════ */}
          <div className="hidden lg:block shrink-0 space-y-6">
            <div className="space-y-6">

              {/* Leaderboard Kontributor */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-5 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <i className="fas fa-trophy text-amber-400 text-xs" /> Top Contributors
                  </h3>
                  <p className="text-[10px] text-white/40 mt-1 font-semibold">Berdasarkan ulasan dan aktivitas forum.</p>
                </div>
                <div className="space-y-4">
                  {leaderboard?.map((u, i) => (
                    <div key={u.username} className="flex items-center justify-between gap-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl hover:bg-white/[0.04] transition-all">
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-black w-4 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-white/20'}`}>
                          {u.rank}
                        </span>
                        <img
                          src={u.avatar}
                          alt={u.username}
                          className="w-8 h-8 rounded-full border border-white/10 shrink-0 cursor-pointer hover:border-indigo-400 transition-colors"
                          onClick={() => window.location.href = `/user/${u.user_id}`}
                        />
                        <span
                          className="text-xs font-bold text-white truncate max-w-[120px] cursor-pointer hover:text-indigo-400 transition-colors"
                          onClick={() => window.location.href = `/user/${u.user_id}`}
                        >
                          {u.username}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 py-1 px-2.5 rounded-full border border-indigo-500/20">{u.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aktivitas Komunitas Terbaru */}
              <div className="bg-white/[0.01] border border-white/[0.05] rounded-3xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <i className="fas fa-bolt text-teal-400 text-xs" /> Aktivitas Komunitas
                  </h3>
                  <p className="text-[10px] text-white/40 mt-1 font-semibold">Ulasan terbaru dari member.</p>
                </div>

                <div className="space-y-3">
                  {recentActivity && recentActivity.length > 0 ? (
                    recentActivity.map((act, i) => (
                      <div key={i} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={act.user?.profile_picture || `https://ui-avatars.com/api/?name=${act.user?.username}&background=random&color=fff`}
                            alt={act.user?.username}
                            className="w-5 h-5 rounded-full object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => window.location.href = `/user/${act.user?.user_id}`}
                          />
                          <span
                            className="text-[10px] font-bold text-white/80 cursor-pointer hover:text-teal-400 transition-colors"
                            onClick={() => window.location.href = `/user/${act.user?.user_id}`}
                          >
                            {act.user?.username}
                          </span>
                          <span className="text-[9px] text-white/30 ml-auto">{new Date(act.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                          "{act.content}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-xs text-white/30">Belum ada aktivitas terbaru.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── DETAIL MODAL KINI MENYELIMUTI SELURUH AREA CARD KLIK ── */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
      </div>
    </div>
  );
};

export default Home;
