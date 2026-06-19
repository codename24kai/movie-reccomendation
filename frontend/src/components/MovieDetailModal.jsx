import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import TrailerModal from './TrailerModal';
import Notification from './Notification';
import { API_BASE_URL } from '../config/api';

import { CollectionContext } from '../context/CollectionContext';

const MovieDetailModal = ({ movie, onClose }) => {
  const { user } = useContext(AuthContext);
  // PERBAIKAN 1: Ambil juga watchlist dan watchedList dari Context Global
  const {
    watchlist,
    watchedList,
    toggleWatchlistGlobal,
    toggleWatchedGlobal,
    notifyCollectionChanged
  } = useContext(CollectionContext);

  // Normalisasi ID
  const rawId = movie.movie_id ?? movie.movieId ?? movie.tmdb_id ?? '';
  const movieId = String(rawId).replace('tmdb-', '');
  const finalMovieId = movieId || movie.id;
  const userId = user?.user_id ?? user?.id ?? JSON.parse(localStorage.getItem('user'))?.user_id;

  // PERBAIKAN 2: Jadikan data global sebagai patokan utama status awal tombol!
  const isGloballyWatched = watchedList.includes(finalMovieId);
  const isGloballyInWatchlist = watchlist.includes(finalMovieId);

  const [isWatched, setIsWatched] = useState(isGloballyWatched);
  const [isInWatchlist, setIsInWatchlist] = useState(isGloballyInWatchlist);

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWatchedLoading, setIsWatchedLoading] = useState(false);
  const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // State untuk Trailer
  const [trailerCache, setTrailerCache] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(false);

  const [toast, setToast] = useState({ isOpen: false, message: '', type: 'success' });

  const posterFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(movie?.title || 'MovieHub')}&background=0f172a&color=fff&size=800`;
  const rawPoster = movie?.poster_url ?? movie?.posterUrl;

  let posterUrl = posterFallback;
  if (rawPoster && String(rawPoster).trim() !== '') {
    posterUrl = String(rawPoster).startsWith('http')
      ? rawPoster
      : `https://image.tmdb.org/t/p/w780${rawPoster}`;
  }

  const showToast = (message, type = 'success') => {
    setToast({ isOpen: true, message, type });
  };

  useEffect(() => {
    if (!userId || !finalMovieId) {
      setIsLoadingStatus(false);
      return;
    }

    const checkUserInteraction = async () => {
      setIsLoadingStatus(true);
      try {
        const res = await fetch(`${API_BASE_URL}/movie/${finalMovieId}/status/${userId}`);
        const data = await res.json();

        if (data.status === 'ok') {
          // PERBAIKAN 3: Jangan timpa status global dengan false jika API backend lambat update
          setIsWatched(prev => isGloballyWatched || data.is_watched);
          setIsInWatchlist(prev => isGloballyInWatchlist || data.is_in_watchlist);
          setRating(data.rating || 0);
          setReview(data.review || '');
        }
      } catch (err) {
        console.error("Gagal memuat status interaksi:", err);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    checkUserInteraction();
  }, [finalMovieId, userId, isGloballyWatched, isGloballyInWatchlist]);

  const handleWatchTrailer = async () => {
    if (trailerCache) {
      setIsTrailerOpen(true);
      return;
    }
    setTrailerLoading(true);
    setTrailerError(false);
    try {
      const url = `${API_BASE_URL}/movies/${finalMovieId}/trailer`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'ok') {
        setTrailerCache(data);
        setIsTrailerOpen(true);
      } else {
        setTrailerError(true);
      }
    } catch {
      setTrailerError(true);
    } finally {
      setTrailerLoading(false);
    }
  };

  const handleToggleWatched = async () => {
    if (!userId || isWatchedLoading) return;
    setIsWatchedLoading(true);
    const prev = isWatched;

    setIsWatched(!prev);

    try {
      const res = await fetch(`${API_BASE_URL}/watched`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, movie_id: finalMovieId })
      });
      const data = await res.json();

      if (data.status !== 'ok') {
        setIsWatched(prev);
        showToast('Gagal memperbarui status tontonan', 'error');
      } else {
        showToast(prev ? 'Dihapus dari daftar ditonton' : 'Ditandai sebagai sudah ditonton', 'success');
        toggleWatchedGlobal(finalMovieId, !prev);
        notifyCollectionChanged();
        setTimeout(() => onClose(), 800);
      }
    } catch {
      setIsWatched(prev);
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setIsWatchedLoading(false);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!userId || isWatchlistLoading || !finalMovieId) return;
    setIsWatchlistLoading(true);
    const prev = isInWatchlist;

    setIsInWatchlist(!prev);

    try {
      const res = await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, movie_id: finalMovieId })
      });
      const data = await res.json();

      if (data.status !== 'ok') {
        setIsInWatchlist(prev);
        showToast('Gagal memperbarui watchlist', 'error');
      } else {
        showToast(prev ? 'Dihapus dari watchlist' : 'Ditambahkan ke watchlist', 'success');
        toggleWatchlistGlobal(finalMovieId, !prev);
        notifyCollectionChanged();
        setTimeout(() => onClose(), 800);
      }
    } catch (err) {
      setIsInWatchlist(prev);
      showToast('Gagal memperbarui watchlist', 'error');
    } finally {
      setIsWatchlistLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!userId || rating === 0) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, movie_id: finalMovieId, rating, review }),
      });
      if (response.ok) {
        showToast("Ulasan berhasil disimpan!", "success");

        // PERBAIKAN 4: Jadikan film otomatis "Ditonton" saat di-rate dan tutup modalnya
        setIsWatched(true);
        toggleWatchedGlobal(finalMovieId, true);
        notifyCollectionChanged();

        setTimeout(() => onClose(), 800);
      } else {
        showToast("Gagal menyimpan ulasan", "error");
      }
    } catch (err) {
      console.error("Gagal mengirim rating:", err);
      showToast("Terjadi kesalahan koneksi", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#151515] border border-white/10 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">

          <button
            onClick={onClose}
            aria-label="Tutup"
            className="absolute top-4 right-4 z-50 w-11 h-11 bg-black hover:bg-gray-500 text-white hover:text-gray-300 rounded-full flex items-center justify-center shadow-lg shadow-black/40 ring-2 ring-black/10 transition-colors"
          >
            <i className="fas fa-times text-base" />
          </button>

          <div className="md:w-[40%] relative min-h-[300px] md:min-h-[500px] shrink-0">
            <img
              src={posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#151515]" />

            <div className="absolute bottom-5 left-0 right-0 z-20 flex justify-center px-4">
              <button
                onClick={handleWatchTrailer}
                disabled={trailerLoading}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold backdrop-blur-md transition-all duration-200 shadow-lg shadow-black/40 ${trailerError
                  ? 'bg-red-500/20 border border-red-500/30 text-red-300 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200 hover:scale-105'
                  }`}
              >
                {trailerLoading ? (
                  <><i className="fas fa-circle-notch fa-spin" /> Memuat...</>
                ) : trailerError ? (
                  <><i className="fas fa-exclamation-circle" /> Trailer Tidak Tersedia</>
                ) : (
                  <><i className="fas fa-play" /> Tonton Trailer</>
                )}
              </button>
            </div>
          </div>

          <div className="p-6 md:p-8 md:w-[60%] flex flex-col max-h-[85vh] overflow-y-auto custom-scrollbar z-10">

            <h2 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight pr-10">
              {movie.title}
            </h2>

            <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
              {movie.release_year && (
                <span className="bg-white/10 text-white px-3 py-1 rounded-md font-medium">
                  {movie.release_year}
                </span>
              )}

              {movie.runtime && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 text-white px-3 py-1 rounded-md font-medium">
                  <i className="fas fa-clock text-white/40 text-xs" />
                  {Math.floor(movie.runtime / 60)}j {movie.runtime % 60}m
                </span>
              )}

              {movie.vote_average > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-3 py-1 rounded-md font-bold">
                  <i className="fas fa-star text-xs" />
                  {Number(movie.vote_average).toFixed(1)}
                  <span className="text-white/30 font-normal text-xs">TMDB</span>
                </span>
              )}

              {movie.imdb_url && (
                <a
                  href={movie.imdb_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 px-3 py-1 rounded-md font-bold text-xs hover:bg-yellow-400/20 transition-colors"
                >
                  <i className="fab fa-imdb text-base" />
                  IMDb
                </a>
              )}
            </div>

            {movie.genres && (
              <p className="text-indigo-400 font-medium text-sm mb-1">
                {movie.genres.replace(/\|/g, ' · ')}
              </p>
            )}

            {movie.tagline && (
              <p className="text-white/40 italic text-xs mb-4">"{movie.tagline}"</p>
            )}

            <p className="text-white/70 mb-6 leading-relaxed text-sm">
              {movie.overview || 'Detail sinopsis belum tersedia.'}
            </p>

            {isLoadingStatus ? (
              <div className="flex items-center gap-3 text-indigo-400 mb-8">
                <i className="fas fa-circle-notch fa-spin" /> Memuat status interaksi...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  <button
                    onClick={handleToggleWatched}
                    disabled={isWatchedLoading}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors border ${isWatched
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                  >
                    {isWatchedLoading ? (
                      <i className="fas fa-spinner fa-spin" />
                    ) : (
                      <i className={isWatched ? 'fas fa-check-circle' : 'far fa-eye'} />
                    )}
                    {isWatched ? 'Ditonton' : 'Tandai Watched'}
                  </button>

                  <button
                    onClick={handleToggleWatchlist}
                    disabled={isWatchlistLoading}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors border ${isInWatchlist
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                  >
                    {isWatchlistLoading ? (
                      <i className="fas fa-spinner fa-spin" />
                    ) : (
                      <i className={isInWatchlist ? 'fas fa-bookmark' : 'far fa-bookmark'} />
                    )}
                    {isInWatchlist ? 'Di Watchlist' : 'Watchlist'}
                  </button>
                </div>


                <div className="border-t border-white/10 pt-6">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-star text-yellow-500" /> Beri Rating & Ulasan
                  </h4>

                  {!isWatched ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm flex items-start gap-3">
                      <i className="fas fa-lock mt-0.5" />
                      Anda harus menandai "Sudah Ditonton" terlebih dahulu.
                    </div>
                  ) : (
                    <div className="space-y-4 animate-fade-in bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-yellow-400' : 'text-white/20'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        placeholder="Bagaimana pendapat Anda tentang film ini?"
                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 min-h-[100px] resize-none"
                        value={review}
                        onChange={(e) => setReview(e.target.value)}
                      />
                      <button
                        onClick={handleSubmitReview}
                        disabled={isSubmitting || rating === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? <i className="fas fa-spinner fa-spin" /> : <i className="fas fa-paper-plane" />}
                        Kirim Ulasan
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isTrailerOpen && trailerCache && (
        <TrailerModal
          movie={trailerCache}
          onClose={() => setIsTrailerOpen(false)}
        />
      )}

      <Notification
        isOpen={toast.isOpen}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default MovieDetailModal;