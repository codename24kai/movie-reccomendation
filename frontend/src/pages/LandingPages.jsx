import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import MovieCard from '../components/MovieCard';

// ── Data statis ulasan & aktivitas (mock) ─────────────────────────────────────
const MOCK_REVIEWS = [
  {
    avatar: 'RA', color: 'bg-indigo-500/30 text-indigo-300',
    name: 'Rizky A.', rating: 5,
    movie: 'Interstellar',
    text: 'Film yang benar-benar mengubah cara saya memandang ruang dan waktu. Sinematografinya luar biasa.',
    time: '2 jam lalu',
  },
  {
    avatar: 'DN', color: 'bg-pink-500/30 text-pink-300',
    name: 'Dina N.', rating: 4,
    movie: 'Parasite',
    text: 'Bong Joon-ho jenius. Setiap adegan punya makna tersembunyi yang baru terasa setelah film selesai.',
    time: '5 jam lalu',
  },
  {
    avatar: 'FH', color: 'bg-teal-500/30 text-teal-300',
    name: 'Farhan H.', rating: 5,
    movie: 'Oppenheimer',
    text: 'Nolan berhasil membuat film sejarah terasa seperti thriller psikologis. 3 jam terasa seperti 30 menit.',
    time: '1 hari lalu',
  },
];

const MOCK_ACTIVITY = [
  { avatar: 'SR', color: 'bg-amber-500/30 text-amber-300', name: 'Sari R.', action: 'menambahkan ke Watchlist', movie: 'Dune: Part Two', time: '10 mnt lalu' },
  { avatar: 'BW', color: 'bg-violet-500/30 text-violet-300', name: 'Budi W.', action: 'memberi rating ★ 4.5', movie: 'The Dark Knight', time: '32 mnt lalu' },
  { avatar: 'AN', color: 'bg-emerald-500/30 text-emerald-300', name: 'Anisa N.', action: 'menandai sebagai ditonton', movie: 'Inception', time: '1 jam lalu' },
  { avatar: 'MR', color: 'bg-rose-500/30 text-rose-300', name: 'Marco R.', action: 'memulai diskusi', movie: 'Blade Runner 2049', time: '2 jam lalu' },
];

const MOCK_FORUM = [
  { title: 'Film sci-fi terbaik dekade ini menurut kalian?', replies: 42, movie: 'General · Sci-Fi', hot: true },
  { title: 'Ending Oppenheimer: apa yang sebenarnya terjadi?', replies: 28, movie: 'Oppenheimer', hot: true },
  { title: 'Rekomendasi film noir yang underrated', replies: 17, movie: 'General · Noir', hot: false },
  { title: 'Director spotlight: Wes Anderson — suka atau tidak suka?', replies: 35, movie: 'General · Director', hot: false },
];

// ── Poster grid dengan animasi scroll ─────────────────────────────────────────
const POSTER_COLORS = [
  'rgba(99,102,241,0.35)',
  'rgba(139,92,246,0.25)',
  'rgba(167,139,250,0.2)',
  'rgba(236,72,153,0.2)',
  'rgba(20,184,166,0.2)',
  'rgba(245,158,11,0.18)',
];

const PosterColumn = ({ offset, duration, colorOffset }) => {
  const items = Array.from({ length: 8 });
  return (
    <div className="flex flex-col gap-2 animate-none" style={{
      animation: `scrollUp ${duration}s linear infinite`,
      marginTop: offset,
    }}>
      {/* Duplikasi untuk efek seamless loop */}
      {[...items, ...items].map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/[0.08] shrink-0 w-full"
          style={{
            aspectRatio: '2/3',
            background: POSTER_COLORS[(i + colorOffset) % POSTER_COLORS.length],
          }}
        />
      ))}
    </div>
  );
};

const PosterGrid = () => (
  <>
    <style>{`
      @keyframes scrollUp {
        from { transform: translateY(0); }
        to   { transform: translateY(-50%); }
      }
    `}</style>
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.18]"
      style={{ transform: 'skewY(-2deg) scale(1.1)' }}
      aria-hidden="true"
    >
      <div className="grid h-full gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        <PosterColumn offset="0px"    duration={18} colorOffset={0} />
        <PosterColumn offset="-60px"  duration={22} colorOffset={1} />
        <PosterColumn offset="-20px"  duration={16} colorOffset={2} />
        <PosterColumn offset="-80px"  duration={20} colorOffset={3} />
        <PosterColumn offset="-40px"  duration={24} colorOffset={4} />
        <PosterColumn offset="-10px"  duration={19} colorOffset={5} />
        <PosterColumn offset="-50px"  duration={21} colorOffset={0} />
      </div>
    </div>
  </>
);

