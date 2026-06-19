import { useEffect, useState } from 'react';
import CommentThread from './CommentThread';

const avatarFallback = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=1f2937&color=fff`;

const PostDetailModal = ({
  post,
  commentTree,
  currentUserId,
  onClose,
  onReact,
  onAddComment,
  onVoteComment,
  onEditComment,
  onDeleteComment,
  onOpenProfile,
}) => {
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Normalisasi data dari endpoint baru (author_name & author_avatar berada di level root)
  const author = post.author ?? {
    username: post.author_name,
    profile_picture: post.author_avatar
  };

  // Normalisasi userReaction (cek apakah currentUserId ada di array likes/dislikes backend)
  let userReaction = post.userReaction;
  if (!userReaction && currentUserId) {
    if (Array.isArray(post.likes) && post.likes.includes(currentUserId)) userReaction = 'like';
    else if (Array.isArray(post.dislikes) && post.dislikes.includes(currentUserId)) userReaction = 'dislike';
  }

  // Hitung jumlah like, dislike yang mendukung struktur array backend
  const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes ?? 0);
  const dislikesCount = Array.isArray(post.dislikes) ? post.dislikes.length : (post.dislikes ?? 0);

  const submitComment = () => {
    const text = newComment.trim();
    if (!text) return;
    onAddComment(post.post_id, null, text); // parent_comment_id null = top-level
    setNewComment('');
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0e0e18] shadow-2xl">

        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 shrink-0">
          <h3 className="text-base font-black text-white">Postingan</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/[0.08] hover:text-white"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {/* Postingan utama */}
          <div className="flex gap-3 border-b border-white/10 pb-5">
            <button onClick={() => onOpenProfile(post.user_id)} className="shrink-0">
              <img
                src={author.profile_picture || avatarFallback(author.username)}
                alt={author.username}
                className="h-11 w-11 rounded-full object-cover"
              />
            </button>
            <div className="flex-1">
              <button onClick={() => onOpenProfile(post.user_id)} className="font-bold text-white hover:underline">
                {author.username || 'Anonim'}
              </button>
              <p className="mt-1 text-[15px] leading-relaxed text-white/85">{post.content}</p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => onReact(post.post_id, 'like')}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
                    userReaction === 'like'
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  <i className={`${userReaction === 'like' ? 'fas' : 'far'} fa-thumbs-up`} /> {likesCount}
                </button>
                <button
                  onClick={() => onReact(post.post_id, 'dislike')}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all ${
                    userReaction === 'dislike'
                      ? 'border-rose-400/50 bg-rose-500/15 text-rose-300'
                      : 'border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.08]'
                  }`}
                >
                  <i className={`${userReaction === 'dislike' ? 'fas' : 'far'} fa-thumbs-down`} /> {dislikesCount}
                </button>
              </div>
            </div>
          </div>

          {/* Daftar komentar nested */}
          <div className="mt-2">
            <h4 className="mb-2 text-sm font-bold text-white/70">
              {commentTree.length} komentar
            </h4>
            {commentTree.length > 0 ? (
              commentTree.map((comment) => (
                <CommentThread
                  key={comment.comment_id}
                  comment={comment}
                  depth={0}
                  currentUserId={currentUserId}
                  onReply={(parentId, text) => onAddComment(post.post_id, parentId, text)}
                  onVote={onVoteComment}
                  onEdit={onEditComment}
                  onDelete={onDeleteComment}
                />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-white/30">
                Belum ada komentar. Jadilah yang pertama membalas!
              </p>
            )}
          </div>
        </div>

        {/* Input komentar baru */}
        <div className="border-t border-white/10 p-4 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Tulis komentar..."
              className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-indigo-500/40"
            />
            <button
              onClick={submitComment}
              disabled={!newComment.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40"
            >
              <i className="fas fa-paper-plane text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;