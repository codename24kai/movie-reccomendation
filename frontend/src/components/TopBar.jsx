import { useState, useEffect, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { API_BASE_URL } from '../config/api';
import InboxDropdown from './InboxDropdown';
import NotificationsDropdown from './NotificationsDropdown';

const PAGE_LABELS = {
  '/home': { label: 'Beranda', icon: 'fa-house' },
  '/catalog': { label: 'Katalog Film', icon: 'fa-compass' },
  '/community': { label: 'Komunitas', icon: 'fa-users' },
  '/watchlist': { label: 'Watchlist', icon: 'fa-bookmark' },
  '/profile': { label: 'Profil Saya', icon: 'fa-user' },
};

const getInitials = (name) => {
  if (!name) return 'U';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0].substring(0, 2).toUpperCase();
};

const TopBar = () => {
  const location = useLocation();
  const { user } = useContext(AuthContext);
  // Konsumsi notification count dari ChatContext (realtime via SocketIO)
  const { unreadNotifCount, setUnreadNotifCount } = useContext(ChatContext);
  const [now, setNow] = useState(new Date());

  const activeUser = useMemo(() => {
    if (user) return user;
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [user]);

  const userId = activeUser?.user_id ?? activeUser?.id;

  const { displayName, profilePicture, initials } = useMemo(() => {
    const name = activeUser?.name ?? activeUser?.username ?? 'Pengguna';
    const pic = activeUser?.profile_picture || null;
    return {
      displayName: name,
      profilePicture: pic,
      initials: getInitials(name)
    };
  }, [activeUser]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch awal unread count via REST saat mount, lalu update realtime via SocketIO di ChatContext
  useEffect(() => {
    if (!userId) return;
    const fetchInitialCount = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/notifications/unread-count/${userId}`);
        const data = await res.json();
        if (data.status === 'ok') {
          setUnreadNotifCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error('Gagal memuat unread notifications:', err);
      }
    };
    fetchInitialCount();
  }, [userId]);

  const pageInfo = PAGE_LABELS[location.pathname] ?? { label: 'MovieHub', icon: 'fa-film' };

  const formattedDate = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const formattedTime = now.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="h-20 border-b border-white/[0.05] flex items-center justify-between px-8 bg-[#0f0f0f]/90 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <i className={`fas ${pageInfo.icon} text-xs`} />
        </div>
        <span className="text-sm font-bold text-white tracking-wide">{pageInfo.label}</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 text-white/40 text-xs font-medium bg-white/[0.02] border border-white/[0.05] py-1.5 px-3 rounded-full">
          <i className="far fa-clock text-[10px]" />
          <span>{formattedDate}</span>
          <span className="text-white/10">•</span>
          <span className="text-white/80 font-bold">{formattedTime}</span>
        </div>

        <div className="flex items-center gap-4">
          <InboxDropdown />
          <NotificationsDropdown
            unreadCount={unreadNotifCount}
            onNotificationsRead={() => setUnreadNotifCount(0)}
          />
        </div>

        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 cursor-pointer hover:border-indigo-400 transition-colors bg-indigo-600 flex items-center justify-center">
          {profilePicture ? (
            <img src={profilePicture} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[15px] font-black text-white tracking-wide">{initials}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;