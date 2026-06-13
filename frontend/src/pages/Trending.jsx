import { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';

const Trending = () => {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Memanggil endpoint baru dari Flask
        const res = await fetch('http://127.0.0.1:5000/movies/trending');
        const data = await res.json();
        
        if (data.status === 'ok') {
          setMovies(data.movies);
        }
      } catch (err) {
        console.error("Gagal memuat trending:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in pb-10 mt-4">
      
      {/* Header Trending */}
      <div className="border-b border-white/[0.05] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-400 uppercase tracking-widest">
          <i className="fas fa-chart-line"></i> Sedang Hangat
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">
          Trending Minggu Ini
        </h1>
        <p className="text-white/40 text-sm max-w-xl leading-relaxed">
          Film-film yang paling banyak dibicarakan, disimpan ke wishlist, dan mendapat interaksi tertinggi dari komunitas.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-32">
          <i className="fas fa-spinner fa-spin text-4xl text-orange-500/30"></i>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 pt-4">
          {movies.map((movie, idx) => (
            <div key={movie.movieId || movie.movie_id} className="relative group">
              {/* Badge Nomor Urut Trending */}
              <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 text-white font-black text-sm rounded-full flex items-center justify-center z-20 border-[3px] border-[#080810] shadow-lg group-hover:scale-110 transition-transform">
                {idx + 1}
              </div>
              
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trending;