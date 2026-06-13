import { useEffect } from 'react';

const Notification = ({ 
  isOpen, 
  onClose, 
  message, 
  type = 'success', // Pilihan: 'success', 'error', 'info', 'warning'
  duration = 3000 // Otomatis hilang dalam 3 detik (3000ms)
}) => {
  
  // Timer untuk menutup notifikasi secara otomatis
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer); // Bersihkan timer jika komponen ditutup manual
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  // Konfigurasi warna dan ikon berdasarkan tipe notifikasi
  const config = {
    success: { 
      icon: 'fa-check-circle', 
      textColor: 'text-emerald-400', 
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    error: { 
      icon: 'fa-times-circle', 
      textColor: 'text-red-400', 
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    },
    info: { 
      icon: 'fa-info-circle', 
      textColor: 'text-indigo-400', 
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20'
    },
    warning: { 
      icon: 'fa-exclamation-triangle', 
      textColor: 'text-amber-400', 
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    }
  };

  const activeConfig = config[type] || config.info;

  return (
    // Posisi di pojok kanan bawah dengan z-index sangat tinggi agar menutupi elemen lain
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      <div 
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-[#080810]/95 backdrop-blur-xl shadow-2xl transition-all duration-300 transform scale-100 opacity-100 ${activeConfig.borderColor}`}
      >
        {/* Ikon */}
        <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${activeConfig.bgColor} ${activeConfig.textColor}`}>
          <i className={`fas ${activeConfig.icon} text-lg`}></i>
        </div>

        {/* Pesan Teks */}
        <p className="text-sm font-medium text-white pr-4">
          {message}
        </p>

        {/* Tombol Tutup Manual */}
        <button 
          onClick={onClose}
          className="ml-auto text-white/30 hover:text-white transition-colors shrink-0"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default Notification;