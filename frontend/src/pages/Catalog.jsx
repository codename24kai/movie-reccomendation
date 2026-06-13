import { useState, useEffect } from 'react';
import MovieCard from '../components/MovieCard';
import CategoryFilter from '../components/CategoryFilter'; // Komponen yang kita buat sebelumnya

const Catalog = () => {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Memanggil API preview untuk sementara sampai API filter lengkap siap
    const fetchMovies = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/movies/preview');
        const data = await res.json();
        if (data.status === 'ok') {
          // Menggandakan data sementara agar terlihat banyak di grid
          setMovies([...data.movies, ...data.movies]); 
        }
      } catch (err) {
        console.error('Gagal memuat katalog:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovies();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Katalog */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.05] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
            <i className="fas fa-compass"></i> Eksplorasi
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Katalog Film</h1>
          <p className="text-white/40 text-sm max-w-xl leading-relaxed">
            Temukan tontonan favoritmu berdasarkan genre, popularitas, atau rekomendasi spesifik yang disesuaikan untukmu.
          </p>
        </div>
        
        {/* Tombol Pencarian Ekstra (Opsional) */}
        <div className="relative w-full md:w-64">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/30"></i>
          <input 
            type="text" 
            placeholder="Cari judul..." 
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl py-2.5 pl-11 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all"
          />
        </div>
      </div>

      {/* Filter Kategori (Pills) */}
      <CategoryFilter />

      {/* Grid Film */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <i className="fas fa-circle-notch fa-spin text-3xl mb-4 text-indigo-500/50"></i>
          <p className="text-sm font-medium">Menganalisis dan memuat koleksi...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {movies.map((movie, idx) => (
            // Menggunakan idx sebagai key sementara karena kita menggandakan data di atas
            <MovieCard key={`${movie.movieId || movie.movie_id}-${idx}`} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Catalog;