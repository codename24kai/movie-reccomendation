// React import not required with modern JSX transforms

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Konfirmasi", 
  message = "Apakah Anda yakin ingin melanjutkan?", 
  confirmText = "Ya, Lanjutkan", 
  cancelText = "Batal",
  type = "danger" // Bisa 'danger' (merah) atau 'primary' (indigo)
}) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      
      {/* Kontainer Modal */}
      <div 
        className="bg-[#080810] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam modal menutup modal
      >
        {/* Garis Aksen di Atas */}
        <div className={`h-1.5 w-full ${isDanger ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
        
        <div className="p-6 md:p-8">
          {/* Header dengan Ikon */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border border-white/5 
              ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-400'}`}
            >
              <i className={`fas ${isDanger ? 'fa-exclamation-triangle' : 'fa-question-circle'} text-xl`}></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight mb-1">{title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-white/[0.05]">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose(); // Otomatis tutup modal setelah konfirmasi
              }}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 
                ${isDanger 
                  ? 'bg-red-600 hover:bg-red-500 shadow-red-500/20' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                }`}
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