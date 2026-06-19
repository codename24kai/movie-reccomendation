import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

// ════════════════════════════════════════════════════════════════
//  FriendListModal — menampilkan daftar followers atau following
//  dari seorang pengguna. Dipanggil dari UserProfileModal saat
//  bagian "Follower"/"Mengikuti" di-klik.
// ════════════════════════════════════════════════════════════════

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=1f2937&color=fff`;

const FriendListModal = ({ userId, mode, onClose, onOpenProfile }) => {
  const [list, setList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Fetch data followers/following dari API
  useEffect(() => {
    if (!userId) return;

    const fetchFriends = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/community/follow/${userId}`);
        const data = await res.json();
        
        if (data.status === 'ok') {
          // Pilih data yang sesuai dengan mode (followers / following)
          setList(mode === 'followers' ? data.followers : data.following);
        }
      } catch (err) {
        console.error("Gagal memuat daftar teman:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [userId, mode]);

  const title = mode === 'followers' ? 'Followers' : 'Mengikuti';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm max-h-[80vh] flex flex-col rounded-[1.75rem] border border-white/10 bg-[#0e0e18] overflow-hidden shadow-2xl animate-fade-in">

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-black text-white">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/[0.08] hover:text-white"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {isLoading ? (
            <div className="py-12 flex justify-center text-indigo-500">
              <i className="fas fa-circle-notch fa-spin text-2xl"></i>
            </div>
          ) : list.length > 0 ? (
            <div className="space-y-1">
              {list.map((person) => (
                <button
                  key={person.user_id}
                  onClick={() => onOpenProfile(person.user_id)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-white/[0.05] transition-colors"
                >
                  <img
                    src={person.profile_picture || avatarFallback(person.username)}
                    alt={person.username}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white truncate">{person.username}</p>
                    <p className="text-xs text-white/35 truncate">{person.bio || 'Anggota MovieHub'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-white/30">
              {mode === 'followers' ? 'Belum ada follower.' : 'Belum mengikuti siapa pun.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendListModal;