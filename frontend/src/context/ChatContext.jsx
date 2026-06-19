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

  // ── Notification realtime state ──────────────────────────────
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const socketRef = useRef(null);

  const userId = user?.user_id ?? user?.id;

  // ── Persistent SocketIO connection untuk notifikasi ──────────
  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Bergabung ke room notifikasi pribadi
      socket.emit('join_notifications', { user_id: userId });
    });

    socket.on('new_notification', () => {
      // Setiap ada notifikasi baru → tambah unread count
      setUnreadNotifCount(prev => prev + 1);
    });

    socket.on('disconnect', () => {
      console.log('Notification socket disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  // ── Chat handlers ─────────────────────────────────────────────
  const openChatWithUser = (user) => {
    setTargetUser(user);
    setIsChatOpen(true);
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
