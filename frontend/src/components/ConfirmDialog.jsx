import { useEffect } from 'react';

// ════════════════════════════════════════════════════════════════
//  ConfirmDialog — Komponen modal konfirmasi yang reusable.
//  Bisa digunakan untuk Logout, Hapus Post, Batal Edit, dll.
// ════════════════════════════════════════════════════════════════

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  onConfirm,
  onCancel,
  variant = 'danger', // 'danger' | 'warning' | 'primary'
}) => {
  // Tutup modal jika menekan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  // Kunci scroll background saat modal terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Konfigurasi style berdasarkan variant
  const styles = {
    danger: {
      iconBg: 'bg-red-500/10 text-red-400',
      icon: 'fa-triangle-exclamation',
      btnConfirm: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
    },
    warning: {
      iconBg: 'bg-amber-500/10 text-amber-400',
      icon: 'fa-circle-exclamation',
      btnConfirm: 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20',
    },
    primary: {
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      icon: 'fa-circle-question',
      btnConfirm: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
    },
  };

  const currentStyle = styles[variant] || styles.danger;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onCancel} // Tutup jika klik area background
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#13131f] shadow-2xl p-6 sm:p-8 transform transition-all"
        onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam modal menutup dialog
      >
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className={`flex h-16 w-16 items-center justify-center rounded-full mb-5 ${currentStyle.iconBg}`}>
            <i className={`fas ${currentStyle.icon} text-2xl`} />
          </div>

          {/* Text Content */}
          <h3 className="text-xl font-black text-white mb-2">{title}</h3>
          <p className="text-sm text-white/50 leading-relaxed mb-8">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onCancel(); // Tutup otomatis setelah konfirmasi
              }}
              className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${currentStyle.btnConfirm}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;