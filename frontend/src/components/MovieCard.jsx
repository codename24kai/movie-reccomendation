import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

const MovieCard = ({ movie, onClickDetail }) => {
  const { user } = useContext(AuthContext);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const movieId = movie.movieId ?? movie.movie_id;

  const handleWatchlist = async (e) => {
    e.stopPropagation(); // Mencegah klik tombol ikut membuka modal detail
    if (!user) return;
    if (watchlistLoading) return;

    setWatchlistLoading(true);
    const prev = isWatchlisted;
    setIsWatchlisted(!prev);

    try {
      const response = await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id ?? user.id, movie_id: movieId }),
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setIsWatchlisted(data.is_added);
      } else {
        setIsWatchlisted(prev); // rollback
      }
    } catch {
      setIsWatchlisted(prev); // rollback
    } finally {
      setWatchlistLoading(false);
    }
  };

  const genres = movie.genres
    ? movie.genres.replace(/\|/g, ' · ')
    : null;

  // Format URL Poster (Gabungkan dengan Base URL TMDB jika nilainya relative path)
  const rawPoster = movie.poster_url ?? movie.posterUrl;
  let posterUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(movie.title)}&background=1a1a2e&color=6366f1&size=400`;

  if (rawPoster && String(rawPoster).trim() !== '') {
    posterUrl = String(rawPoster).startsWith('http')
      ? rawPoster
      : `https://image.tmdb.org/t/p/w500${rawPoster}`;
  }

  // Handler seragam untuk membuka modal
  const handleOpenDetail = (e) => {
    e.stopPropagation();
    if (onClickDetail) {
      onClickDetail(movie); // Kirim data movie ke parent (Home/Catalog) untuk dimasukkan ke modal
    }
  };

  return (
    <div>
      <div
        onClick={handleOpenDetail}
        className="group relative flex flex-col h-full rounded-xl overflow-hidden
                   bg-white/[0.03] border border-white/[0.07] cursor-pointer
                   transition-all duration-300
                   hover:-translate-y-1 hover:border-indigo-500/25
                   hover:shadow-xl hover:shadow-black/40"
      >

        {/* ── Poster ── */}
        <div className="aspect-[2/3] relative overflow-hidden bg-[#0f0f18]">
          <img
            src={posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />

          {/* Hover overlay dengan gradient di bagian bawah agar poster tetap terlihat */}
          <div className="absolute bottom-0 left-0 right-0 h-24
                          bg-gradient-to-t from-black/90 to-transparent
                          opacity-0 group-hover:opacity-100 transition-opacity duration-300">

            {/* Tombol Lihat Detail di bottom-center */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={handleOpenDetail}
                className="px-4 py-2 rounded-lg text-xs font-bold
                           bg-indigo-600 hover:bg-indigo-500 text-white
                           transition-all duration-300 shadow-lg shadow-indigo-500/30
                           translate-y-2 group-hover:translate-y-0"
              >
                <i className="fas fa-info-circle mr-1" /> Lihat Detail
              </button>
            </div>
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

            {movie.release_year && (
              <span className="text-[11px] text-white/25">{movie.release_year}</span>
            )}

            {(movie.vote_average || movie.avg_rating) && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                <i className="fas fa-star text-[9px]" />
                {Number(movie.vote_average ?? movie.avg_rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;