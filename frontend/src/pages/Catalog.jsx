import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import MovieCard from '../components/MovieCard';
import MovieDetailModal from '../components/MovieDetailModal';
import { API_BASE_URL } from '../config/api';

const PAGE_SIZE = 20;

const normalizeMovie = (movie) => ({
  ...movie,
  movieId: movie.movieId ?? movie.movie_id ?? null,
  title: movie.title ?? 'Judul tidak tersedia',
  genres: movie.genres ?? '',
  poster_url: movie.poster_url ?? null,
  overview: movie.overview ?? '',
  vote_average: movie.vote_average ?? movie.avg_rating ?? null,
  release_year: movie.release_year ?? null,
});

const normalizeMovies = (movies = []) =>
  movies
    .map(normalizeMovie)
    .filter((m) => m.poster_url && m.poster_url.trim() !== '');

const CardSkeleton = () => (
  <div className="rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] animate-pulse">
    <div className="aspect-[2/3] bg-white/[0.05]" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-white/[0.07] rounded w-3/4" />
      <div className="h-2 bg-white/[0.04] rounded w-1/2" />
    </div>
  </div>
);

const GENRES_LIST = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
  'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
  'Horror', 'Music', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'War'
];

const YEAR_RANGES = [
  { label: 'Semua Tahun', value: null },
  { label: 'Era 2020-an', value: [2020, 2029] },
  { label: 'Era 2010-an', value: [2010, 2019] },
  { label: 'Era 2000-an', value: [2000, 2009] },
  { label: 'Era 90-an', value: [1990, 1999] },
  { label: 'Era Klasik (<1990)', value: [0, 1989] },
];

const RATING_PRESETS = [
  { label: 'Semua Rating', min: 0 },
  { label: '⭐ 6+ Keatas', min: 6 },
  { label: '⭐ 7+ Keatas', min: 7 },
  { label: '⭐ 8+ Keatas', min: 8 },
  { label: '⭐ 9+ Keatas', min: 9 },
];

