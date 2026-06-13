import { useState, useEffect, useCallback } from 'react';
import RatingModal from './RatingModal';

const POOL_SIZE = 20;
const AUTO_ROTATE_MS = 8000;

const HeroCarousel = ({ userId }) => {
  const [movies, setMovies] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch sekali, simpan beberapa film untuk rotasi
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/movies');
        const data = await response.json();

        if (data.status === 'ok' && data.movies?.length > 0) {
          // Ambil slice acak dari pool pertama
          const pool = data.movies.slice(0, POOL_SIZE);
          const start = Math.floor(Math.random() * (pool.length - 5));
          setMovies(pool.slice(start, start + 5));
        }
      } catch (err) {
        console.error('Gagal memuat hero:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // Auto-rotate
  const next = useCallback(() => {
    setActiveIdx((i) => (i + 1) % movies.length);
  }, [movies.length]);

  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(next, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [next, movies.length]);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-80 rounded-2xl bg-white/[0.04] animate-pulse" />
    );
  }

  if (movies.length === 0) return null;

  const movie = movies[activeIdx];
  const genres = movie.genres
    ? movie.genres.replace(/\|/g, ' · ')
    : '';

  return (
    <>
      <section className="relative h-80 rounded-2xl overflow-hidden shadow-2xl">

        {/* ── Background: poster blur + dark overlay ── */}
        <div className="absolute inset-0">
          {movie.poster_url ? (
            <img
              src={movie.poster_url}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover scale-105 blur-sm opacity-30 transition-all duration-700"
            />
          ) : (
            // Fallback gradient kalau tidak ada poster
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg,
                  rgba(99,102,241,0.35) 0%,
                  rgba(139,92,246,0.2) 50%,
                  rgba(8,8,16,0.8) 100%)`,
              }}
            />
          )}
          {/* Gradient overlay supaya teks tetap terbaca */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#080810] via-[#080810]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080810]/60 via-transparent to-transparent" />
        </div>

        {/* ── Konten ── */}
        <div className="relative h-full flex items-center px-8 py-8 gap-8">

          {/* Poster thumbnail */}
          {movie.poster_url && (
            <img
              src={movie.poster_url}
              alt={movie.title}
              className="hidden sm:block h-52 w-auto rounded-xl border border-white/10
                         shadow-xl object-cover shrink-0"
            />
          )}

          {/* Info */}
          <div className="max-w-lg space-y-3">
            {/* Badge featured */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                            bg-orange-500/15 border border-orange-500/25
                            text-[11px] font-bold text-orange-400 uppercase tracking-wider">
              <i className="fas fa-fire text-[10px]" />
              Film Pilihan
            </div>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight text-white line-clamp-2">
              {movie.title}
            </h2>

            <div className="flex items-center flex-wrap gap-3 text-xs text-white/50">
              {movie.year && (
                <span className="flex items-center gap-1">
                  <i className="fas fa-calendar-alt text-[10px]" />
                  {movie.year}
                </span>
              )}
              {movie.avg_rating && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <i className="fas fa-star text-[10px]" />
                  {Number(movie.avg_rating).toFixed(1)}
                </span>
              )}
              {genres && (
                <span className="text-white/35 line-clamp-1">{genres}</span>
              )}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                           bg-orange-500 hover:bg-orange-400 text-white text-sm font-bold
                           transition-all active:scale-95 hover:-translate-y-0.5
                           hover:shadow-lg hover:shadow-orange-500/25"
              >
                <i className="fas fa-star text-xs" />
                Beri Rating
              </button>
              <button
                onClick={next}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.08]
                           text-white/60 hover:text-white text-sm font-medium transition-all"
              >
                Film lain
                <i className="fas fa-shuffle text-xs" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Dot indicators ── */}
        {movies.length > 1 && (
          <div className="absolute bottom-4 right-6 flex items-center gap-1.5">
            {movies.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                aria-label={`Film ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIdx
                    ? 'w-5 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      <RatingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        movieId={movie.movieId ?? movie.movie_id}
        movieTitle={movie.title}
        userId={userId}
      />
    </>
  );
};

export default HeroCarousel;