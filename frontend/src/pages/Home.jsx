import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AmbientBanner from '../components/AmbientBanner';
import MovieCard from '../components/MovieCard';

const Home = () => {
  const { user } = useContext(AuthContext);

  // ── FIX: hitung activeUser SEKALI saat mount, bukan setiap render ──────
  // Lazy initializer pada useState hanya jalan sekali, jadi referensinya stabil.
  const [activeUser] = useState(() => {
    if (user) return user;
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [featuredMovie, setFeaturedMovie] = useState(null);
  const [recommendedMovies, setRecommendedMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(activeUser));

  // ── FIX: dependency berupa primitive (string/number), bukan objek ──────
  const userId = activeUser?.user_id ?? activeUser?.id;

  useEffect(() => {
    // Kalau tidak ada user sama sekali, tidak perlu fetch apapun
    if (!activeUser) {
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      let popularMovies = [];

      // 1. Ambil film trending (sumber utama + fallback rekomendasi)
      try {
        const resPopular = await fetch('http://127.0.0.1:5000/movies/trending');
        const dataPopular = await resPopular.json();
        if (dataPopular.status === 'ok' && Array.isArray(dataPopular.movies) && dataPopular.movies.length > 0) {
          popularMovies = dataPopular.movies;
          setFeaturedMovie(popularMovies[0]);
        }
      } catch (err) {
        console.error('Gagal mengambil Trending:', err);
      }

      // 2. Ambil rekomendasi ML personal
      console.log('[DEBUG] userId yang dipakai untuk /recommend:', userId, '(type:', typeof userId, ')');

      if (userId) {
        try {
          console.log('[DEBUG] Mengirim POST /recommend...');
          const resRec = await fetch('http://127.0.0.1:5000/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
          });

          console.log('[DEBUG] Status response /recommend:', resRec.status, resRec.ok);

          const dataRec = await resRec.json();
          console.log('[DEBUG] Body response /recommend:', dataRec);

          // FIX: cek beberapa kemungkinan nama field dari backend
          const recList = dataRec.recommendations ?? dataRec.movies;

          if (resRec.ok && dataRec.status === 'ok' && Array.isArray(recList) && recList.length > 0) {
            // Backend sudah enrich poster_url & trailer_url dari MongoDB,
            // tinggal mapping minor untuk konsistensi nama field di MovieCard
            const enriched = recList.map((m) => ({
              movieId: m.movieId ?? m.movie_id,
              title: m.title,
              genres: m.genres,
              poster_url: m.poster_url ?? null,
              trailer_url: m.trailer_url ?? null,
              // Tampilkan skor prediksi ML sebagai "rating" di MovieCard
              avg_rating: m.hybrid_score ?? null,
            }));

            console.log('[DEBUG] recommendedMovies (enriched):', enriched);
            console.log('[DEBUG] poster_url tiap film:', enriched.map(m => ({ title: m.title, poster_url: m.poster_url })));
            setRecommendedMovies(enriched.slice(0, 6));
          } else {
            console.warn('[DEBUG] /recommend tidak valid, pakai fallback trending. recList:', recList);
            setRecommendedMovies(popularMovies.slice(1, 7));
          }
        } catch (err) {
          console.error('[DEBUG] Fetch /recommend melempar error:', err);
          setRecommendedMovies(popularMovies.slice(1, 7));
        }
      } else {
        console.warn('[DEBUG] userId falsy, /recommend TIDAK dipanggil sama sekali.');
        setRecommendedMovies(popularMovies.slice(1, 7));
      }

      setIsLoading(false);
    };

    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // FIX: jalan sekali saat mount, sama seperti Trending & Catalog

  // Jika benar-benar tidak ada sesi
  if (!activeUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/50">
        <i className="fas fa-exclamation-triangle text-4xl mb-4 text-red-500" />
        <p>Data sesi tidak ditemukan. Silakan Log Out dan Login kembali.</p>
      </div>
    );
  }

  const displayName = activeUser.username || activeUser.name || 'Pengguna';

  return (
    <div className="space-y-12 pb-10">

      <div className="flex items-end justify-between border-b border-white/[0.05] pb-6 mt-4">
        <div>
          <p className="text-indigo-400 font-bold text-xs mb-1 uppercase tracking-widest">
            Selamat Datang Kembali,
          </p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
            {displayName}
          </h1>
        </div>
        <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
          <img
            src={activeUser.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff`}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 text-white/30">
          <i className="fas fa-circle-notch fa-spin text-4xl mb-4 text-indigo-500/50" />
          <p className="text-sm font-medium">Menyiapkan rekomendasi personal...</p>
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
              <i className="fas fa-fire text-orange-500" /> Sorotan Hari Ini
            </h2>
            {featuredMovie ? (
              <AmbientBanner movie={featuredMovie} />
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 text-center">
                <p className="text-white/40 text-sm">Belum ada film unggulan untuk ditampilkan.</p>
              </div>
            )}
          </section>

          {/* Rekomendasi */}
          <section>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <i className="fas fa-magic text-indigo-400" /> Rekomendasi Untukmu
            </h2>

            {recommendedMovies.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                {recommendedMovies.map((movie) => (
                  <MovieCard key={movie.movieId ?? movie.movie_id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-8 text-center">
                <p className="text-white/50 text-sm">Belum ada film yang bisa ditampilkan.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default Home;