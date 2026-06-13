import { useEffect } from 'react';

const TrailerModal = ({ isOpen, onClose, trailerUrl, movieTitle }) => {
  // Tutup modal saat tekan Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Kunci scroll body saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  // Normalkan URL YouTube: pastikan pakai format embed + autoplay
  const getEmbedUrl = (url) => {
    if (!url) return null;
    try {
      // Sudah dalam format embed
      if (url.includes('youtube.com/embed/')) {
        const base = url.split('?')[0];
        return `${base}?autoplay=1&rel=0`;
      }
      // Format watch?v=
      const match = url.match(/[?&]v=([^&#]+)/);
      if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
      // Format youtu.be/
      const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
      if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=1&rel=0`;
      // Fallback: pakai URL apa adanya
      return `${url}${url.includes('?') ? '&' : '?'}autoplay=1`;
    } catch {
      return null;
    }
  };

  const embedUrl = getEmbedUrl(trailerUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4
                 bg-black/85 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer ${movieTitle}`}
    >
      <div className="bg-[#0e0e18] border border-white/[0.08] rounded-2xl
                      w-full max-w-3xl overflow-hidden shadow-2xl shadow-black/60">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5
                        border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-md bg-red-500/15 flex items-center justify-center shrink-0">
              <i className="fas fa-play text-red-400 text-[10px] ml-0.5" />
            </div>
            <h3 className="text-sm font-bold text-white truncate">
              {movieTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal"
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ml-4
                       text-white/40 hover:text-white bg-white/[0.05] hover:bg-white/[0.10]
                       transition-all"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>

        {/* Video */}
        <div className="relative w-full aspect-video bg-black">
          {embedUrl ? (
            <iframe
              className="absolute inset-0 w-full h-full"
              src={embedUrl}
              title={`Trailer ${movieTitle}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/[0.05] flex items-center justify-center">
                <i className="fas fa-video-slash text-xl text-white/20" />
              </div>
              <p className="text-sm text-white/30">Trailer belum tersedia untuk film ini.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.07] flex items-center justify-between">
          <p className="text-xs text-white/25">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-white/[0.07] border border-white/[0.08] font-mono text-[10px]">Esc</kbd> untuk menutup
          </p>
          {trailerUrl && (
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-white/30 hover:text-white/60 transition-colors
                         flex items-center gap-1"
            >
              Buka di YouTube
              <i className="fas fa-arrow-up-right-from-square text-[10px]" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrailerModal;