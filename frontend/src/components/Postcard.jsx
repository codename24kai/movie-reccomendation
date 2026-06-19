import { useState } from 'react';

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
};

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=1f2937&color=fff`;

const TYPE_BADGE = {
  discussion: { label: 'Diskusi', icon: 'fa-comments', color: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
  review: { label: 'Review', icon: 'fa-star', color: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  poll: { label: 'Polling', icon: 'fa-square-poll-vertical', color: 'text-violet-300 bg-violet-500/10 border-violet-500/20' },
};

const StarRating = ({ value }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <i
        key={s}
        className={`fas fa-star text-[11px] ${s <= Math.round(value) ? 'text-amber-400' : 'text-white/10'}`}
      />
    ))}
    <span className="ml-1 text-xs font-bold text-amber-400">{Number(value).toFixed(1)}</span>
  </div>
);

const MiniMovieCard = ({ movie }) => {
  if (!movie) return null;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
      <img
        src={movie.poster_url}
        alt={movie.title}
        className="h-16 w-11 shrink-0 rounded-md object-cover bg-white/5"
        loading="lazy"
      />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/30">Film yang direview</p>
        <p className="text-sm font-bold text-white">{movie.title}</p>
        <p className="text-xs text-white/40">{movie.year || movie.release_year}</p>
      </div>
    </div>
  );
};

const PollBlock = ({ post, currentUserId, onVotePoll }) => {
  // Normalisasi field poll_options dari backend baru
  const pollOpts = post.pollOptions || post.poll_options || [];
  
  // Hitung jumlah votes secara dinamis (mendukung array ID maupun number statis)
  const getVotesCount = (opt) => Array.isArray(opt.votes) ? opt.votes.length : (opt.votes || 0);
  const totalVotes = pollOpts.reduce((sum, opt) => sum + getVotesCount(opt), 0);

  // Cek apakah user sudah vote (dari state parent atau langsung dari array votes backend)
  let votedOptionId = post.voted_option_id;
  if (!votedOptionId && currentUserId) {
    const votedOpt = pollOpts.find(o => Array.isArray(o.votes) && o.votes.includes(currentUserId));
    if (votedOpt) votedOptionId = votedOpt.id || votedOpt.option_id;
  }
  const hasVoted = Boolean(votedOptionId);

  return (
    <div className="mt-3 space-y-2">
      {pollOpts.map((opt) => {
        const optId = opt.option_id || opt.id;
        const optVotes = getVotesCount(opt);
        const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
        const isSelected = votedOptionId === optId;
        
        return (
          <button
            key={optId}
            onClick={() => !hasVoted && onVotePoll(post.post_id, optId)}
            disabled={hasVoted}
            className={`relative w-full overflow-hidden rounded-xl border p-3 text-left transition-colors ${
              isSelected ? 'border-violet-400/40 bg-violet-500/10' : 'border-white/10 bg-black/20 hover:bg-black/30'
            } ${hasVoted ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {/* Progress bar background, hanya tampil setelah voting */}
            {hasVoted && (
              <div
                className="absolute inset-y-0 left-0 bg-violet-500/15"
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative flex items-center gap-3">
              {opt.movie && (
                <img src={opt.movie.poster_url} alt={opt.movie.title} className="h-10 w-7 shrink-0 rounded object-cover" />
              )}
              <span className="flex-1 text-sm font-semibold text-white">
                {opt.movie ? `${opt.movie.title} (${opt.movie.year || opt.movie.release_year})` : (opt.label || opt.text)}
              </span>
              {hasVoted && (
                <span className="text-xs font-bold text-white/60">{pct}%</span>
              )}
              {isSelected && <i className="fas fa-circle-check text-violet-300 text-sm" />}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-white/30 pt-1">{totalVotes} suara{hasVoted ? '' : ' · pilih salah satu opsi untuk vote'}</p>
    </div>
  );
};

const PostCard = ({
  post,
  currentUserId,
  onOpenDetail,
  onReact,
  onVotePoll,
  onEdit,
  onDelete,
  onOpenProfile,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);

  // Normalisasi data dari endpoint baru (author_name & author_avatar berada di level root)
  const author = post.author ?? {
    username: post.author_name,
    profile_picture: post.author_avatar
  };
  
  const isOwner = currentUserId != null && String(currentUserId) === String(post.user_id);
  const badge = TYPE_BADGE[post.type] ?? TYPE_BADGE.discussion;
  
  // Normalisasi userReaction (cek apakah currentUserId ada di array likes/dislikes backend)
  let userReaction = post.userReaction;
  if (!userReaction && currentUserId) {
    if (Array.isArray(post.likes) && post.likes.includes(currentUserId)) userReaction = 'like';
    else if (Array.isArray(post.dislikes) && post.dislikes.includes(currentUserId)) userReaction = 'dislike';
  }

  // Hitung jumlah like, dislike, comment yang mendukung struktur array backend
  const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes ?? 0);
  const dislikesCount = Array.isArray(post.dislikes) ? post.dislikes.length : (post.dislikes ?? 0);
  const commentsCount = post.comment_count ?? post.comment_ids?.length ?? 0;

  const submitEdit = () => {
    const text = editText.trim();
    if (!text) return;
    onEdit(post.post_id, text);
    setIsEditing(false);
  };

  return (
    <article className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.05]">
      {/* Header */}
      <div className="flex gap-3">
        <button onClick={() => onOpenProfile(post.user_id)} className="shrink-0">
          <img
            src={author.profile_picture || avatarFallback(author.username)}
            alt={author.username || 'Anonim'}
            className="h-11 w-11 rounded-full object-cover"
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onOpenProfile(post.user_id)}
              className="font-bold text-white hover:underline"
            >
              {author.username || 'Anonim'}
            </button>
            <span className="text-xs text-white/30">· {timeAgo(post.created_at)}</span>
            {post.updated_at && post.updated_at !== post.created_at && <span className="text-[10px] text-white/20">(diedit)</span>}

            <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.color}`}>
              <i className={`fas ${badge.icon} text-[10px]`} />
              {badge.label}
            </span>
          </div>

          {/* Konten */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[80px] resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none focus:border-indigo-500/40"
              />
              <div className="flex gap-2">
                <button onClick={submitEdit} className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500">
                  Simpan
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditText(post.content); }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/[0.06]"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => onOpenDetail(post)}
                className="mt-2 block text-left text-[15px] leading-relaxed text-white/85 hover:text-white w-full"
              >
                {post.content}
              </button>

              {post.type === 'review' && (
                <>
                  <div className="mt-2"><StarRating value={post.rating} /></div>
                  <MiniMovieCard movie={post.taggedMovie} />
                </>
              )}

              {post.type === 'poll' && (post.pollOptions || post.poll_options) && (
                <PollBlock post={post} currentUserId={currentUserId} onVotePoll={onVotePoll} />
              )}
            </>
          )}

          {/* ── Interaksi: Like / Dislike / Comment — dibuat jelas & besar ── */}
          {!isEditing && (
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => onReact(post.post_id, 'like')}
                aria-pressed={userReaction === 'like'}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  userReaction === 'like'
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:text-white/80'
                }`}
              >
                <i className={`${userReaction === 'like' ? 'fas' : 'far'} fa-thumbs-up`} />
                {likesCount}
              </button>

              <button
                onClick={() => onReact(post.post_id, 'dislike')}
                aria-pressed={userReaction === 'dislike'}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
                  userReaction === 'dislike'
                    ? 'border-rose-400/50 bg-rose-500/15 text-rose-300'
                    : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08] hover:text-white/80'
                }`}
              >
                <i className={`${userReaction === 'dislike' ? 'fas' : 'far'} fa-thumbs-down`} />
                {dislikesCount}
              </button>

              <button
                onClick={() => onOpenDetail(post)}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm font-semibold text-white/50 hover:bg-white/[0.08] hover:text-white/80"
              >
                <i className="far fa-comment" />
                {commentsCount}
              </button>

              {isOwner && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => setIsEditing(true)}
                    aria-label="Edit postingan"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/30 hover:bg-white/[0.08] hover:text-white"
                  >
                    <i className="fas fa-pen text-xs" />
                  </button>
                  <button
                    onClick={() => onDelete(post.post_id)}
                    aria-label="Hapus postingan"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-white/30 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <i className="fas fa-trash text-xs" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostCard;