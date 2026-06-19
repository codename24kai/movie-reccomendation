import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { API_BASE_URL } from '../config/api';
import { io } from 'socket.io-client';

const SOCKET_URL = API_BASE_URL.replace('/api', '');

const InboxDropdown = () => {
  const { user } = useContext(AuthContext);
  const { openChatWithUser } = useContext(ChatContext);
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const activeUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const userId = activeUser?.user_id || activeUser?.id;

  const fetchConversations = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/conversations/${userId}`);
      const data = await res.json();
      if (data.status === 'ok') {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!userId) return;

    const globalChatSocket = io(SOCKET_URL);

    globalChatSocket.on('connect', () => {
      globalChatSocket.emit('join_notifications', { user_id: userId });
    });

    globalChatSocket.on('new_notification', () => {
      fetchConversations();
    });

    return () => {
      globalChatSocket.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadChatsCount = conversations.filter(conv => String(conv.last_sender_id) !== String(userId)).length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors relative"
      >
        <i className="fas fa-comment-alt"></i>
        {unreadChatsCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 text-[9px] text-white font-black flex items-center justify-center border-2 border-[#080810]">
            {unreadChatsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-[#13131f] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden transform origin-top-right animate-fade-in">
          <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02] flex justify-between items-center">
            <h3 className="font-bold text-white">Pesan</h3>
            <button onClick={fetchConversations} className="text-white/40 hover:text-white text-xs">
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <i className="fas fa-circle-notch fa-spin text-indigo-500"></i>
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-comment-slash text-white/20 text-xl"></i>
                </div>
                <p className="text-white/50 text-sm">Belum ada percakapan</p>
                <p className="text-white/30 text-xs mt-1">Mulai obrolan di Komunitas!</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isUnread = String(conv.last_sender_id) !== String(userId);

                const targetObj = conv.other_user || {};

                // PERBAIKAN: Jika targetObj tidak membawa ID dari backend, cari ID alternatif di array participants percakapan
                const backupTargetId = conv.participants?.find(p => String(p) !== String(userId));
                const targetId = targetObj.user_id || targetObj.id || targetObj._id || backupTargetId;

                const handleConversationClick = async () => {
                  if (!targetId) {
                    console.error("Target ID tidak ditemukan pada percakapan ini:", conv);
                    return;
                  }

                  try {
                    openChatWithUser({
                      user_id: targetId,
                      username: targetObj.username || 'Pengguna',
                      profile_picture: targetObj.profile_picture
                    });
                    setIsOpen(false);
                  } catch (err) {
                    console.error("Gagal membuka percakapan:", err);
                  }
                };

                return (
                  <div
                    key={conv._id}
                    onClick={handleConversationClick}
                    className="px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer flex gap-3 transition-colors"
                  >
                    <img
                      src={targetObj.profile_picture || `https://ui-avatars.com/api/?name=${targetObj.username || 'U'}&background=6366f1&color=fff`}
                      alt={targetObj.username}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className={`text-sm truncate pr-2 ${isUnread ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
                          {targetObj.username || 'Pengguna Lain'}
                        </h4>
                        <span className="text-[10px] text-white/40 shrink-0">
                          {conv.updated_at ? new Date(conv.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${isUnread ? 'font-medium text-indigo-300' : 'text-white/50'}`}>
                        {conv.last_message}
                      </p>
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

export default InboxDropdown;