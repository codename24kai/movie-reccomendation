import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

const NotificationsDropdown = ({ unreadCount, onNotificationsRead }) => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const activeUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const userId = activeUser?.user_id || activeUser?.id;

  const fetchNotifications = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/${userId}`);
      const data = await res.json();
      if (data.status === 'ok') {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-read/${userId}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'ok' && onNotificationsRead) {
        onNotificationsRead(); // Ambil count terbaru untuk TopBar
      }
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      if (unreadCount > 0) {
        markAsRead();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memisahkan nama ikon dan styling warna agar terisolasi dengan baik
  const getIconData = (type) => {
    switch (type) {
      case 'follow':
        return { name: 'fa-user-plus', wrapper: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'like':
        return { name: 'fa-heart', wrapper: 'text-pink-400 bg-pink-500/10 border-pink-500/20' };
      case 'comment':
        return { name: 'fa-comment', wrapper: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
      default:
        return { name: 'fa-bell', wrapper: 'text-white/40 bg-white/5 border-white/10' };
    }
  };

  const formatNotificationTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleString('id-ID', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-white/60 hover:text-white transition-colors relative flex items-center justify-center w-10 h-10"
      >
        <i className="far fa-bell text-xl"></i>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 bg-red-500 rounded-full border-2 border-[#0f0f0f] text-[8px] font-bold text-white px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right animate-fade-in">
          <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex justify-between items-center">
            <h3 className="font-bold text-white">Notifikasi</h3>
            <button onClick={fetchNotifications} className="text-white/40 hover:text-white text-xs">
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <i className="fas fa-circle-notch fa-spin text-indigo-500"></i>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <i className="far fa-bell-slash text-white/20 text-xl"></i>
                </div>
                <p className="text-white/50 text-sm">Belum ada notifikasi</p>
                <p className="text-white/30 text-xs mt-1">Anda akan melihat pembaruan di sini.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const iconData = getIconData(notif.type);
                return (
                  <div
                    key={notif._id || notif.created_at}
                    className={`px-4 py-3 border-b border-white/5 flex gap-3 transition-colors ${!notif.is_read ? 'bg-indigo-500/5' : 'hover:bg-white/5'}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${iconData.wrapper}`}>
                      <i className={`fas ${iconData.name}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.is_read ? 'text-white' : 'text-white/70'}`}>
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-white/40 block mt-1">
                        {formatNotificationTime(notif.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;