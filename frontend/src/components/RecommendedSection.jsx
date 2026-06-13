import { useState, useEffect } from 'react';
import MovieCard from './MovieCard';

const RecommendedSection = ({ userId }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://127.0.0.1:5000/recommend', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            top_n: 6,         // Ambil 6 film terbaik agar pas dengan grid UI
            svd_weight: 0.5,
            rf_weight: 0.5
          }),
        });

        if (!response.ok) {
          throw new Error('Gagal mengambil data dari server. Pastikan Flask berjalan.');
        }

        const data = await response.json();
        
        // Cek status "ok" dari response Backend Flask
        if (data.status === 'ok') {
          setMovies(data.recommendations);
        } else {
          throw new Error(data.message || 'Terjadi kesalahan pada model rekomendasi.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchRecommendations();
    }
  }, [userId]);

  return (
    <section data-purpose="recommended-movies">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-6">
          <h3 className="text-xl font-bold">Recommended for You</h3>
          <div className="flex space-x-2">
            <span className="px-4 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-semibold rounded-full border border-white/5 cursor-pointer hover:bg-zinc-700 transition-colors">Based on Rating</span>
            <span className="px-4 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-semibold rounded-full border border-white/5 cursor-pointer hover:bg-zinc-700 transition-colors">Based on Genre</span>
          </div>
        </div>
        <div className="flex space-x-2">
          <button className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white border border-white/5"><i className="fas fa-chevron-left text-xs"></i></button>
          <button className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white border border-white/5"><i className="fas fa-chevron-right text-xs"></i></button>
        </div>
      </div>

      {loading && <div className="text-zinc-400 animate-pulse">Menghitung model rekomendasi...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {!loading && !error && movies.length > 0 ? (
          movies.map((movie) => (
            <MovieCard key={movie.movieId} movie={movie} />
          ))
        ) : (
          !loading && !error && <p className="text-zinc-400">Tidak ada rekomendasi film saat ini.</p>
        )}
      </div>
    </section>
  );
};

export default RecommendedSection;