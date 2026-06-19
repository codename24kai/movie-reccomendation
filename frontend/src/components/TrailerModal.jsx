import { useEffect, useRef } from 'react';

const TrailerModal = ({ movie, onClose }) => {
  const overlayRef = useRef(null);

  // Normalisasi URL untuk iframe
  // Prioritas: embed_url (langsung dari TMDB) -> buat dari youtube_key -> fallback
  const embedUrl = movie?.embed_url
    || (movie?.youtube_key ? `https://www.youtube.com/embed/${movie.youtube_key}?autoplay=1&rel=0` : null);

  // Tutup modal kalau klik di luar iframe
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Tutup modal dengan tombol Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Cegah scroll background saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!embedUrl) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center
                 bg-black/85 backdrop-blur-sm
                 animate-fade-in"
    >
      <div className="relative w-full max-w-4xl mx-4">

        {/* Tombol tutup */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/60 hover:text-white
                     transition-colors flex items-center gap-2 text-sm"
        >
          <span>Tutup</span>
          <i className="fas fa-times"></i>
        </button>

        {/* Judul film */}
        <p className="text-white/50 text-xs mb-2 truncate">{movie.title}</p>

        {/* YouTube iframe */}
        <div className="relative w-full rounded-xl overflow-hidden shadow-2xl shadow-black/60 bg-black"
             style={{ paddingBottom: '56.25%' /* 16:9 ratio */ }}>
          <iframe
            src={embedUrl}
            title={`Trailer - ${movie.title}`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

      </div>
    </div>
  );
};

export default TrailerModal;