const Catalog = () => {
  const [allMovies, setAllMovies] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedYearRange, setSelectedYearRange] = useState(null);
  const [minRating, setMinRating] = useState(0);

  // OPTIMASI: AbortController untuk membatalkan request lama agar tidak menumpuk & membuat lag
  const abortControllerRef = useRef(null);

  const fetchMoviesPage = useCallback(async (page = 1, append = false, query = searchQuery) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    setError(null);

    // Batalkan request sebelumnya yang belum selesai
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // OPTIMASI: Limit pencarian disamakan dengan PAGE_SIZE (40) bukan 100 agar beban memori turun drastis
      const endpoint = query.trim()
        ? `${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}&page=${page}&limit=${PAGE_SIZE}`
        : `${API_BASE_URL}/movies?page=${page}&limit=${PAGE_SIZE}`;

      const res = await fetch(endpoint, { signal });
      const data = await res.json();

      if (data.status === 'ok') {
        const rawMovies = data.movies || data.results || [];
        const normalized = normalizeMovies(rawMovies);

        if (append) {
          setAllMovies((prev) => {
            const merged = [...prev, ...normalized];
            const unique = new Map(merged.map((movie) => [movie.movieId, movie]));
            return Array.from(unique.values());
          });
        } else {
          setAllMovies(normalized);
          setVisibleCount(PAGE_SIZE);
        }
      } else {
        setError('Gagal memuat katalog.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Gagal memuat katalog:', err);
        setError('Tidak dapat terhubung ke server.');
      }
    } finally {
      // Pastikan state loading hanya dimatikan jika request ini adalah request terakhir (tidak di-abort)
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsSearching(false);
      }
    }
  }, [searchQuery]);

  useEffect(() => {
    // OPTIMASI: Logic debounce yang lebih rapi
    const timer = setTimeout(() => {
      if (searchQuery.trim()) setIsSearching(true);
      fetchMoviesPage(1, false, searchQuery);
    }, searchQuery.trim() ? 400 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchMoviesPage]);

  const filteredMovies = useMemo(() => {
    let result = allMovies; // OPTIMASI: Hindari destructing copy jika tidak difilter

    if (selectedGenres.length > 0) {
      result = result.filter((movie) => {
        if (!movie.genres) return false;
        // OPTIMASI: Menggunakan `.toLowerCase().includes()` lebih cepat daripada array split
        const movieGenresStr = movie.genres.toLowerCase();
        return selectedGenres.some((selected) => movieGenresStr.includes(selected.toLowerCase()));
      });
    }

    if (selectedYearRange) {
      const [startYear, endYear] = selectedYearRange;
      result = result.filter((movie) => {
        const year = parseInt(movie.release_year, 10);
        return year && !Number.isNaN(year) && year >= startYear && year <= endYear;
      });
    }

    if (minRating > 0) {
      result = result.filter((movie) => {
        const rating = parseFloat(movie.vote_average);
        return rating && !Number.isNaN(rating) && rating >= minRating;
      });
    }

    return result;
  }, [allMovies, selectedGenres, selectedYearRange, minRating]);

  const visibleMovies = filteredMovies.slice(0, visibleCount);
  const totalShown = visibleMovies.length;

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) => (
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    ));
    setVisibleCount(PAGE_SIZE);
  };

  const handleResetFilters = () => {
    setSelectedGenres([]);
    setSelectedYearRange(null);
    setMinRating(0);
    setSearchQuery('');
    setVisibleCount(PAGE_SIZE);
  };

  const handleLoadMore = async () => {
    // Buka blokir saat searching agar user bisa load data ke bawah walau sedang pakai search bar
    if (visibleCount < filteredMovies.length) {
      setVisibleCount((prev) => prev + PAGE_SIZE);
      return;
    }

    const nextPage = Math.floor(allMovies.length / PAGE_SIZE) + 1;
    await fetchMoviesPage(nextPage, true, searchQuery);
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  const hasActiveFilters = searchQuery || selectedYearRange || minRating > 0 || selectedGenres.length > 0;

  return (
    <div className="space-y-8 animate-fade-in pb-16 mt-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.05] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            <i className="fas fa-compass" /> Eksplorasi
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Katalog Film</h1>
          <p className="text-white/40 text-sm max-w-xl leading-relaxed">
            Telusuri koleksi film MovieHub dengan pencarian, filter, dan load more yang lebih fleksibel.
          </p>
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <i className={`fas absolute left-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none ${isSearching ? 'fa-circle-notch fa-spin' : 'fa-search'}`} />
          <input
            type="text"
            placeholder="Cari judul film..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl py-2.5 pl-11 pr-10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              aria-label="Hapus pencarian"
            >
              <i className="fas fa-times text-xs" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          {(hasActiveFilters || isSearching) && !isLoading && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/5 px-4 py-3 rounded-2xl">
              <p className="text-white/40 text-xs">
                Menampilkan <span className="text-white font-bold">{totalShown}</span> dari <span className="text-white font-bold">{filteredMovies.length}</span> hasil
              </p>
              <button
                onClick={handleResetFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
              >
                <i className="fas fa-rotate-left text-[10px]" /> Reset Semua Filter
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {Array.from({ length: 15 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 text-white/30">
              <i className="fas fa-exclamation-triangle text-3xl mb-4 text-red-500/50" />
              <p className="text-sm">{error}</p>
              <button
                onClick={() => fetchMoviesPage(1, false)}
                className="mt-4 px-4 py-2 rounded-lg text-xs bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-white/50"
              >
                Coba lagi
              </button>
            </div>
          ) : visibleMovies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-white/30 bg-white/[0.01] border border-white/5 rounded-3xl">
              <i className="fas fa-film text-4xl mb-4 text-white/10" />
              <p className="text-sm">
                Tidak ada film yang cocok dengan kombinasi filter Anda.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5 animate-fade-in">
                {visibleMovies.map((movie, idx) => (
                  <MovieCard
                    key={`${movie.movieId ?? movie.movie_id ?? idx}-${idx}`}
                    movie={movie}
                    onClickDetail={setSelectedMovie}
                  />
                ))}
              </div>

              <div className="flex flex-col items-center gap-3 pt-4">
                <p className="text-xs text-white/35">
                  Menampilkan {visibleMovies.length} film. {searchQuery.trim() ? 'Hapus pencarian untuk memuat lebih banyak.' : 'Muat lebih banyak film kapan saja.'}
                </p>
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore || searchQuery.trim().length > 0}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {isLoadingMore ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-layer-group" />}
                  {searchQuery.trim() ? 'Load more nonaktif saat pencarian' : 'Load More'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sticky top-24 bg-white/[0.01] border border-white/[0.05] p-5 rounded-3xl space-y-6">
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <i className="fas fa-sliders text-indigo-400 text-xs" /> Filter Lanjutan
            </h3>
            <p className="text-[10px] text-white/40 mt-1 font-medium">Kombinasikan opsi berikut.</p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-white/[0.05]">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Genre Film</label>
            <div className="flex flex-wrap gap-1.5">
              {GENRES_LIST.map((g) => {
                const isSelected = selectedGenres.includes(g);
                return (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all duration-150 ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'bg-white/[0.02] border-white/5 text-white/50 hover:bg-white/[0.08] hover:text-white'}`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-white/[0.05]">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Tahun Rilis</label>
            <div className="flex flex-col gap-1.5">
              {YEAR_RANGES.map((r) => {
                const isActive = (r.value === null && selectedYearRange === null) ||
                  (selectedYearRange && r.value && selectedYearRange[0] === r.value[0]);
                return (
                  <button
                    key={r.label}
                    onClick={() => setSelectedYearRange(r.value)}
                    className={`text-left px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${isActive ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-md' : 'bg-white/[0.02] border-transparent text-white/50 hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-white/[0.05]">
            <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">Rating Minimum</label>
            <div className="flex flex-wrap gap-1.5">
              {RATING_PRESETS.map((p) => {
                const isActive = minRating === p.min;
                return (
                  <button
                    key={p.label}
                    onClick={() => setMinRating(p.min)}
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all duration-150 ${isActive ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md' : 'bg-white/[0.02] border-transparent text-white/50 hover:bg-white/[0.05] hover:text-white'}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => fetchMoviesPage(1, false)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
};

export default Catalog;