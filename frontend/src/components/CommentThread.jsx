import { useState } from 'react';

const MAX_VISUAL_INDENT = 4;

const timeAgo = (dateString) => {
  if (!dateString) return '';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j`;
  const days = Math.floor(hours / 24);
  return `${days}h`;
};

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=1f2937&color=fff`;

const CommentThread = ({
  comment,
  depth = 0,
  currentUserId,
  onReply,
  onVote,
  onEdit,
  onDelete,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  // Normalisasi data dari endpoint baru
  const author = comment.author ?? {
    username: comment.author_name,
    profile_picture: comment.author_avatar
  };
  
  const isOwner = currentUserId != null && String(currentUserId) === String(comment.user_id);
  const visualDepth = Math.min(depth, MAX_VISUAL_INDENT);
  const hasChildren = Array.isArray(comment.children) && comment.children.length > 0;

  // Normalisasi userReaction & jumlah vote untuk komentar
  let userReaction = comment.userReaction;
  if (!userReaction && currentUserId) {
    if (Array.isArray(comment.likes) && comment.likes.includes(currentUserId)) userReaction = 'like';
    else if (Array.isArray(comment.dislikes) && comment.dislikes.includes(currentUserId)) userReaction = 'dislike';
  }

  const likesCount = Array.isArray(comment.likes) ? comment.likes.length : (comment.likes ?? comment.upvotes ?? 0);
  const dislikesCount = Array.isArray(comment.dislikes) ? comment.dislikes.length : (comment.dislikes ?? comment.downvotes ?? 0);

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    onReply(comment.comment_id, text);
    setReplyText('');
    setIsReplying(false);
  };

  const submitEdit = () => {
    const text = editText.trim();
    if (!text) return;
    onEdit(comment.comment_id, text);
    setIsEditing(false);
  };

  return (
    <div
      className="relative"
      style={{ marginLeft: visualDepth > 0 ? '20px' : '0px' }}
    >
      {/* Garis vertikal penanda thread/kedalaman */}
      {depth > 0 && (
        <div className="absolute -left-[14px] top-0 bottom-0 w-px bg-white/[0.08]" />
      )}

      <div className="flex gap-3 py-3">
        <img
          src={author.profile_picture || avatarFallback(author.username)}
          alt={author.username || 'Anonim'}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold text-white">{author.username || 'Anonim'}</span>
            <span className="text-white/30 text-xs">· {timeAgo(comment.created_at)}</span>
            {comment.updated_at && comment.updated_at !== comment.created_at && <span className="text-white/20 text-[10px]">(diedit)</span>}
          </div>

          {/* Konten — mode edit atau tampil */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[60px] resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none focus:border-indigo-500/40"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitEdit}
                  className="rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Simpan
                </button>
                <button
                  onClick={() => { setIsEditing(false); setEditText(comment.content); }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 hover:bg-white/[0.06]"
                >
                  Batal
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-1 text-[14px] leading-relaxed text-white/80">{comment.content}</p>
          )}

          {/* Interaksi */}
          {!isEditing && (
            <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
              <button
                onClick={() => onVote(comment.comment_id, 'like')}
                className={`inline-flex items-center gap-1.5 transition-colors hover:text-emerald-400 ${userReaction === 'like' ? 'text-emerald-400' : ''}`}
              >
                <i className="fas fa-thumbs-up text-[11px]" /> {likesCount}
              </button>
              <button
                onClick={() => onVote(comment.comment_id, 'dislike')}
                className={`inline-flex items-center gap-1.5 transition-colors hover:text-rose-400 ${userReaction === 'dislike' ? 'text-rose-400' : ''}`}
              >
                <i className="fas fa-thumbs-down text-[11px]" /> {dislikesCount}
              </button>
              <button
                onClick={() => setIsReplying((v) => !v)}
                className="inline-flex items-center gap-1.5 transition-colors hover:text-indigo-400"
              >
                <i className="fas fa-reply text-[11px]" /> Balas
              </button>

              {isOwner && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                  >
                    <i className="fas fa-pen text-[11px]" /> Edit
                  </button>
                  <button
                    onClick={() => onDelete(comment.comment_id)}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-red-400"
                  >
                    <i className="fas fa-trash text-[11px]" /> Hapus
                  </button>
                </>
              )}

              {hasChildren && (
                <button
                  onClick={() => setIsCollapsed((v) => !v)}
                  className="ml-auto inline-flex items-center gap-1.5 text-white/30 hover:text-white/60"
                >
                  <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'} text-[10px]`} />
                  {isCollapsed ? `Lihat ${comment.children.length} balasan` : 'Sembunyikan'}
                </button>
              )}
            </div>
          )}

          {/* Form balas */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitReply()}
                placeholder={`Balas ${author.username || 'komentar ini'}...`}
                autoFocus
                className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-indigo-500/40"
              />
              <button
                onClick={submitReply}
                disabled={!replyText.trim()}
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
              >
                Kirim
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rekursi — render semua children kalau tidak collapsed */}
      {hasChildren && !isCollapsed && (
        <div>
          {comment.children.map((child) => (
            <CommentThread
              key={child.comment_id}
              comment={child}
              depth={depth + 1}
              currentUserId={currentUserId}
              onReply={onReply}
              onVote={onVote}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;