// ── Stats bar ─────────────────────────────────────────────────────────────────
const StatsBar = () => {
  const stats = [
    { num: '10.000+', label: 'Film tersedia' },
    { num: '2',       label: 'Metode rekomendasi ML' },
    { num: '∞',       label: 'Penemuan baru tiap minggu' },
    { num: '100%',    label: 'Gratis untuk digunakan' },
  ];
  return (
    <div className="flex justify-center border-t border-b border-white/[0.05] bg-white/[0.02]">
      {stats.map((s, i) => (
        <div key={i} className="flex-1 text-center py-7 px-6 border-r border-white/[0.07] last:border-r-0">
          <div className="text-2xl font-extrabold text-indigo-400 tracking-tight">{s.num}</div>
          <div className="text-xs text-white/40 mt-1 tracking-wide">{s.label}</div>
        </div>
      ))}
    </div>
  );
};

// ── Star display ──────────────────────────────────────────────────────────────
const Stars = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(s => (
      <i key={s} className={`fas fa-star text-[10px] ${s <= rating ? 'text-amber-400' : 'text-white/10'}`} />
    ))}
  </div>
);

// ── Social proof avatars ──────────────────────────────────────────────────────
const SocialProof = () => {
  const avatars = [
    { initials: 'AR', color: 'bg-indigo-500/40 text-indigo-300' },
    { initials: 'DN', color: 'bg-pink-500/40 text-pink-300' },
    { initials: 'FH', color: 'bg-teal-500/40 text-teal-300' },
    { initials: 'SR', color: 'bg-amber-500/40 text-amber-300' },
  ];
  return (
    <div className="flex items-center justify-center gap-2 mt-5 text-xs text-white/40">
      <div className="flex">
        {avatars.map((av, i) => (
          <div key={i} className={`w-7 h-7 rounded-full border-2 border-[#080810]
                                   flex items-center justify-center text-[10px] font-bold ${av.color}`}
               style={{ marginLeft: i === 0 ? 0 : -8 }}>
            {av.initials}
          </div>
        ))}
      </div>
      <span>Bergabung dengan pengguna yang sudah menikmati rekomendasi personal</span>
    </div>
  );
};

// ── MAIN ─────────────────────────────────────────────────────────────────────
const LandingPage = () => {
  const { user } = useContext(AuthContext);
  const [previewMovies, setPreviewMovies] = useState([]);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/movies/preview');
        const data = await res.json();
        if (data.status === 'ok') setPreviewMovies(data.movies);
      } catch (err) {
        console.error('Gagal memuat preview film:', err);
      }
    };
    fetchPreview();
  }, []);

  return (
    <div className="min-h-screen bg-[#080810] text-white font-sans selection:bg-indigo-500 selection:text-white">

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-8 md:px-12 h-16
                      bg-[#080810]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/logo.png"
            alt="MovieHub logo"
            className="h-24 w-24 object-contain"
          />
        </div>
        <div className="flex items-center gap-1">
          <Link to="/catalog" className="px-4 py-2 rounded-lg text-sm font-medium text-white/60
                                         hover:text-white hover:bg-white/[0.07] transition-all">
            Jelajahi
          </Link>
          {user ? (
            <Link to="/home" className="ml-2 px-4 py-2 rounded-lg text-sm font-semibold
                                        bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 rounded-lg text-sm font-medium text-white/60
                                           hover:text-white hover:bg-white/[0.07] transition-all">
                Masuk
              </Link>
              <Link to="/register" className="ml-1 px-5 py-2 rounded-lg text-sm font-semibold
                                              bg-indigo-600 hover:bg-indigo-500 text-white transition-all
                                              shadow-lg shadow-indigo-500/20">
                Daftar Gratis
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex items-center justify-center overflow-hidden
                           min-h-[600px] px-8 pt-20 pb-16 text-center">
        <PosterGrid />
        <div className="absolute inset-0 bg-gradient-to-b
                        from-[#080810]/60 via-[#080810]/30 to-[#080810]/90" />
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-black leading-[1.05] tracking-tight mb-5">
            Film Sempurna untuk{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              Malam Ini
            </span>
            <br />Ada di Sini
          </h1>
          <p className="text-lg text-white/50 leading-relaxed mb-9 max-w-lg mx-auto">
            Sistem rekomendasi yang belajar dari seleramu — semakin sering digunakan,
            semakin akurat rekomendasinya.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={user ? '/home' : '/register'}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5
                         rounded-xl text-[15px] font-bold bg-indigo-600 text-white
                         hover:bg-indigo-500 transition-all
                         hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30">
              Mulai Sekarang — Gratis <span>→</span>
            </Link>
            <Link to="/catalog"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5
                         rounded-xl text-[15px] font-medium text-white/75
                         bg-white/[0.07] border border-white/10
                         hover:bg-white/[0.12] hover:text-white transition-all">
              Lihat Koleksi
            </Link>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <StatsBar />

      {/* ── PREVIEW KATALOG ── */}
      <section className="px-8 md:px-12 py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-400 mb-2">Koleksi Film</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Ribuan Pilihan Menunggumu</h2>
            <p className="text-sm text-white/40 mt-1">Daftar untuk melihat semua koleksi & rekomendasi personal.</p>
          </div>
          <Link to="/register" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300
                                          flex items-center gap-1 transition-colors shrink-0 mb-1">
            Lihat semua <span>→</span>
          </Link>
        </div>
        {previewMovies.length > 0 ? (
          <div className="relative">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {previewMovies.map((movie) => (
                <MovieCard key={movie.movieId ?? movie.movie_id} movie={movie} />
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-28
                            bg-gradient-to-t from-[#080810] to-transparent pointer-events-none z-10" />
          </div>
        ) : (
          <div className="text-center text-white/30 py-16 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center">
              <i className="fas fa-spinner fa-spin text-lg" />
            </div>
            <p className="text-sm">Memuat koleksi film...</p>
          </div>
        )}
      </section>

      {/* ── FITUR UTAMA (bento grid) ── */}
      <section className="px-8 md:px-12 py-16 border-t border-white/[0.05] bg-white/[0.015]">
        <div className="mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-indigo-400 mb-2">Fitur</p>
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">Semua yang Kamu Butuhkan</h2>
          <p className="text-sm text-white/40">Dari tracking tontonan sampai diskusi komunitas — semuanya ada di satu tempat.</p>
        </div>

        {/* Bento grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Card 1 — Watchlist (large) */}
          <div className="lg:col-span-2 p-7 rounded-2xl bg-white/[0.03] border border-white/[0.07]
                          hover:border-indigo-500/20 hover:bg-white/[0.05] transition-all group">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg mb-5">
              📌
            </div>
            <h3 className="text-base font-bold text-white mb-2">Watchlist & Koleksi Tontonan</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-5">
              Simpan film yang ingin ditonton, tandai yang sudah selesai, dan bangun koleksi
              riwayat tontonanmu. Tidak ada lagi film yang terlupakan.
            </p>
            {/* Mini preview watchlist */}
            <div className="space-y-2">
              {[
                { title: 'The Grand Budapest Hotel', status: 'Ditonton', color: 'text-emerald-400 bg-emerald-500/10' },
                { title: 'Blade Runner 2049',         status: 'Ingin Ditonton', color: 'text-indigo-400 bg-indigo-500/10' },
                { title: 'Everything Everywhere',    status: 'Sedang Ditonton', color: 'text-amber-400 bg-amber-500/10' },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between
                                                  bg-white/[0.03] border border-white/[0.06]
                                                  px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <i className="fas fa-film text-white/20 text-xs" />
                    <span className="text-xs text-white/70 font-medium">{item.title}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${item.color}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 — Forum */}
          <div className="p-7 rounded-2xl bg-white/[0.03] border border-white/[0.07]
                          hover:border-violet-500/20 hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-lg mb-5">
              💬
            </div>
            <h3 className="text-base font-bold text-white mb-2">Forum Diskusi</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-4">
              Bahas teori, rekomendasikan film, atau sekadar ngobrol soal film favorit bersama komunitas.
            </p>
            <div className="space-y-2">
              {MOCK_FORUM.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg
                                        bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 font-medium line-clamp-1">{f.title}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{f.replies} balasan</p>
                  </div>
                  {f.hot && (
                    <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10
                                     px-1.5 py-0.5 rounded shrink-0 mt-0.5">HOT</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card 3 — Rating & Ulasan */}
          <div className="p-7 rounded-2xl bg-white/[0.03] border border-white/[0.07]
                          hover:border-amber-500/20 hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-lg mb-5">
              ⭐
            </div>
            <h3 className="text-base font-bold text-white mb-2">Rating & Ulasan</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-4">
              Berikan rating bintang dan tulis ulasanmu. Setiap rating juga meningkatkan akurasi rekomendasimu.
            </p>
            <div className="flex items-center gap-1 mb-1">
              <Stars rating={5} />
              <span className="text-xs text-white/30 ml-1">· The Dark Knight</span>
            </div>
            <div className="flex items-center gap-1">
              <Stars rating={4} />
              <span className="text-xs text-white/30 ml-1">· Parasite</span>
            </div>
          </div>

          {/* Card 5 — Statistik */}
          <div className="p-7 rounded-2xl bg-white/[0.03] border border-white/[0.07]
                          hover:border-green-500/20 hover:bg-white/[0.05] transition-all">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-lg mb-5">
              📊
            </div>
            <h3 className="text-base font-bold text-white mb-2">Statistik Tontonan</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-4">
              Lihat berapa film yang sudah ditonton, genre favorit, dan tren seleramu dari waktu ke waktu.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { num: '128', label: 'Ditonton' },
                { num: '4.2', label: 'Rata-rata' },
                { num: '7',   label: 'Genre' },
              ].map((s) => (
                <div key={s.label} className="text-center px-2 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <p className="text-sm font-extrabold text-white">{s.num}</p>
                  <p className="text-[9px] text-white/30 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── ULASAN KOMUNITAS ── */}
      <section className="px-8 md:px-12 py-16 border-t border-white/[0.05]">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-pink-400 mb-2">Komunitas</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Apa Kata Mereka</h2>
            <p className="text-sm text-white/40 mt-1">Ulasan jujur dari pengguna MovieHub.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {MOCK_REVIEWS.map((r, i) => (
            <div key={i} className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.07]
                                    hover:border-white/[0.12] transition-all flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                   text-[11px] font-bold shrink-0 ${r.color}`}>
                    {r.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{r.name}</p>
                    <p className="text-[10px] text-white/30">{r.time}</p>
                  </div>
                </div>
                <Stars rating={r.rating} />
              </div>
              {/* Movie label */}
              <div className="flex items-center gap-1.5">
                <i className="fas fa-film text-[10px] text-white/20" />
                <span className="text-[11px] text-indigo-400 font-semibold">{r.movie}</span>
              </div>
              {/* Teks ulasan */}
              <p className="text-xs text-white/50 leading-relaxed flex-1">"{r.text}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AKTIVITAS KOMUNITAS ── */}
      <section className="px-8 md:px-12 py-16 border-t border-white/[0.05] bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-violet-400 mb-2">Live Feed</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Sedang Terjadi Sekarang</h2>
            <p className="text-sm text-white/40 mt-1">Aktivitas terbaru dari komunitas MovieHub.</p>
          </div>
          <div className="space-y-2">
            {MOCK_ACTIVITY.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl
                                      bg-white/[0.03] border border-white/[0.06]
                                      hover:border-white/[0.1] transition-all">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center
                                 text-[11px] font-bold shrink-0 ${a.color}`}>
                  {a.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70">
                    <span className="font-bold text-white/90">{a.name}</span>
                    {' '}{a.action}{' '}
                    <span className="text-indigo-400 font-semibold">{a.movie}</span>
                  </p>
                </div>
                <span className="text-[10px] text-white/25 shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORUM PREVIEW ── */}
      <section className="px-8 md:px-12 py-16 border-t border-white/[0.05]">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-violet-400 mb-2">Forum</p>
            <h2 className="text-2xl font-extrabold tracking-tight">Diskusi Terpopuler</h2>
            <p className="text-sm text-white/40 mt-1">Gabung dan ikut ngobrol soal film favoritmu.</p>
          </div>
          <Link to="/register" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300
                                          flex items-center gap-1 transition-colors shrink-0 mb-1">
            Lihat semua <span>→</span>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {MOCK_FORUM.map((f, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 rounded-xl
                                    bg-white/[0.03] border border-white/[0.07]
                                    hover:border-violet-500/20 hover:bg-white/[0.05]
                                    transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <i className="fas fa-comments text-violet-400 text-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/80 group-hover:text-white
                               transition-colors line-clamp-2 leading-snug mb-1.5">
                  {f.title}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/30">{f.replies} balasan</span>
                  <span className="text-[11px] text-white/20">·</span>
                  <span className="text-[11px] text-white/30">{f.movie}</span>
                  {f.hot && (
                    <span className="text-[9px] font-bold text-orange-400 bg-orange-500/10
                                     px-1.5 py-0.5 rounded">HOT</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="px-8 py-20 text-center border-t border-white/[0.05]">
        <h2 className="text-4xl font-black tracking-tight mb-3">
          Mulai Temukan Film<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
            Favoritmu Hari Ini
          </span>
        </h2>
        <p className="text-sm text-white/40 mb-8">
          Gratis selamanya. Tidak perlu kartu kredit. Cukup daftar dan mulai jelajahi.
        </p>
        <Link to={user ? '/home' : '/register'}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl
                     text-[15px] font-bold bg-indigo-600 text-white
                     hover:bg-indigo-500 transition-all
                     hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30">
          Buat Akun Gratis →
        </Link>
        <SocialProof />
      </section>
    </div>
  );
};

export default LandingPage;