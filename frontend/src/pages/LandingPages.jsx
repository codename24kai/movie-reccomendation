import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import FireflyBackground from '../components/Fireflybackground';

import heroImage1 from '../assets/landing-page/landing-page-1.jpg';
import heroImage2 from '../assets/landing-page/landing-page-2.jpg';
import heroImage3 from '../assets/landing-page/landing-page-3.png';
import heroImage4 from '../assets/landing-page/landing-page-4.jpg';
import heroImage5 from '../assets/landing-page/landing-page-5.jpg';
import heroImage6 from '../assets/landing-page/landing-page-6.jpg';
import heroImage7 from '../assets/landing-page/landing-page-7.jpg';
import heroImage8 from '../assets/landing-page/landing-page-8.jpg';
import heroImage9 from '../assets/landing-page/landing-page-9.jpeg';
import heroImage10 from '../assets/landing-page/landing-page-10.jpg';
import heroImage11 from '../assets/landing-page/landing-page-11.jpg';

import poster1 from '../assets/poster/poster1.jpg';
import poster2 from '../assets/poster/poster2.jpg';
import poster3 from '../assets/poster/poster3.jpg';
import poster4 from '../assets/poster/poster4.jpg';
import poster5 from '../assets/poster/poster5.jpg';
import poster6 from '../assets/poster/poster6.jpg';
import poster7 from '../assets/poster/poster7.jpg';
import poster8 from '../assets/poster/poster8.jpg';
import poster9 from '../assets/poster/poster9.jpg';

// ── Custom count-up hook ─────────────────────────────────────────
const useCountUp = (target, { duration = 2000, startOnView = true } = {}) => {
  const [value, setValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const elementRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!startOnView || hasStarted) return;
    const node = elementRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setHasStarted(true); observer.disconnect(); } },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;
    const startTime = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [hasStarted, target, duration]);

  return { value, elementRef };
};

const formatNumber = (num) => num.toLocaleString('id-ID');

