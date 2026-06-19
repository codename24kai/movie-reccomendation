import { createContext, useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { API_BASE_URL } from '../config/api';
import ChatDrawer from '../components/ChatDrawer';

const SOCKET_URL = API_BASE_URL.replace('/api', '');

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [targetUser, setTargetUser] = useState(null);

  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const socketRef = useRef(null);

  const activeUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const userId = activeUser?.user_id || activeUser?.id;

  // Persistent SocketIO connection untuk notifikasi
  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_notifications', { user_id: userId });
    });

    socket.on('new_notification', () => {
      setUnreadNotifCount(prev => prev + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  // Fetch count awal
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_BASE_URL}/notifications/unread-count/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setUnreadNotifCount(data.unread_count || 0);
        }
      })
      .catch(err => console.error("Failed fetching unread count:", err));
  }, [userId]);

  const openChatWithUser = async (rawTargetUser) => {
    if (!rawTargetUser || !userId) return;

    // PERBAIKAN EKSTRAKSI: cari ID musuh chat dari seluruh kemungkinan key objek
    const extractedTargetId = rawTargetUser.user_id || rawTargetUser.id || rawTargetUser._id;

    if (!extractedTargetId) {
      console.error("Gagal membuka obrolan: ID target user tidak ditemukan sama sekali!", rawTargetUser);
      return;
    }

    const normalizedTarget = {
      user_id: extractedTargetId,
      username: rawTargetUser.username || rawTargetUser.name || 'Pengguna',
      profile_picture: rawTargetUser.profile_picture || rawTargetUser.avatar || null
    };

    // Set state secara instan agar laci meluncur keluar lebih responsif
    setTargetUser(normalizedTarget);
    setIsChatOpen(true);

    try {
      // Inisialisasi room chat di database background
      await fetch(`${API_BASE_URL}/chat/conversations/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: Number(userId),
          receiver_id: Number(extractedTargetId)
        })
      });
    } catch (err) {
      console.error("Gagal mendaftarkan relasi obrolan ke database backend:", err);
    }
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setTimeout(() => setTargetUser(null), 300);
  };

  return (
    <ChatContext.Provider value={{
      openChatWithUser,
      closeChat,
      unreadNotifCount,
      setUnreadNotifCount,
    }}>
      {children}
      <ChatDrawer isOpen={isChatOpen} onClose={closeChat} targetUser={targetUser} />
    </ChatContext.Provider>
  );
};