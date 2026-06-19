import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';

const SOCKET_URL = API_BASE_URL.replace('/api', '');

const ChatDrawer = ({ isOpen, onClose, targetUser }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const activeUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  const userId = activeUser?.user_id || activeUser?.id;

  // PERBAIKAN 1: Ambil targetId dengan semua kemungkinan key, hindari undefined
  const targetId = targetUser?.user_id || targetUser?.id || targetUser?._id;

  // PERBAIKAN 2: Pastikan ID tidak kosong saat diurutkan
  const getConversationId = (uid1, uid2) => {
    if (!uid1 || !uid2) return "";
    return [String(uid1), String(uid2)].sort().join('-');
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initialize Socket Connection & Listeners
  useEffect(() => {
    if (!isOpen || !userId || !targetId) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_chat', { user_id: userId, other_user_id: targetId });
    });

    newSocket.on('receive_message', (msg) => {
      const currentRoom = getConversationId(userId, targetId);
      if (msg.conversation_id === currentRoom) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
    });

    return () => {
      newSocket.emit('leave_chat', { user_id: userId, other_user_id: targetId });
      newSocket.disconnect();
    };
  }, [isOpen, userId, targetId]);

  // Fetch Message History
  useEffect(() => {
    if (!isOpen || !userId || !targetId) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const roomId = getConversationId(userId, targetId);
        const res = await fetch(`${API_BASE_URL}/chat/messages/${roomId}`);
        const data = await res.json();
        if (data.status === 'ok') {
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to fetch messages', err);
      } finally {
        setIsLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    fetchHistory();
  }, [isOpen, userId, targetId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !socket || !targetId) return;

    socket.emit('send_message', {
      sender_id: userId,
      receiver_id: targetId,
      text: inputText.trim()
    });

    setInputText('');
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-[#13131f] border-l border-white/10 shadow-2xl z-[100] flex flex-col transform transition-transform duration-300 translate-x-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 bg-black/20">
        <div className="flex items-center gap-3">
          <img
            src={targetUser.profile_picture || `https://ui-avatars.com/api/?name=${targetUser.username || 'User'}&background=6366f1&color=fff`}
            alt={targetUser.username}
            className="w-10 h-10 rounded-full object-cover border border-indigo-500/30"
          />
          <div>
            <h3 className="font-bold text-white text-sm">{targetUser.username || 'Pengguna'}</h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-2">
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/10">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <i className="fas fa-circle-notch fa-spin text-indigo-500"></i>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-white/30 text-xs">
            Belum ada pesan. Mulai percakapan sekarang!
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = String(msg.sender_id) === String(userId);
            return (
              <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/10 text-white/90 rounded-tl-sm'}`}>
                  {msg.text}
                  <div className={`text-[9px] mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Tulis pesan..."
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shrink-0"
          >
            <i className="fas fa-paper-plane text-xs"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatDrawer;