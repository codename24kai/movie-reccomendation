// ════════════════════════════════════════════════════════════════
//  DATA DUMMY — Community Forum Redesign
//  File ini menyediakan data palsu yang merepresentasikan struktur
//  yang nantinya akan datang dari backend (app.py). Setelah backend
//  endpoint terkait selesai dibuat, ganti fungsi-fungsi fetch* di
//  Community.jsx dengan fetch() asli — bentuk datanya sudah dirancang
//  supaya transisinya mulus.
// ════════════════════════════════════════════════════════════════

// ── Pengguna dummy ──────────────────────────────────────────────
export const DUMMY_USERS = [
  { user_id: 1003, username: 'salmanmf', profile_picture: 'https://ui-avatars.com/api/?name=salmanmf&background=6366f1&color=fff', bio: 'Penyuka film noir dan sci-fi klasik.', total_reviews: 12, total_threads: 8, followers: 134, following: 87 },
  { user_id: 1010, username: 'rizkypratama', profile_picture: 'https://ui-avatars.com/api/?name=rizky&background=ec4899&color=fff', bio: 'Kalau bukan A24, ngapain nonton.', total_reviews: 34, total_threads: 21, followers: 412, following: 56 },
  { user_id: 1021, username: 'dinanurul', profile_picture: 'https://ui-avatars.com/api/?name=dina&background=14b8a6&color=fff', bio: 'Mengoleksi soundtrack film lebih dari posternya.', total_reviews: 19, total_threads: 5, followers: 98, following: 120 },
  { user_id: 1034, username: 'farhanhakim', profile_picture: 'https://ui-avatars.com/api/?name=farhan&background=f59e0b&color=fff', bio: 'Nolan apologist. Will defend Tenet to the death.', total_reviews: 27, total_threads: 14, followers: 256, following: 43 },
  { user_id: 1045, username: 'saridewi', profile_picture: 'https://ui-avatars.com/api/?name=sari&background=8b5cf6&color=fff', bio: 'K-drama dan K-movie enthusiast.', total_reviews: 41, total_threads: 9, followers: 189, following: 95 },
];

// ── Film dummy untuk mention/review/polling ─────────────────────
export const DUMMY_MOVIES = [
  { movie_id: 157336, title: 'Interstellar', year: 2014, poster_url: 'https://image.tmdb.org/t/p/w200/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg' },
  { movie_id: 27205, title: 'Inception', year: 2010, poster_url: 'https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg' },
  { movie_id: 872585, title: 'Oppenheimer', year: 2023, poster_url: 'https://image.tmdb.org/t/p/w200/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg' },
  { movie_id: 496243, title: 'Parasite', year: 2019, poster_url: 'https://image.tmdb.org/t/p/w200/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg' },
  { movie_id: 335984, title: 'Blade Runner 2049', year: 2017, poster_url: 'https://image.tmdb.org/t/p/w200/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg' },
  { movie_id: 438148, title: 'Tenet', year: 2020, poster_url: 'https://image.tmdb.org/t/p/w200/aCIFEiLP1pTfyyibhmU3GR0Pp7E.jpg' },
];

const findMovie = (id) => DUMMY_MOVIES.find((m) => m.movie_id === id);
const findUser = (id) => DUMMY_USERS.find((u) => u.user_id === id);

// ── Helper bangun komentar nested (unlimited depth) ──────────────
// Struktur flat dengan parent_comment_id null untuk top-level,
// nantinya dari backend juga flat lalu disusun jadi tree di frontend
// (lihat fungsi buildCommentTree di Community.jsx).
let commentCounter = 0;
const mkComment = (userId, content, parentId = null, votesUp = 0, votesDown = 0) => {
  commentCounter += 1;
  return {
    comment_id: `c${commentCounter}`,
    parent_comment_id: parentId,
    user_id: userId,
    content,
    upvotes: votesUp,
    downvotes: votesDown,
    created_at: new Date(Date.now() - commentCounter * 1000 * 60 * 17).toISOString(),
  };
};

export const DUMMY_COMMENTS = [
  // Komentar untuk thread t1
  mkComment(1010, 'Setuju banget, scene tesseract itu salah satu adegan paling emosional di sci-fi.', null, 14, 0),
  mkComment(1021, 'Tapi menurutku part dokter dengan robotnya kurang dieksplor.', 'c1', 5, 1),
  mkComment(1034, 'Itu justru yang bikin TARS jadi karakter pendukung terbaik, bukan utama.', 'c2', 8, 0),
  mkComment(1045, 'TARS emang MVP. Komentarnya sarkastik tapi tepat waktu terus.', 'c3', 3, 0),
  mkComment(1003, 'Kalau dipikir lagi, soundtrack Hans Zimmer juga jadi karakter tersendiri.', null, 9, 0),
];

// ── Postingan dummy: tiga tipe (discussion, review, poll) ────────
export const DUMMY_POSTS = [
  {
    post_id: 'p1',
    type: 'discussion',
    user_id: 1010,
    content: 'Menurut kalian, apakah Interstellar masih jadi film sci-fi terbaik dekade ini atau sudah ada yang menggantikan?',
    created_at: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
    likes: 24,
    dislikes: 2,
    comment_ids: ['c1', 'c2', 'c3', 'c4', 'c5'],
    edited: false,
  },
  {
    post_id: 'p2',
    type: 'review',
    user_id: 1034,
    content: 'Oppenheimer bukan cuma film biografi — ini studi karakter tentang rasa bersalah yang dibungkus skala epik. Cillian Murphy seharusnya menang Oscar di tahun manapun selain ini.',
    movie_id: 872585,
    rating: 4.5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    likes: 56,
    dislikes: 3,
    comment_ids: [],
    edited: false,
  },
  {
    post_id: 'p3',
    type: 'poll',
    user_id: 1045,
    content: 'Film Nolan terbaik menurut kalian?',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    poll_options: [
      { option_id: 'o1', movie_id: 157336, votes: 142 },
      { option_id: 'o2', movie_id: 27205, votes: 98 },
      { option_id: 'o3', movie_id: 872585, votes: 167 },
      { option_id: 'o4', movie_id: 438148, votes: 31 },
    ],
    voted_option_id: null, // diisi 'o1'/'o2'/dst kalau current user sudah vote
    likes: 31,
    dislikes: 1,
    comment_ids: [],
    edited: false,
  },
  {
    post_id: 'p4',
    type: 'discussion',
    user_id: 1021,
    content: 'Soundtrack film yang menurut kalian lebih bagus dari filmnya sendiri? Buat aku, Arrival.',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    likes: 18,
    dislikes: 0,
    comment_ids: [],
    edited: true,
  },
  {
    post_id: 'p5',
    type: 'review',
    user_id: 1003,
    content: 'Rewatch Blade Runner 2049 di bioskop IMAX dan baru ngerti kenapa orang-orang obsesi sama sinematografi Deakins. Setiap frame bisa jadi wallpaper.',
    movie_id: 335984,
    rating: 5,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    likes: 67,
    dislikes: 1,
    comment_ids: [],
    edited: false,
  },
];

// ── Reaksi user terhadap post (like/dislike) — simulasi state lokal ──
// Backend nantinya: collection "post_reactions" { user_id, post_id, reaction: 'like'|'dislike' }
export const DUMMY_REACTIONS = {
  // 'p1-1003': 'like'
};

// ── Follow graph dummy ────────────────────────────────────────────
// Backend nantinya: collection "follows" { follower_id, following_id }
export const DUMMY_FOLLOWS = [
  { follower_id: 1003, following_id: 1010 },
  { follower_id: 1003, following_id: 1034 },
  { follower_id: 1010, following_id: 1003 },
  { follower_id: 1021, following_id: 1003 },
];

export const enrichPost = (post) => ({
  ...post,
  author: findUser(post.user_id) ?? { username: 'Anonim', profile_picture: '' },
  taggedMovie: post.movie_id ? findMovie(post.movie_id) : null,
  pollOptions: post.poll_options
    ? post.poll_options.map((opt) => ({ ...opt, movie: findMovie(opt.movie_id) }))
    : null,
});

export const enrichComment = (comment) => ({
  ...comment,
  author: findUser(comment.user_id) ?? { username: 'Anonim', profile_picture: '' },
});

export { findMovie, findUser };