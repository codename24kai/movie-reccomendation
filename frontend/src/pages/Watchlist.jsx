import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { CollectionContext } from '../context/CollectionContext';
import MovieCard from '../components/MovieCard';
import MovieDetailModal from '../components/MovieDetailModal';
import { API_BASE_URL } from '../config/api';

// Fungsi normalisasi data film
const normalizeMovies = (movies = []) => {
  return movies.map(m => ({
    movieId: m.movie_id ?? m.movieId,
    title: m.title ?? 'Judul tidak tersedia',
    genres: m.genres ?? '',
    poster_url: m.poster_url ?? null,
    trailer_url: m.trailer_url ?? null,
    vote_average: m.vote_average ?? m.avg_rating ?? null,
    release_year: m.release_year ?? null,
  })).filter(m => m.poster_url && m.poster_url.trim() !== '');
};

const Watchlist = () => {
  const { user } = useContext(AuthContext);
  const { triggerRefresh } = useContext(CollectionContext);
  const [selectedMovie, setSelectedMovie] = useState(null);

  const [activeTab, setActiveTab] = useState('watchlist'); // 'watchlist' | 'watched'
  const [watchlist, setWatchlist] = useState([]);
  const [watchedList, setWatchedList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fallback membaca localStorage jika user dari context lambat termuat
  const activeUser = user || JSON.parse(localStorage.getItem('user'));
  const userId = activeUser?.user_id || activeUser?.id;

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch kedua list secara paralel
        const [resWatchlist, resWatched] = await Promise.all([
          fetch(`${API_BASE_URL}/watchlist/${userId}`),
          fetch(`${API_BASE_URL}/watched/${userId}`)
        ]);

        const dataWatchlist = await resWatchlist.json();
        const dataWatched = await resWatched.json();

        if (dataWatchlist.status === 'ok') {
          setWatchlist(normalizeMovies(dataWatchlist.watchlist));
        }

        if (dataWatched.status === 'ok') {
          // Asumsi backend mengembalikan field 'watched_list'
          const watchedData = dataWatched.watched_list || dataWatched.movies || [];
          setWatchedList(normalizeMovies(watchedData));
        }
      } catch (err) {
        console.error("Gagal mengambil data Watchlist/Watched List:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [userId, triggerRefresh]); // triggerRefresh memastikan data dipanggil ulang saat modal ditutup

  if (!activeUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/50">
        <i className="fas fa-lock text-4xl mb-4 text-indigo-500/50" />
        <p>Silakan login untuk melihat Koleksi Film Anda.</p>
      </div>
    );
  }

  // Tentukan list mana yang aktif
  const currentList = activeTab === 'watchlist' ? watchlist : watchedList;

  return (
    <div className="pb-16 animate-fade-in mt-4">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.05] pb-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white flex items-center gap-3">
            <i className="fas fa-bookmark text-indigo-500"></i> Koleksi Saya
          </h1>
          <p className="text-white/50 mt-2 text-sm max-w-xl">
            Kelola daftar film yang ingin Anda tonton dan tinjau kembali film yang sudah Anda selesaikan.
          </p>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-4 mb-8 border-b border-white/10">
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors relative ${activeTab === 'watchlist'
            ? 'text-indigo-400'
            : 'text-white/40 hover:text-white/80'
            }`}
        >
          <i className="fas fa-bookmark text-sm"></i> Ingin Ditonton ({watchlist.length})
          {activeTab === 'watchlist' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('watched')}
          className={`pb-4 text-sm font-bold flex items-center gap-2 transition-colors relative ${activeTab === 'watched'
            ? 'text-emerald-400'
            : 'text-white/40 hover:text-white/80'
            }`}
        >
          <i className="fas fa-eye text-sm"></i> Sudah Ditonton ({watchedList.length})
          {activeTab === 'watched' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></span>
          )}
        </button>
      </div>

      {/* ── Content Area ── */}
      {isLoading ? (
        <div className="flex justify-center items-center py-24 text-indigo-400">
          <i className="fas fa-circle-notch fa-spin text-4xl"></i>
        </div>
      ) : currentList.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
          {currentList.map((movie) => (
            <MovieCard key={movie.movieId} movie={movie} onClickDetail={setSelectedMovie} />
          ))}
        </div>
      ) : (
        /* Empty States yang dinamis berdasarkan Tab */
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl p-16 text-center mt-4">
          {activeTab === 'watchlist' ? (
            <>
              <i className="far fa-folder-open text-6xl text-white/10 mb-6 block"></i>
              <h3 className="text-xl font-bold text-white mb-2">Watchlist Anda Kosong</h3>
              <p className="text-white/40 text-sm max-w-sm mx-auto">
                Anda belum menambahkan film ke daftar ini. Mulai cari film yang menarik di Katalog!
              </p>
            </>
          ) : (
            <>
              <i className="far fa-eye-slash text-6xl text-white/10 mb-6 block"></i>
              <h3 className="text-xl font-bold text-white mb-2">Belum Ada Film yang Ditonton</h3>
              <p className="text-white/40 text-sm max-w-sm mx-auto">
                Tandai film sebagai "Sudah Ditonton" melalui halaman detail film untuk memunculkannya di sini.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Movie Detail Modal ── */}
      {selectedMovie && (
        <MovieDetailModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  );
};

export default Watchlist;