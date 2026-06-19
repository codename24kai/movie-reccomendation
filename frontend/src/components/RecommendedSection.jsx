import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';
import MovieCard from './MovieCard';

const RecommendedSection = () => {
  const { user } = useContext(AuthContext);
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const activeUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const userId = activeUser?.user_id || activeUser?.id;

  useEffect(() => {
    if (!userId) return;

    const fetchRecommendations = async () => {
      setIsLoading(true);
      try {
        // PERBAIKAN: Gunakan POST body sesuai kebutuhan endpoint /recommend di Flask
        const res = await fetch(`${API_BASE_URL}/recommend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: Number(userId),
            top_n: 12,
            svd_weight: 0.5,
            rf_weight: 0.5
          })
        });
        const data = await res.json();
        if (data.status === 'ok') {
          setMovies(data.recommendations || []);
        }
      } catch (err) {
        console.error('Gagal mengambil data rekomendasi:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId]);

  if (!userId) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-magic text-indigo-500 text-lg"></i> Rekomendasi Untuk Anda
          </h2>
          <p className="text-xs text-white/50 mt-1">Dihitung menggunakan algoritma cerdas berdasarkan preferensi Anda.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <i className="fas fa-circle-notch fa-spin text-indigo-500 text-2xl"></i>
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-12 text-white/30 text-sm bg-white/[0.02] border border-white/5 rounded-2xl">
          Belum ada rekomendasi. Berikan rating film terlebih dahulu agar sistem mempelajari kesukaan Anda!
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {movies.map((movie, index) => (
            <MovieCard
              // PERBAIKAN MUTLAK: Kombinasikan movie_id dengan index untuk membuang bug duplikasi React Virtual DOM
              key={`${movie.movie_id || movie.movieId || movie.tmdb_id}-${index}`}
              movie={movie}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default RecommendedSection;