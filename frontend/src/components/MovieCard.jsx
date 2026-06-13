import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import RatingModal from './RatingModal';
import TrailerModal from './TrailerModal';

const MovieCard = ({ movie }) => {
  const { user } = useContext(AuthContext);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);

  const movieId = movie.movieId ?? movie.movie_id;

  const handleWishlist = async () => {
    if (!user) {
      // Tidak pakai alert() — biarkan UI yang memberi sinyal
      // Idealnya trigger toast atau redirect ke /login dari sini
      return;
    }
    if (wishlistLoading) return;

    setWishlistLoading(true);
    // Optimistic update: toggle dulu, rollback kalau gagal
    const prev = isWishlisted;
    setIsWishlisted(!prev);

    try {
      const response = await fetch('http://127.0.0.1:5000/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id ?? user.id, movie_id: movieId }),
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setIsWishlisted(data.is_added);
      } else {
        setIsWishlisted(prev); // rollback
      }
    } catch {
      setIsWishlisted(prev); // rollback
    } finally {
      setWishlistLoading(false);
    }
  };

  const genres = movie.genres
    ? movie.genres.replace(/\|/g, ' · ')
    : null;

  const posterFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(movie.title)}&background=1a1a2e&color=6366f1&size=400`;

  return (
    <>
      <div className="group relative flex flex-col h-full rounded-xl overflow-hidden
                      bg-white/[0.03] border border-white/[0.07]
                      transition-all duration-300
                      hover:-translate-y-1 hover:border-indigo-500/25
                      hover:shadow-xl hover:shadow-black/40">

        {/* ── Wishlist button ── */}
        <button
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}
          className={`absolute top-2.5 right-2.5 z-20 w-8 h-8 rounded-full
                      flex items-center justify-center
                      backdrop-blur-md border transition-all duration-200
                      ${isWishlisted
                        ? 'bg-red-500/20 border-red-500/30 text-red-400'
                        : 'bg-black/50 border-white/10 text-white/50 hover:text-white hover:bg-black/70'
                      }
                      ${wishlistLoading ? 'opacity-50 cursor-wait' : 'active:scale-90'}`}
        >
          <i className={`fas fa-heart text-xs ${wishlistLoading ? 'fa-beat' : ''}`} />
        </button>

        {/* ── Poster ── */}
        <div className="aspect-[2/3] relative overflow-hidden bg-[#0f0f18]">
          <img
            src={movie.poster_url || posterFallback}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-3
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300">

            {/* Play trailer */}
            <button
              onClick={() => setIsTrailerModalOpen(true)}
              aria-label="Tonton trailer"
              className="w-12 h-12 rounded-full flex items-center justify-center
                         bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20
                         text-white transition-all duration-300
                         translate-y-3 group-hover:translate-y-0"
            >
              <i className="fas fa-play text-sm ml-0.5" />
            </button>

            {/* Beri rating */}
            <button
              onClick={() => setIsRatingModalOpen(true)}
              className="px-4 py-1.5 rounded-lg text-xs font-bold
                         bg-orange-500 hover:bg-orange-400 text-white
                         transition-all duration-300 delay-75
                         translate-y-3 group-hover:translate-y-0"
            >
              Beri Rating
            </button>
          </div>
        </div>

        {/* ── Info ── */}
        <div className="p-3 flex-1 flex flex-col justify-between gap-1">
          <h3 className="text-sm font-bold leading-snug line-clamp-2 text-white">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between gap-2 mt-1">
            {genres && (
              <p className="text-[11px] text-white/30 line-clamp-1 flex-1">{genres}</p>
            )}
            {movie.avg_rating && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold shrink-0">
                <i className="fas fa-star text-[9px]" />
                {Number(movie.avg_rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      <RatingModal
        isOpen={isRatingModalOpen}
        onClose={() => setIsRatingModalOpen(false)}
        movieId={movieId}
        movieTitle={movie.title}
        userId={user?.user_id ?? user?.id}
      />

      <TrailerModal
        isOpen={isTrailerModalOpen}
        onClose={() => setIsTrailerModalOpen(false)}
        trailerUrl={movie.trailer_url}
        movieTitle={movie.title}
      />
    </>
  );
};

export default MovieCard;