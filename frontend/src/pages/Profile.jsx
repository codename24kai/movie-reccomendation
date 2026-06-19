import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('ratings');
  const [history, setHistory] = useState([]);
  const [userThreads, setUserThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [userStats, setUserStats] = useState({
    totalRating: 0,
    totalWatched: 0,
    totalWatchlist: 0,
    totalThreads: 0,
  });

  const activeUser = (() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();
  const userId = activeUser?.user_id ?? activeUser?.id;

  useEffect(() => {
    if (!userId) return;

    const fetchProfileData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, historyRes, threadsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/user/${userId}/profile`),
          fetch(`${API_BASE_URL}/api/user/${userId}/history?limit=20`),
          fetch(`${API_BASE_URL}/community/posts`),
        ]);

        const profileData = await profileRes.json();
        const historyData = await historyRes.json();
        const threadsData = await threadsRes.json();

        if (profileData.status === 'ok') {
          setUserStats({
            totalRating: profileData.profile.stats.total_ratings || 0,
            totalWatched: profileData.profile.stats.total_watched || 0,
            totalWatchlist: profileData.profile.stats.total_watchlist || 0,
            totalThreads: profileData.profile.stats.total_posts || 0,
          });
        }

        if (historyData.status === 'ok') {
          setHistory(historyData.ratings || []);
        }

        if (threadsData.status === 'ok') {
          const allThreads = threadsData.posts || [];
          const myThreads = allThreads.filter((t) => String(t.author?.user_id || t.user_id) === String(userId));
          setUserThreads(myThreads);
        }
      } catch (err) {
        console.error('Gagal mengambil data profil:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (!activeUser) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/50">
        <i className="fas fa-lock text-4xl mb-4 text-indigo-500/50" />
        <p>Silakan login untuk mengakses halaman profil Anda.</p>
      </div>
    );
  }

  const displayName = activeUser.username || activeUser.name || 'Pengguna';

  return (
    <div className="pb-16 max-w-5xl mx-auto mt-4 animate-fade-in">
      <div className="relative mb-12">
        <div className="h-48 md:h-64 rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 via-purple-900 to-black opacity-80" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f18] to-transparent" />
        </div>

        <div className="absolute -bottom-10 left-8 md:left-12 flex items-end gap-6 w-full pr-16 md:pr-24">
          <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-4 border-[#0f0f18] bg-[#1a1a2e] shadow-2xl shrink-0 z-10 relative">
            <img
              src={activeUser.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&size=200`}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 pb-2 z-10 hidden sm:block">
            <h1 className="text-3xl md:text-4xl font-black text-white drop-shadow-md">{displayName}</h1>
            <p className="text-white/60 font-medium text-sm flex items-center gap-2 mt-1">
              <i className="fas fa-envelope text-indigo-400" /> {activeUser.email}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="absolute top-6 right-6 md:top-8 md:right-8 bg-red-500/20 hover:bg-red-500 text-red-100 hover:text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-red-500/30 flex items-center gap-2 backdrop-blur-md z-20"
        >
          <i className="fas fa-sign-out-alt"></i> <span className="hidden md:inline">Log Out</span>
        </button>
      </div>

      <div className="bg-white/[0.01] border border-white/[0.05] p-5 sm:p-6 rounded-3xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <i className="fas fa-star" />
            </div>
            <div>
              <span className="block text-xl font-bold text-white leading-none">{userStats.totalRating}</span>
              <span className="text-[10px] text-white/40 uppercase font-semibold mt-1 block">Rating</span>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <i className="fas fa-comments" />
            </div>
            <div>
              <span className="block text-xl font-bold text-white leading-none">{userStats.totalThreads}</span>
              <span className="text-[10px] text-white/40 uppercase font-semibold mt-1 block">Diskusi</span>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <i className="fas fa-eye" />
            </div>
            <div>
              <span className="block text-xl font-bold text-white leading-none">{userStats.totalWatched}</span>
              <span className="text-[10px] text-white/40 uppercase font-semibold mt-1 block">Ditonton</span>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center gap-4 hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <i className="fas fa-bookmark" />
            </div>
            <div>
              <span className="block text-xl font-bold text-white leading-none">{userStats.totalWatchlist}</span>
              <span className="text-[10px] text-white/40 uppercase font-semibold mt-1 block">Watchlist</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 mb-8 sm:hidden text-center mt-12">
        <h1 className="text-2xl font-black text-white">{displayName}</h1>
        <p className="text-white/50 text-xs mt-1">{activeUser.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 px-2 md:px-6 mt-8">
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden min-h-[500px] px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex border-b border-white/10 bg-white/[0.01] -mx-3 sm:-mx-4 md:-mx-6">
            <button
              onClick={() => setActiveTab('ratings')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'ratings' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-white/40 hover:text-white/80'}`}
            >
              <i className="fas fa-star" /> Riwayat Rating
            </button>
            <button
              onClick={() => setActiveTab('threads')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'threads' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-white/40 hover:text-white/80'}`}
            >
              <i className="fas fa-comment-dots" /> Aktivitas Forum
            </button>
          </div>

          <div className="p-4 sm:p-5 md:p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-20 text-indigo-400">
                <i className="fas fa-circle-notch fa-spin text-4xl"></i>
              </div>
            ) : (
              <>
                {activeTab === 'ratings' && (
                  <div className="space-y-4 animate-fade-in">
                    {history.length > 0 ? history.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row gap-4 bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl">
                        <div className="flex-1">
                          <h4 className="text-white font-bold text-lg">{item.title || 'Judul Tidak Diketahui'}</h4>
                          {item.review && <p className="text-white/70 text-sm italic mt-2">"{item.review}"</p>}
                        </div>
                        <div className="flex items-center gap-1.5 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                          <i className="fas fa-star text-amber-400"></i>
                          <span className="text-amber-400 font-black text-lg">{item.rating}</span>
                        </div>
                      </div>
                    )) : <p className="text-center text-white/40 py-10">Belum ada rating.</p>}
                  </div>
                )}
                {activeTab === 'threads' && (
                  <div className="space-y-4 animate-fade-in">
                    {userThreads.length > 0 ? userThreads.map((thread) => (
                      <div key={thread.post_id} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl cursor-pointer hover:bg-white/[0.04]" onClick={() => navigate('/community')}>
                        <p className="text-white/90 text-sm mb-3">{thread.content}</p>
                        <div className="flex gap-4 text-white/30 text-xs font-bold">
                          <span>{thread.likes?.length || 0} Likes</span>
                          <span>{thread.comment_count || 0} Balasan</span>
                        </div>
                      </div>
                    )) : <p className="text-center text-white/40 py-10">Belum ada postingan.</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
