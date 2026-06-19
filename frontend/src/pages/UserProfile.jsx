import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { API_BASE_URL } from '../config/api';

const UserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { openChatWithUser } = useContext(ChatContext);

  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [userThreads, setUserThreads] = useState([]);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [watchedItems, setWatchedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('ratings');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const activeUser = (() => {
    if (user) return user;
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const currentUserId = activeUser?.user_id ?? activeUser?.id;

  useEffect(() => {
    if (String(currentUserId) === String(id)) {
      navigate('/profile', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const [profileRes, historyRes, threadsRes, watchlistRes, watchedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/user/${id}/profile`),
          fetch(`${API_BASE_URL}/api/user/${id}/history?limit=20`),
          fetch(`${API_BASE_URL}/community/posts`),
          fetch(`${API_BASE_URL}/watchlist/${id}`),
          fetch(`${API_BASE_URL}/watched/${id}`),
        ]);

        const profileData = await profileRes.json();
        const historyData = await historyRes.json();
        const threadsData = await threadsRes.json();
        const watchlistData = await watchlistRes.json();
        const watchedData = await watchedRes.json();

        if (profileData.status === 'ok') {
          setProfile(profileData.profile);
        }

        if (historyData.status === 'ok') {
          setHistory(historyData.ratings || []);
        }

        if (threadsData.status === 'ok') {
          const allThreads = threadsData.posts || [];
          const myThreads = allThreads.filter((t) => String(t.author?.user_id || t.user_id) === String(id));
          setUserThreads(myThreads);
        }

        if (watchlistData.status === 'ok') {
          setWatchlistItems(watchlistData.watchlist || []);
        }

        if (watchedData.status === 'ok') {
          setWatchedItems(watchedData.watched_list || []);
        }

        if (currentUserId) {
          const myProfileRes = await fetch(`${API_BASE_URL}/user/${currentUserId}/profile`);
          const myProfileData = await myProfileRes.json();
          if (myProfileData.status === 'ok') {
            setIsFollowing(myProfileData.profile.following?.includes(parseInt(id, 10)));
          }
        }
      } catch (err) {
        console.error('Gagal memuat profil:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchProfile();
  }, [id, currentUserId, navigate]);

  const handleToggleFollow = async () => {
    if (!currentUserId || isTogglingFollow) return;
    setIsTogglingFollow(true);
    setIsFollowing(!isFollowing);

    try {
      const res = await fetch(`${API_BASE_URL}/friends/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          follower_id: currentUserId,
          target_id: parseInt(id, 10),
        }),
      });

      const data = await res.json();
      if (data.status !== 'ok') {
        setIsFollowing((prev) => !prev);
      }
    } catch (err) {
      setIsFollowing((prev) => !prev);
      console.error(err);
    } finally {
      setIsTogglingFollow(false);
    }
  };

  const handleMessage = () => {
    if (!profile) return;
    openChatWithUser({
      user_id: profile.user_id,
      username: profile.username,
      profile_picture: profile.profile_picture,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh] text-indigo-400">
        <i className="fas fa-circle-notch fa-spin text-4xl"></i>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-white">
        <h2 className="text-2xl font-black">User tidak ditemukan</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-indigo-400 underline">
          Kembali
        </button>
      </div>
    );
  }

  const displayName = profile.username || profile.name || 'Pengguna';

  return (
    <div className="pb-16 max-w-5xl mx-auto mt-4 animate-fade-in">
      <div className="relative mb-12 border border-white/5 rounded-[2rem] overflow-hidden bg-white/[0.01]">
        <div className="h-48 md:h-64 relative bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
        </div>

        <div className="absolute -bottom-10 left-8 flex items-end gap-6 w-full pr-16">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-[#080810] bg-[#1a1a2e] shadow-2xl shrink-0 z-10 relative">
            <img
              src={profile.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&size=200`}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 pb-2 z-10">
            <h1 className="text-3xl font-black text-white drop-shadow-md">{displayName}</h1>
          </div>
        </div>

        <div className="absolute top-6 right-6 flex gap-3 z-20">
          <button
            onClick={handleMessage}
            className="bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
          >
            <i className="fas fa-comment-dots" /> <span className="hidden md:inline">Kirim Pesan</span>
          </button>

          <button
            onClick={handleToggleFollow}
            disabled={isTogglingFollow}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 border ${
              isFollowing
                ? 'bg-white/10 text-white border-white/20 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500 hover:text-white'
            }`}
          >
            <i className={`fas ${isFollowing ? 'fa-user-check' : 'fa-user-plus'}`} />
            <span className="hidden md:inline">{isFollowing ? 'Mengikuti' : 'Ikuti'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 mt-16 px-4">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
              <span className="block text-[10px] text-white/40 uppercase font-semibold">Rating</span>
              <span className="block text-xl font-black text-white mt-1">{profile.stats?.total_ratings || 0}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
              <span className="block text-[10px] text-white/40 uppercase font-semibold">Ditonton</span>
              <span className="block text-xl font-black text-white mt-1">{profile.stats?.total_watched || 0}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
              <span className="block text-[10px] text-white/40 uppercase font-semibold">Watchlist</span>
              <span className="block text-xl font-black text-white mt-1">{profile.stats?.total_watchlist || 0}</span>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
              <span className="block text-[10px] text-white/40 uppercase font-semibold">Forum</span>
              <span className="block text-xl font-black text-white mt-1">{profile.stats?.total_posts || 0}</span>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/40 font-semibold">Mengikuti</span>
              <span className="text-white font-black">{profile.stats?.total_following || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/40 font-semibold">Pengikut</span>
              <span className="text-white font-black">{profile.stats?.total_followers || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden min-h-[400px]">
          <div className="flex border-b border-white/10 bg-white/[0.01]">
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
            <button
              onClick={() => setActiveTab('collection')}
              className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'collection' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-white/40 hover:text-white/80'}`}
            >
              <i className="fas fa-bookmark" /> Koleksi
            </button>
          </div>

          <div className="p-5 md:p-6">
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

            {activeTab === 'collection' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-sm font-black text-white mb-3">Watchlist</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {watchlistItems.length > 0 ? watchlistItems.map((item) => (
                      <div key={item.movie_id || item.movieId} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-white font-bold text-sm line-clamp-1">{item.title || 'Judul Tidak Diketahui'}</p>
                        <p className="text-white/35 text-xs mt-1 line-clamp-2">{item.genres || 'Genre belum tersedia'}</p>
                      </div>
                    )) : <p className="text-white/35 text-sm">Belum ada film di watchlist.</p>}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-white mb-3">Watched</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {watchedItems.length > 0 ? watchedItems.map((item) => (
                      <div key={item.movie_id || item.movieId} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-white font-bold text-sm line-clamp-1">{item.title || 'Judul Tidak Diketahui'}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-amber-400 font-bold">
                          <i className="fas fa-star" />
                          <span>{item.rating ? Number(item.rating).toFixed(1) : '-'}</span>
                          {item.review && <span className="text-white/35 font-medium">Ada ulasan</span>}
                        </div>
                      </div>
                    )) : <p className="text-white/35 text-sm">Belum ada film ditonton.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