// ── Hero slides ──────────────────────────────────────────────────
const HERO_SLIDES = [
  { image: heroImage1, title: 'Malam ini, temukan film yang terasa dibuat untukmu.', subtitle: 'MovieHub memadukan rekomendasi AI, komunitas aktif, dan koleksi film yang terus bertumbuh.' },
  { image: heroImage2, title: 'Simpan tontonan, tandai yang sudah selesai, lihat progresmu.', subtitle: 'Kelola watchlist dan watched list dalam satu pengalaman yang elegan dan mudah dipakai.' },
  { image: heroImage3, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage4, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage5, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage6, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage7, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage8, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage9, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage10, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
  { image: heroImage11, title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.', subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.' },
];
const SLIDE_DURATION = 4000;

// ── Poster collage ───────────────────────────────────────────────
const POSTERS = [
  { title: 'Poster 1', src: poster1 },
  { title: 'Poster 2', src: poster2 },
  { title: 'Poster 3', src: poster3 },
  { title: 'Poster 4', src: poster4 },
  { title: 'Poster 5', src: poster5 },
  { title: 'Poster 6', src: poster6 },
  { title: 'Poster 7', src: poster7 },
  { title: 'Poster 8', src: poster8 },
  { title: 'Poster 9', src: poster9 },
  { title: 'Poster 1', src: poster1 },
  { title: 'Poster 2', src: poster2 },
];

// ── Stats ────────────────────────────────────────────────────────
const STATS_FALLBACK = { total_movies: 80000, total_users: 5, total_ratings: 12, total_reviews: 4, total_threads: 640 };
const STAT_CONFIG = [
  { key: 'total_movies', label: 'Koleksi Film', suffix: '+', icon: 'fa-film', color: 'from-indigo-500/20 to-indigo-500/5', iconColor: 'text-indigo-300', border: 'border-indigo-500/15' },
  { key: 'total_users', label: 'Pengguna', suffix: '+', icon: 'fa-users', color: 'from-pink-500/20 to-pink-500/5', iconColor: 'text-pink-300', border: 'border-pink-500/15' },
  { key: 'total_ratings', label: 'Total Rating', suffix: '+', icon: 'fa-star', color: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-300', border: 'border-amber-500/15' },
  { key: 'total_reviews', label: 'Total Review', suffix: '+', icon: 'fa-pen', color: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-300', border: 'border-emerald-500/15' },
  { key: 'total_threads', label: 'Total Diskusi', suffix: '+', icon: 'fa-comments', color: 'from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-300', border: 'border-violet-500/15' },
];

// ── PosterTile dengan fallback ───────────────────────────────────
const PosterTile = ({ poster }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/30 bg-[#10101c]">
      {!failed ? (
        <img src={poster.src} alt={poster.title} onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
          <i className="fas fa-film text-2xl text-white/15" />
          <p className="text-[11px] font-semibold text-white/30">{poster.title}</p>
        </div>
      )}
    </div>
  );
};

// ── StatCard ─────────────────────────────────────────────────────
const StatCard = ({ target, label, suffix, delay, icon, color, iconColor, border }) => {
  const { value, elementRef } = useCountUp(target, { duration: 1800 });
  return (
    <div ref={elementRef} data-aos="fade-up" data-aos-delay={delay}
      className={`rounded-[1.5rem] border ${border} bg-gradient-to-b ${color} p-5 text-center backdrop-blur-sm relative overflow-hidden`}>
      <div className={`absolute top-3 right-3 ${iconColor} opacity-20 text-2xl`}>
        <i className={`fas ${icon}`} />
      </div>
      <i className={`fas ${icon} ${iconColor} text-2xl mb-3 block`} />
      <p className="text-3xl font-black text-white">{formatNumber(value)}{suffix}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">{label}</p>
    </div>
  );
};

// ── Cinematic background: kolom poster mengambang ────────────────
const CinematicBackground = () => {
  // Warna gradient film — dipakai sebagai "poster placeholder" yang bergerak
  const FILM_COLORS = [
    'from-indigo-600/40 to-slate-900', 'from-amber-600/40 to-slate-900',
    'from-rose-600/40 to-slate-900', 'from-emerald-600/40 to-slate-900',
    'from-violet-600/40 to-slate-900', 'from-cyan-600/40 to-slate-900',
    'from-orange-600/40 to-slate-900', 'from-pink-600/40 to-slate-900',
    'from-teal-600/40 to-slate-900', 'from-blue-600/40 to-slate-900',
    'from-red-600/40 to-slate-900', 'from-purple-600/40 to-slate-900',
    'from-yellow-600/40 to-slate-900', 'from-sky-600/40 to-slate-900',
    'from-lime-600/40 to-slate-900', 'from-fuchsia-600/40 to-slate-900',
  ];

  // 6 kolom, tiap kolom arah bergantian (atas/bawah), kecepatan berbeda
  const columns = useMemo(() => [
    { dir: 'up', duration: 28, offset: 0, count: 6 },
    { dir: 'down', duration: 22, offset: -40, count: 7 },
    { dir: 'up', duration: 35, offset: -15, count: 6 },
    { dir: 'down', duration: 25, offset: -55, count: 7 },
    { dir: 'up', duration: 30, offset: -25, count: 6 },
    { dir: 'down', duration: 20, offset: -10, count: 7 },
  ], []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-20 overflow-hidden"
    >
      <style>{`
        @keyframes scroll-up {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        @keyframes scroll-down {
          from { transform: translateY(-50%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Overlay gelap kuat supaya poster tidak terlalu dominan */}
      <div className="absolute inset-0 bg-[#080810]/82 z-10" />

      {/* Grid kolom poster */}
      <div className="absolute inset-0 grid gap-2 opacity-50"
        style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {columns.map((col, ci) => {
          const animName = col.dir === 'up' ? 'scroll-up' : 'scroll-down';
          return (
            <div
              key={ci}
              className="flex flex-col gap-2"
              style={{ marginTop: `${col.offset}px` }}
            >
              {/* Duplikasi 2x untuk seamless loop */}
              {[0, 1].map((dup) => (
                <div
                  key={dup}
                  className="flex flex-col gap-2"
                  style={{
                    animation: `${animName} ${col.duration}s linear infinite`,
                  }}
                >
                  {Array.from({ length: col.count }).map((_, ri) => {
                    const colorIdx = (ci * 3 + ri * 2 + dup) % FILM_COLORS.length;
                    return (
                      <div
                        key={ri}
                        className={`shrink-0 rounded-lg border border-white/[0.06] bg-gradient-to-b ${FILM_COLORS[colorIdx]}`}
                        style={{ aspectRatio: '2/3', width: '100%' }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Section wrapper dengan dekorasi berbeda per section ──────────
const SectionShell = ({ children, gradient, reverse = false, aosDelay = 0, accentColor = 'indigo', glowPos = 'top-right' }) => {
  const glowMap = {
    'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
    'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
    'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
  };
  const glowColorMap = {
    indigo: 'bg-indigo-500/20',
    pink: 'bg-pink-500/20',
    violet: 'bg-violet-500/20',
  };

  return (
    <section
      data-aos="fade-up"
      data-aos-delay={aosDelay}
      className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${gradient} p-6 md:p-10 backdrop-blur-sm`}
    >
      {/* Glow dekoratif di sudut section */}
      <div className={`absolute ${glowMap[glowPos]} w-64 h-64 rounded-full blur-3xl pointer-events-none ${glowColorMap[accentColor] ?? 'bg-indigo-500/20'}`} />
      {/* Garis aksen atas tipis */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className={`relative z-10 grid gap-10 items-center ${reverse ? 'lg:grid-cols-[0.9fr_1.1fr]' : 'lg:grid-cols-[1.1fr_0.9fr]'}`}>
        {children}
      </div>
    </section>
  );
};

// ── Placeholder ilustrasi dengan orb glow ───────────────────────
const IllustrationPlaceholder = ({ icon, color, label, glowColor }) => (
  <div className="relative flex h-72 w-full max-w-md items-center justify-center rounded-[2rem] border border-white/[0.08] bg-black/20 mx-auto overflow-hidden">
    {/* Lingkaran glow di tengah */}
    <div className={`absolute inset-0 flex items-center justify-center`}>
      <div className={`h-40 w-40 rounded-full blur-3xl ${glowColor} opacity-40`} />
    </div>
    {/* Ring dekoratif */}
    <div className="absolute inset-4 rounded-[1.5rem] border border-white/[0.05]" />
    <div className="absolute inset-8 rounded-[1.25rem] border border-white/[0.03]" />
    {/* Konten tengah */}
    <div className="relative text-center px-6 z-10">
      <i className={`fas ${icon} text-5xl ${color} mb-4 block`} />
      <p className="text-xs text-white/30 font-medium">{label}</p>
    </div>
    {/* Dots dekoratif sudut */}
    {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-bottom-1 -right-1'].map((pos) => (
      <div key={pos} className={`absolute ${pos} w-6 h-6 rounded-full border border-white/[0.08] bg-white/[0.02]`} />
    ))}
  </div>
);

// ════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
const LandingPages = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [stats, setStats] = useState(STATS_FALLBACK);
  const slideTimerRef = useRef(null);

  useEffect(() => {
    AOS.init({ duration: 700, once: true, easing: 'ease-out-cubic' });
  }, []);

  useEffect(() => {
    slideTimerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(slideTimerRef.current);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('http://127.0.0.1:5000/stats');
        const data = await res.json();
        if (data.status === 'ok') setStats((prev) => ({ ...prev, ...data }));
      } catch (err) {
        console.warn('Gagal memuat statistik real, memakai data fallback:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="relative isolate min-h-screen bg-[#080810] text-white">
      {/* ── Live backgrounds ── */}
      <CinematicBackground />
      <FireflyBackground />

      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.12) translate(-1%, -1%); }
        }
        .hero-slide-image { animation: kenburns 7s ease-out forwards; }
      `}</style>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#080810]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center text-base shrink-0">
              <img src="/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-indigo-300 leading-none">MovieHub</p>
              <p className="text-[11px] text-white/35 leading-tight">AI movie discovery platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.08] transition-colors">
              Masuk
            </Link>
            <Link to="/register" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">
              Daftar Gratis
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10 space-y-8 md:space-y-10">

        {/* ══ HERO SLIDESHOW ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/[0.08] shadow-2xl shadow-black/50">
          <div className="relative h-[580px] md:h-[640px]">
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={slide.title}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              >
                <div
                  className={`absolute inset-0 bg-cover bg-center ${index === activeSlide ? 'hero-slide-image' : ''}`}
                  style={{ backgroundImage: `url(${slide.image})`, backgroundColor: '#10101c' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-[#080810]/60 to-[#080810]/15" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#080810]/75 via-[#080810]/30 to-transparent" />
              </div>
            ))}

            {/* Teks STATIS — AOS hanya jalan sekali saat mount */}
            <div className="relative z-20 flex h-full flex-col justify-center px-6 md:px-14 max-w-3xl">
              <div
                data-aos="fade-up"
                className="inline-flex items-center gap-2 self-start rounded-full border border-indigo-400/25 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200 mb-6 backdrop-blur-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                MovieHub · AI Powered
              </div>
              <h1
                data-aos="fade-up"
                data-aos-delay="100"
                className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl mb-5"
              >
                {HERO_SLIDES[0].title}
              </h1>
              <p
                data-aos="fade-up"
                data-aos-delay="200"
                className="max-w-xl text-base leading-7 text-white/65 md:text-lg mb-8"
              >
                {HERO_SLIDES[0].subtitle}
              </p>
              <div data-aos="fade-up" data-aos-delay="300" className="flex flex-wrap gap-3">
                <Link to="/login" className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-black transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  Mulai Jelajahi Film <i className="fas fa-arrow-right" />
                </Link>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/[0.1] backdrop-blur-sm">
                  Bergabung Sekarang <i className="fas fa-user-plus" />
                </Link>
              </div>
            </div>

            {/* Progress bar slide bawah */}
            <div className="absolute bottom-0 left-0 right-0 z-20 h-[2px] bg-white/[0.06]">
              <div
                className="h-full bg-indigo-400/60 transition-none"
                style={{
                  width: `${((activeSlide + 1) / HERO_SLIDES.length) * 100}%`,
                  transition: `width ${SLIDE_DURATION}ms linear`,
                }}
              />
            </div>
          </div>
        </section>

        {/* ══ WATCHLIST & WATCHED LIST ════════════════════════════════ */}
        <SectionShell gradient="from-indigo-950/60 via-[#080810]/90 to-[#080810]/80" accentColor="indigo" glowPos="top-right">
          <div className="space-y-5" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-300">
              <i className="fas fa-bookmark text-[10px]" /> Watchlist & Watched List
            </div>
            <h2 className="text-3xl font-black leading-tight md:text-4xl">Simpan tontonan dan lacak progres menontonmu.</h2>
            <p className="max-w-xl text-base leading-7 text-white/60">
              Atur film yang ingin ditonton, tandai yang sudah selesai, dan nikmati pengalaman koleksi film yang terasa personal.
            </p>
            <ul className="space-y-3 text-sm">
              {['Menyimpan film untuk nanti ditonton', 'Menandai film yang sudah selesai', 'Melacak progres menonton pengguna'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/70">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-500/30">
                    <i className="fas fa-check text-indigo-400 text-[9px]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20">
              Coba Fitur Ini <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>
          <div className="flex justify-center" data-aos="fade-left" data-aos-delay="150">
            <IllustrationPlaceholder icon="fa-bookmark" color="text-indigo-300/60" label=" Watchlist" glowColor="bg-indigo-500" />
          </div>
        </SectionShell>

        {/* ══ COMMUNITY DISCUSSION ════════════════════════════════════ */}
        <SectionShell gradient="from-pink-950/50 via-[#080810]/90 to-[#080810]/80" reverse accentColor="pink" glowPos="bottom-left">
          <div className="order-2 lg:order-1 flex justify-center" data-aos="fade-right">
            <IllustrationPlaceholder icon="fa-comments" color="text-pink-300/60" label=" Community" glowColor="bg-pink-500" />
          </div>
          <div className="order-1 space-y-5 lg:order-2" data-aos="fade-left" data-aos-delay="150">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/20 bg-pink-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-pink-300">
              <i className="fas fa-users text-[10px]" /> Community Discussion
            </div>
            <h2 className="text-3xl font-black leading-tight md:text-4xl">Ngobrol film bareng komunitas yang aktif dan hangat.</h2>
            <p className="max-w-xl text-base leading-7 text-white/60">
              Bahas teori, tinggalkan review, balas komentar, dan ikut voting film favoritmu bersama pengguna lain.
            </p>
            <ul className="space-y-3 text-sm">
              {['Diskusi film bersama pengguna lain', 'Membuat review dengan mention film', 'Memberikan komentar dan voting polling'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-white/70">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500/20 border border-pink-500/30">
                    <i className="fas fa-check text-pink-400 text-[9px]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/register" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-pink-600 hover:bg-pink-500 px-5 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-pink-500/20">
              Gabung Komunitas <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>
        </SectionShell>

        {/* ══ AI RECOMMENDATION ══════════════════════════════════════ */}
        <SectionShell gradient="from-violet-950/50 via-[#080810]/90 to-[#080810]/80" accentColor="violet" glowPos="top-left">
          <div className="space-y-5" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-violet-300">
              <i className="fas fa-robot text-[10px]" /> AI Recommendation System
            </div>
            <h2 className="text-3xl font-black leading-tight md:text-4xl">Rekomendasi hybrid yang belajar dari seleramu.</h2>
            <p className="max-w-xl text-base leading-7 text-white/60">
              Sistem ini menggabungkan Matrix Factorization dan Random Forest untuk memberi saran film yang lebih akurat dan relevan dari waktu ke waktu.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm">
              <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.07] px-4 py-3 text-center">
                <i className="fas fa-layer-group text-violet-300 text-lg mb-2 block" />
                <p className="text-[11px] font-bold text-violet-200">Matrix Factorization</p>
                <p className="text-[10px] text-white/30 mt-0.5">User taste</p>
              </div>
              <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.07] px-4 py-3 text-center">
                <i className="fas fa-chart-line text-indigo-300 text-lg mb-2 block" />
                <p className="text-[11px] font-bold text-indigo-200">Random Forest</p>
                <p className="text-[10px] text-white/30 mt-0.5">Context score</p>
              </div>
            </div>
            <Link to="/register" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-sm font-black text-white transition-all hover:-translate-y-0.5 shadow-lg shadow-violet-500/20">
              Mulai Personalisasi <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>
          <div className="flex justify-center" data-aos="fade-left" data-aos-delay="150">
            <IllustrationPlaceholder icon="fa-robot" color="text-violet-300/60" label=" AI Recommendation" glowColor="bg-violet-500" />
          </div>
        </SectionShell>

        {/* ══ STATISTIK ═══════════════════════════════════════════════ */}
        <section data-aos="fade-up" className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-[#080810]/60 px-6 py-10 md:px-10 backdrop-blur-md">
          {/* Dekorasi glow lebar di belakang statistik */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative text-center mb-8">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.35em] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full mb-4">
              MovieHub Statistics
            </span>
            <h2 className="text-3xl font-black md:text-5xl">Skala platform yang menunjukkan kredibilitas.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/55">
              Data berikut diambil langsung dari database MovieHub.
            </p>
          </div>
          <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STAT_CONFIG.map((stat, i) => (
              <StatCard key={stat.key} target={stats[stat.key] ?? 0} label={stat.label}
                suffix={stat.suffix} delay={i * 100} icon={stat.icon}
                color={stat.color} iconColor={stat.iconColor} border={stat.border} />
            ))}
          </div>
        </section>

        {/* ══ POSTER COLLAGE  ══════════════════════════════════ */}
        <section data-aos="fade-up" className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-[#080810]/50 p-6 md:p-10 backdrop-blur-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-400">Koleksi Kurasi</span>
              <h2 className="mt-2 text-2xl font-black md:text-3xl text-white">Temukan film terbaik setiap harinya.</h2>
            </div>
            <Link to="/catalog" className="text-sm font-semibold text-indigo-300 hover:text-white transition-colors flex items-center gap-1">
              Lihat Katalog <i className="fas fa-arrow-right text-xs" />
            </Link>
          </div>

          {/* Grid yang responsif dan estetik */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {POSTERS.map((poster, index) => (
              <div
                key={poster.title}
                className={index >= 5 ? 'hidden lg:block' : ''} // Sembunyikan poster ke-6 dst pada layar kecil agar rapi
              >
                <PosterTile poster={poster} />
              </div>
            ))}
          </div>
        </section>

        {/* ══ CTA PENUTUP ═════════════════════════════════════════════ */}
        <section data-aos="zoom-in"
          className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] px-6 py-16 text-center md:px-10">
          {/* Multi-layer background gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/70 via-[#080810]/80 to-violet-950/50 backdrop-blur-sm" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
          {/* Konten */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] text-indigo-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Gratis Selamanya
            </div>
            <h2 className="text-4xl font-black md:text-5xl mb-4">Mulai perjalanan filmmu di MovieHub</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/55 mb-8">
              Daftar gratis dan rasakan rekomendasi film yang benar-benar memahami seleramu.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-black text-black hover:-translate-y-0.5 hover:shadow-xl transition-all">
                Masuk Sekarang <i className="fas fa-arrow-right" />
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/[0.1] transition-all backdrop-blur-sm">
                Daftar Gratis <i className="fas fa-user-plus" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPages;
