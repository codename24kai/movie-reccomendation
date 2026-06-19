import { useEffect } from 'react';

const Notification = ({
  isOpen,
  onClose,
  message,
  type = 'success',
  duration = 3000
}) => {

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const config = {
    success: { icon: 'fa-check-circle', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    error: { icon: 'fa-times-circle', textColor: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
    info: { icon: 'fa-info-circle', textColor: 'text-indigo-400', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/20' },
    warning: { icon: 'fa-exclamation-triangle', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' }
  };

  const activeConfig = config[type] || config.info;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right-5 fade-in duration-300">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border bg-[#080810]/95 backdrop-blur-xl shadow-2xl ${activeConfig.borderColor}`}
      >
        <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${activeConfig.bgColor} ${activeConfig.textColor}`}>
          <i className={`fas ${activeConfig.icon} text-lg`}></i>
        </div>

        <p className="text-sm font-medium text-white pr-4">
          {message}
        </p>

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