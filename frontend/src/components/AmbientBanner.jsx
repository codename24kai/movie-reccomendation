import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';

const AmbientBanner = ({ movie }) => {
  const [bgColor, setBgColor] = useState('rgba(79, 70, 229, 0.2)'); // Default indigo

  useEffect(() => {
    if (!movie?.poster_url) return;

    const fac = new FastAverageColor();

    // Objek Image TERPISAH, hanya untuk analisis warna — tidak ditampilkan ke user.
    // crossOrigin di sini aman karena kalau gagal, hanya warna ambient yang
    // gagal di-extract (fallback ke default), poster tetap tampil normal.
    const colorImg = new Image();
    colorImg.crossOrigin = 'anonymous';
    colorImg.src = movie.poster_url;

    colorImg.onload = () => {
      try {
        const color = fac.getColor(colorImg);
        setBgColor(`rgba(${color.value[0]}, ${color.value[1]}, ${color.value[2]}, 0.3)`);
      } catch (err) {
        console.warn('Gagal ekstrak warna ambient:', err);
      }
    };

    colorImg.onerror = () => {
      // Server poster tidak mendukung CORS — biarkan pakai warna default
      console.warn('Gagal memuat gambar untuk analisis warna (CORS).');
    };

    return () => fac.destroy();
  }, [movie?.poster_url]);

  if (!movie) return null;

  return (
    <div className="relative w-full min-h-[400px] flex items-center p-8 md:p-16 overflow-hidden rounded-3xl border border-white/[0.05] mt-8">

      {/* 1. Latar Belakang Pendar (Ambient Glow) */}
      <div
        className="absolute inset-0 transition-colors duration-1000 ease-in-out blur-[100px] opacity-70"
        style={{ backgroundColor: bgColor }}
      />

      {/* 2. Tekstur Gelap untuk meredam warna agar teks tetap terbaca */}
      <div className="absolute inset-0 bg-[#080810]/60 backdrop-blur-3xl" />

      {/* 3. Konten Utama */}
      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start w-full">

        {/* Poster Film — TANPA crossOrigin, sama seperti MovieCard */}
        <div className="w-48 md:w-64 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative bg-[#0f0f18]">
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>

        {/* Informasi Film */}
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-2 text-white">
            {movie.title}
          </h2>
          <div className="flex items-center justify-center md:justify-start gap-3 mb-6 flex-wrap">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-widest">
              {movie.release_year || movie.year || '2024'}
            </span>
            <span className="text-white/60 text-sm">
              {movie.genres?.replace(/\|/g, ' • ') || 'Action • Sci-Fi'}
            </span>
            <span className="flex items-center gap-1 text-amber-400 text-sm font-bold ml-2">
              <i className="fas fa-star" /> {movie.vote_average || movie.avg_rating || '8.5'}
            </span>
          </div>

          <p className="text-white/60 leading-relaxed max-w-2xl text-sm md:text-base">
            {movie.overview || 'Sistem saat ini sedang memuat deskripsi film. Tampilan ini adalah antarmuka dinamis yang warnanya menyesuaikan dengan poster.'}
          </p>

          <div className="mt-8 flex gap-3 justify-center md:justify-start">
            <button className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-colors flex items-center gap-2">
              <i className="fas fa-play" /> Putar Trailer
            </button>
            <button className="bg-white/[0.07] border border-white/10 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/[0.12] transition-colors flex items-center gap-2">
              <i className="fas fa-plus" /> Wishlist
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbientBanner;