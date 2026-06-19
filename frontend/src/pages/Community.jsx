import { useEffect, useMemo, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import PostCard from '../components/Postcard';
import PostDetailModal from '../components/PostDetailModal';
import FriendListModal from '../components/FriendlistModal';
import { API_BASE_URL } from '../config/api';

const POST_TYPE_TABS = [
  { key: 'discussion', label: 'Diskusi', icon: 'fa-comments', hint: 'Bagikan opini, pertanyaan, atau ajak diskusi.' },
  { key: 'review', label: 'Review', icon: 'fa-star', hint: 'Tulis ulasan film. Pilih film yang ingin direview.' },
  { key: 'poll', label: 'Polling', icon: 'fa-square-poll-vertical', hint: 'Buat pertanyaan dengan beberapa opsi film.' },
];

const FEED_FILTERS = [
  { key: 'all', label: 'Semua', icon: 'fa-layer-group' },
  { key: 'discussion', label: 'Diskusi', icon: 'fa-comments' },
  { key: 'review', label: 'Review', icon: 'fa-star' },
  { key: 'poll', label: 'Polling', icon: 'fa-square-poll-vertical' },
];

const Community = () => {
  const { user } = useContext(AuthContext);

  const activeUser = useMemo(() => {
    if (user) return user;
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [user]);

  const currentUserId = activeUser?.user_id ?? activeUser?.id ?? null;

  // ── State data utama (sekarang dari backend) ──
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── State UI ──
  const [feedFilter, setFeedFilter] = useState('all');
  const [composerTab, setComposerTab] = useState('discussion');
  const [composerText, setComposerText] = useState('');
  const [composerRating, setComposerRating] = useState(0);
  
  const [mentionQuery, setMentionQuery] = useState('');
  const [movieSearchResults, setMovieSearchResults] = useState([]);
  const [taggedMovie, setTaggedMovie] = useState(null); // Menyimpan objek utuh bukan cuma ID
  
  const [pollOptions, setPollOptions] = useState(['', '']); // Array of string (text poll) or object (movie poll)
  const [activePollInputIdx, setActivePollInputIdx] = useState(null);
  
  const [notice, setNotice] = useState('');
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [friendListState, setFriendListState] = useState(null); // { userId, mode }

  // ── Fetch Initial Posts ──
  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/community/posts`);
        const data = await res.json();
        if (data.status === 'ok') {
          setPosts(data.posts || []);
        }
      } catch (err) {
        console.error("Gagal memuat post:", err);
        showNotice("Gagal terhubung ke server.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  // ── Fetch Comments when a Post is selected ──
  useEffect(() => {
    if (!selectedPostId) return;
    const fetchComments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/community/comments/${selectedPostId}`);
        const data = await res.json();
        if (data.status === 'ok') {
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error("Gagal memuat komentar:", err);
      }
    };
    fetchComments();
  }, [selectedPostId]);

  // ── Live Movie Search untuk Mention/Tag ──
  useEffect(() => {
    if (!mentionQuery.trim()) {
      setMovieSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/movies/search?q=${encodeURIComponent(mentionQuery)}&limit=5`);
        const data = await res.json();
        if (data.status === 'ok') {
          const results = data.movies || data.results || [];
          setMovieSearchResults(results.slice(0, 5));
        }
      } catch (err) {
        console.error("Gagal mencari film:", err);
      }
    }, 400); // Debounce 400ms

    return () => clearTimeout(timer);
  }, [mentionQuery]);

  // Sort post dari terbaru
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'all') return sortedPosts;
    return sortedPosts.filter((p) => p.type === feedFilter);
  }, [sortedPosts, feedFilter]);

  // ── Bangun tree komentar nested (unlimited depth) dari struktur flat ──
  const buildCommentTree = (postId) => {
    const byParent = {};
    comments.forEach((c) => {
      const key = c.parent_comment_id ?? 'root';
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(c);
    });

    const attachChildren = (comment) => ({
      ...comment,
      children: (byParent[comment.comment_id] ?? [])
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(attachChildren),
    });

    return (byParent.root ?? [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(attachChildren);
  };

  const selectedPost = useMemo(
    () => sortedPosts.find((p) => p.post_id === selectedPostId) ?? null,
    [sortedPosts, selectedPostId]
  );
  const selectedCommentTree = useMemo(
    () => (selectedPostId ? buildCommentTree(selectedPostId) : []),
    [selectedPostId, comments] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const showNotice = (text) => {
    setNotice(text);
    setTimeout(() => setNotice(''), 3000);
  };

  // ── Reset composer setiap ganti tab tipe postingan ──
  useEffect(() => {
    setComposerText('');
    setComposerRating(0);
    setTaggedMovie(null);
    setMentionQuery('');
    setPollOptions(['', '']);
    setActivePollInputIdx(null);
  }, [composerTab]);

  // ── Handler: Posting baru ──
  const handleSubmitPost = async () => {
    if (!activeUser) {
      showNotice('Silakan login untuk memposting.');
      return;
    }

    const content = composerText.trim();
    if (!content) return;

    if (composerTab === 'review' && !taggedMovie) {
      showNotice('Pilih film yang ingin direview terlebih dahulu.');
      return;
    }
    if (composerTab === 'poll' && pollOptions.filter(opt => opt && (typeof opt === 'string' ? opt.trim() !== '' : true)).length < 2) {
      showNotice('Polling membutuhkan minimal 2 opsi film.');
      return;
    }

    const payload = {
      type: composerTab,
      user_id: currentUserId,
      content,
    };

    if (composerTab === 'review') {
      payload.movie_id = taggedMovie.movie_id ?? taggedMovie.movieId ?? taggedMovie.tmdb_id;
      payload.taggedMovie = taggedMovie; // Simpan info film untuk UI
      payload.rating = composerRating || 5;
    }

    if (composerTab === 'poll') {
      payload.poll_options = pollOptions
        .filter(opt => opt && (typeof opt === 'string' ? opt.trim() !== '' : true))
        .map((opt, i) => {
          if (typeof opt === 'string') {
            return {
              id: `opt-${Date.now()}-${i}`,
              text: opt.trim(),
              votes: []
            };
          } else {
            return {
              id: `opt-${Date.now()}-${i}`,
              movie_id: opt.movie_id ?? opt.movieId ?? opt.tmdb_id,
              movie: opt, // Simpan info film
              text: opt.title,
              votes: []
            };
          }
        });
    }

    try {
      const res = await fetch(`${API_BASE_URL}/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.status === 'ok') {
        setPosts((prev) => [data.post, ...prev]);
        showNotice('Postingan berhasil dibuat.');
        setComposerText('');
        setComposerRating(0);
        setTaggedMovie(null);
        setPollOptions(['', '']);
        setActivePollInputIdx(null);
      } else {
        showNotice(data.message || 'Gagal membuat postingan.');
      }
    } catch (err) {
      console.error(err);
      showNotice('Terjadi kesalahan jaringan.');
    }
  };

  // ── Handler: Like/Dislike pada post ──
  const handleReact = async (postId, type) => {
    if (!activeUser) {
      showNotice('Silakan login untuk memberi reaksi.');
      return;
    }
    
    // Optimistic Update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.post_id !== postId) return p;
        
        let newLikes = Array.isArray(p.likes) ? [...p.likes] : [];
        let newDislikes = Array.isArray(p.dislikes) ? [...p.dislikes] : [];
        
        const hasLiked = newLikes.includes(currentUserId);
        const hasDisliked = newDislikes.includes(currentUserId);
        
        if (type === 'like') {
          if (hasLiked) {
            newLikes = newLikes.filter(id => id !== currentUserId); // Toggle off
          } else {
            newLikes.push(currentUserId);
            newDislikes = newDislikes.filter(id => id !== currentUserId);
          }
        } else if (type === 'dislike') {
          if (hasDisliked) {
            newDislikes = newDislikes.filter(id => id !== currentUserId); // Toggle off
          } else {
            newDislikes.push(currentUserId);
            newLikes = newLikes.filter(id => id !== currentUserId);
          }
        }
        
        return { ...p, likes: newLikes, dislikes: newDislikes };
      })
    );

    // Call API
    fetch(`${API_BASE_URL}/community/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, post_id: postId, action: type })
    }).catch(console.error);
  };

  // ── Handler: Vote polling ──
  const handleVotePoll = async (postId, optionId) => {
    if (!activeUser) {
      showNotice('Silakan login untuk vote.');
      return;
    }
    
    // Optimistic Update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.post_id !== postId) return p;
        
        const updatedOptions = p.poll_options.map(opt => {
          let votesArray = Array.isArray(opt.votes) ? [...opt.votes] : [];
          // Remove from all options first
          votesArray = votesArray.filter(id => id !== currentUserId);
          // Add to the selected one
          if ((opt.id || opt.option_id) === optionId) {
            votesArray.push(currentUserId);
          }
          return { ...opt, votes: votesArray };
        });
        
        return { ...p, poll_options: updatedOptions, voted_option_id: optionId };
      })
    );

    // Call API
    fetch(`${API_BASE_URL}/community/poll/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, post_id: postId, option_id: optionId })
    }).catch(console.error);
  };

  // ── Handler: Edit/Delete post ──
  const handleEditPost = async (postId, newContent) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => (p.post_id === postId ? { ...p, content: newContent, updated_at: new Date().toISOString() } : p))
    );
    
    fetch(`${API_BASE_URL}/community/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, content: newContent })
    }).catch(console.error);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Hapus postingan ini?')) return;
    
    // Optimistic update
    setPosts((prev) => prev.filter((p) => p.post_id !== postId));
    if (selectedPostId === postId) setSelectedPostId(null);
    
    fetch(`${API_BASE_URL}/community/posts/${postId}`, {
      method: 'DELETE',
    }).catch(console.error);
  };

  // ── Handler: Comment / Reply (nested) ──
  const handleAddComment = async (postId, parentCommentId, text) => {
    if (!activeUser) {
      showNotice('Silakan login untuk berkomentar.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/community/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: postId,
          parent_comment_id: parentCommentId,
          user_id: currentUserId,
          content: text
        })
      });
      const data = await res.json();
      
      if (data.status === 'ok') {
        setComments((prev) => [...prev, data.comment]);
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p
          )
        );
      }
    } catch (err) {
      console.error(err);
      showNotice('Gagal mengirim komentar.');
    }
  };

  const handleVoteComment = (commentId, voteType) => {
    if (!activeUser) {
      showNotice('Silakan login untuk memberi vote.');
      return;
    }

    // Optimistic Update
    setComments((prev) =>
      prev.map((c) => {
        if (c.comment_id !== commentId) return c;
        let newLikes = Array.isArray(c.likes) ? [...c.likes] : [];
        let newDislikes = Array.isArray(c.dislikes) ? [...c.dislikes] : [];
        
        const hasLiked = newLikes.includes(currentUserId);
        const hasDisliked = newDislikes.includes(currentUserId);
        
        if (voteType === 'like') {
          if (hasLiked) newLikes = newLikes.filter(id => id !== currentUserId);
          else {
            newLikes.push(currentUserId);
            newDislikes = newDislikes.filter(id => id !== currentUserId);
          }
        } else if (voteType === 'dislike') {
          if (hasDisliked) newDislikes = newDislikes.filter(id => id !== currentUserId);
          else {
            newDislikes.push(currentUserId);
            newLikes = newLikes.filter(id => id !== currentUserId);
          }
        }
        
        return { ...c, likes: newLikes, dislikes: newDislikes };
      })
    );

    // Call API
    fetch(`${API_BASE_URL}/community/comments/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, item_id: commentId, action: voteType })
    }).catch(console.error);
  };

  const handleEditComment = (commentId, newContent) => {
    setComments((prev) =>
      prev.map((c) => (c.comment_id === commentId ? { ...c, content: newContent, updated_at: new Date().toISOString() } : c))
    );
    
    fetch(`${API_BASE_URL}/community/comments/${commentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: currentUserId, content: newContent })
    }).catch(console.error);
  };

  const handleDeleteComment = (commentId) => {
    if (!window.confirm('Hapus komentar ini? Balasan di bawahnya juga akan terhapus.')) return;

    // Hapus comment beserta semua descendant-nya (rekursif) secara lokal
    const idsToDelete = new Set([commentId]);
    let changed = true;
    while (changed) {
      changed = false;
      comments.forEach((c) => {
        if (c.parent_comment_id && idsToDelete.has(c.parent_comment_id) && !idsToDelete.has(c.comment_id)) {
          idsToDelete.add(c.comment_id);
          changed = true;
        }
      });
    }

    setComments((prev) => prev.filter((c) => !idsToDelete.has(c.comment_id)));
    setPosts((prev) =>
      prev.map((p) =>
        p.post_id === selectedPostId ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - idsToDelete.size) } : p
      )
    );
    
    fetch(`${API_BASE_URL}/community/comments/${commentId}`, {
      method: 'DELETE',
    }).catch(console.error);
  };

  const stats = useMemo(() => ({
    totalPosts: posts.length,
    totalReviews: posts.filter((p) => p.type === 'review').length,
    totalPolls: posts.filter((p) => p.type === 'poll').length,
  }), [posts]);

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_320px] pb-24 mt-4 animate-fade-in">
      <section className="space-y-6">

        {/* Header */}
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-pink-500/15 via-indigo-500/10 to-transparent p-6 md:p-8">
          <p className="text-pink-300 text-sm uppercase tracking-[0.3em] font-bold mb-2">Komunitas</p>
          <h1 className="mt-2 text-3xl font-black text-white md:text-5xl tracking-tight">Forum film yang terasa hidup.</h1>
          <p className="mt-3 max-w-2xl text-white/60">
            Diskusi, review dengan mention film, dan polling — semua interaksi komunitas MovieHub di satu tempat.
          </p>
        </div>

        {notice && (
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
            {notice}
          </div>
        )}

        {/* ── Composer dengan tab tipe postingan ── */}
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
          {activeUser ? (
            <>
              {/* Tab pemilih tipe */}
              <div className="flex gap-2 border-b border-white/10 pb-4 mb-4">
                {POST_TYPE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setComposerTab(tab.key)}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      composerTab === tab.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/[0.03] text-white/50 hover:bg-white/[0.06]'
                    }`}
                  >
                    <i className={`fas ${tab.icon} mr-2`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              <p className="mb-3 text-xs text-white/35 font-medium">
                {POST_TYPE_TABS.find((t) => t.key === composerTab)?.hint}
              </p>

              <textarea
                value={composerText}
                onChange={(e) => setComposerText(e.target.value)}
                placeholder={
                  composerTab === 'discussion'
                    ? 'Apa yang lagi kamu pikirkan tentang film hari ini?'
                    : composerTab === 'review'
                    ? 'Tulis ulasanmu tentang film ini...'
                    : 'Tulis pertanyaan untuk polling...'
                }
                className="min-h-[100px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[15px] text-white outline-none placeholder:text-white/30 focus:border-indigo-500/40 custom-scrollbar"
              />

              {/* ── Field khusus REVIEW: mention film + rating ── */}
              {composerTab === 'review' && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  {taggedMovie ? (
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <img src={taggedMovie.poster_url || taggedMovie.posterUrl} alt={taggedMovie.title} className="h-14 w-10 rounded-md object-cover bg-white/5" />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{taggedMovie.title} <span className="text-white/40 font-normal">({taggedMovie.year || taggedMovie.release_year})</span></p>
                      </div>
                      <button onClick={() => setTaggedMovie(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors">
                        <i className="fas fa-xmark" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-white/20"></i>
                      <input
                        type="text"
                        value={mentionQuery}
                        onChange={(e) => setMentionQuery(e.target.value)}
                        placeholder="Cari film untuk direview..."
                        className="w-full rounded-full border border-white/10 bg-black/20 py-2.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-indigo-500/40 transition-colors"
                      />
                      {movieSearchResults.length > 0 && (
                        <div className="absolute z-10 mt-2 w-full rounded-2xl border border-white/10 bg-[#151520] shadow-xl overflow-hidden py-2">
                          {movieSearchResults.map((m, idx) => (
                            <button
                              key={m.movie_id ?? m.movieId ?? idx}
                              onClick={() => { setTaggedMovie(m); setMentionQuery(''); setMovieSearchResults([]); }}
                              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
                            >
                              <img src={m.poster_url || m.posterUrl} alt={m.title} className="h-10 w-7 rounded object-cover bg-white/5" />
                              <span className="text-sm font-bold text-white">{m.title} <span className="text-white/30 font-normal">({m.year || m.release_year})</span></span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-2 px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/40 mr-2">Beri Rating:</span>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setComposerRating(s)} className="transition-transform hover:scale-110">
                        <i className={`fas fa-star text-lg ${s <= composerRating ? 'text-amber-400' : 'text-white/10'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Field khusus POLL: opsi film ── */}
              {composerTab === 'poll' && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  {pollOptions.map((optMovie, idx) => {
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        {typeof optMovie === 'object' && optMovie !== null ? (
                          <div className="flex-1 flex items-center gap-3 rounded-full border border-white/10 bg-black/20 p-2 pr-4">
                            <img src={optMovie.poster_url || optMovie.posterUrl} alt={optMovie.title} className="h-8 w-6 rounded object-cover ml-1" />
                            <span className="text-sm text-white font-semibold flex-1 truncate">{optMovie.title}</span>
                            <button
                              onClick={() => setPollOptions((prev) => prev.map((v, i) => (i === idx ? '' : v)))}
                              className="text-white/30 hover:text-red-400 transition-colors"
                            >
                              <i className="fas fa-times" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative flex-1">
                             <input
                                type="text"
                                placeholder={`Ketik teks atau cari film untuk opsi #${idx + 1}`}
                                value={optMovie || ''}
                                onFocus={() => setActivePollInputIdx(idx)}
                                onChange={async (e) => {
                                  const q = e.target.value;
                                  setPollOptions((prev) => prev.map((v, i) => (i === idx ? q : v)));
                                  if(q.length > 2) {
                                    const res = await fetch(`${API_BASE_URL}/movies/search?q=${encodeURIComponent(q)}&limit=5`);
                                    const data = await res.json();
                                    setMovieSearchResults(data.movies || data.results || []);
                                  } else {
                                    setMovieSearchResults([]);
                                  }
                                }}
                                className="w-full rounded-full border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                              />
                              {activePollInputIdx === idx && movieSearchResults.length > 0 && (
                                <div className="absolute z-10 mt-1 w-full rounded-xl border border-white/10 bg-[#151520] shadow-xl overflow-hidden py-1">
                                  {movieSearchResults.map((m, mIdx) => (
                                    <button
                                      key={mIdx}
                                      onClick={() => {
                                        setPollOptions((prev) => prev.map((v, i) => (i === idx ? m : v)));
                                        setMovieSearchResults([]);
                                        setActivePollInputIdx(null);
                                      }}
                                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.06]"
                                    >
                                      <span className="text-sm text-white">{m.title}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                          </div>
                        )}

                        {pollOptions.length > 2 && (
                          <button
                            onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/5 bg-white/5 text-white/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                          >
                            <i className="fas fa-trash text-xs" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {pollOptions.length < 5 && (
                    <button
                      onClick={() => setPollOptions((prev) => [...prev, ''])}
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                    >
                      <i className="fas fa-plus" /> Tambah opsi film
                    </button>
                  )}
                </div>
              )}

              <div className="mt-4 flex justify-end border-t border-white/10 pt-4">
                <button
                  onClick={handleSubmitPost}
                  disabled={!composerText.trim()}
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="fas fa-paper-plane" /> Posting
                </button>
              </div>
            </>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                <i className="fas fa-lock text-2xl text-white/20"></i>
              </div>
              <p className="text-white/60 font-medium">Silakan login untuk ikut berdiskusi di komunitas.</p>
            </div>
          )}
        </div>

        {/* ── Filter feed by tipe ── */}
        <div className="flex flex-wrap gap-2 pt-2">
          {FEED_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFeedFilter(f.key)}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${
                feedFilter === f.key
                  ? 'border-indigo-400 bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              <i className={`fas ${f.icon} mr-2`} />
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Feed ── */}
        <div className="space-y-4 relative min-h-[200px]">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-500"></i>
            </div>
          ) : filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <PostCard
                key={post.post_id}
                post={post}
                currentUserId={currentUserId}
                onOpenDetail={(p) => setSelectedPostId(p.post_id)}
                onReact={handleReact}
                onVotePoll={handleVotePoll}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onOpenProfile={(uid) => window.location.href = `/user/${uid}`}
              />
            ))
          ) : (
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.02] py-20 flex flex-col items-center justify-center text-center">
              <i className="fas fa-ghost text-4xl text-white/10 mb-4"></i>
              <p className="text-white/40 font-medium">Belum ada postingan untuk filter ini.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Sidebar ── */}
      <aside className="space-y-6 lg:sticky lg:top-6 h-fit hidden xl:block">
        <div className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <i className="fas fa-chart-pie text-indigo-400 text-sm"></i> Stat Komunitas
          </h3>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center hover:bg-white/5 transition-colors">
              <p className="text-2xl font-black text-white">{stats.totalPosts}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/30 mt-1">Post Total</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center hover:bg-white/5 transition-colors">
              <p className="text-2xl font-black text-white">{stats.totalReviews}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/30 mt-1">Review</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-center col-span-2 hover:bg-white/5 transition-colors">
              <p className="text-2xl font-black text-white">{stats.totalPolls}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-white/30 mt-1">Polling Interaktif</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <i className="fas fa-book-open text-pink-400 text-sm"></i> Panduan Cepat
          </h3>
          <ul className="mt-5 space-y-4 text-sm leading-relaxed text-white/50">
            <li className="flex items-start gap-3">
              <i className="fas fa-check-circle text-indigo-400 mt-1 shrink-0"></i>
              <span>Pilih tab Diskusi, Review, atau Polling sesuai jenis postingan yang ingin dibuat.</span>
            </li>
            <li className="flex items-start gap-3">
              <i className="fas fa-check-circle text-indigo-400 mt-1 shrink-0"></i>
              <span>Review wajib menandai film via fitur pencarian bawaan — mini movie card akan terpasang otomatis.</span>
            </li>
            <li className="flex items-start gap-3">
              <i className="fas fa-check-circle text-indigo-400 mt-1 shrink-0"></i>
              <span>Klik nama atau avatar siapa pun untuk mengintip profil dan menekan tombol Follow.</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* ── Modals ── */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          commentTree={selectedCommentTree}
          currentUserId={currentUserId}
          onClose={() => setSelectedPostId(null)}
          onReact={handleReact}
          onAddComment={handleAddComment}
          onVoteComment={handleVoteComment}
          onEditComment={handleEditComment}
          onDeleteComment={handleDeleteComment}
          onOpenProfile={(uid) => window.location.href = `/user/${uid}`}
        />
      )}

      {friendListState && (
        <FriendListModal
          userId={friendListState.userId}
          mode={friendListState.mode}
          onClose={() => setFriendListState(null)}
          onOpenProfile={(uid) => {
            setFriendListState(null);
            setProfileUserId(uid);
          }}
        />
      )}
    </div>
  );
};

export default Community;