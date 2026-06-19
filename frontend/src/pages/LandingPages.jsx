import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

// Import gambar dari src/assets — wajib pakai import (bukan string path biasa)
// karena file berada di src/, akan diproses bundler (Vite) saat build.
import heroImage1 from '../assets/landing-page/landing-page-1.jpg';
import heroImage2 from '../assets/landing-page/landing-page-2.jpg';
import heroImage3 from '../assets/landing-page/landing-page-3.png';

// ════════════════════════════════════════════════════════════════
//  CUSTOM COUNT-UP HOOK
//  Mengganti react-countup — package tersebut sempat menyebabkan
//  error "Element type is invalid" akibat ketidakcocokan cara
//  import/export pada environment build tertentu. Implementasi
//  manual ini lebih aman karena tidak bergantung pada resolusi
//  module pihak ketiga.
// ════════════════════════════════════════════════════════════════
const useCountUp = (target, { duration = 2000, startOnView = true } = {}) => {
  const [value, setValue] = useState(0);
  const [hasStarted, setHasStarted] = useState(!startOnView);
  const elementRef = useRef(null);
  const frameRef = useRef(null);

  // Mulai animasi saat elemen masuk viewport
  useEffect(() => {
    if (!startOnView || hasStarted) return;
    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [startOnView, hasStarted]);

  // Jalankan animasi counting
  useEffect(() => {
    if (!hasStarted) return;
    const startTime = performance.now();
    const startValue = 0;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // ease-out cubic agar terasa natural, melambat di akhir
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(startValue + (target - startValue) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [hasStarted, target, duration]);

  return { value, elementRef };
};

const formatNumber = (num) => num.toLocaleString('id-ID');

// ════════════════════════════════════════════════════════════════
//  HERO SLIDESHOW DATA
//  GANTI path di bawah dengan gambar landscape film asli kamu.
//  Letakkan file di: public/assets/hero/
// ════════════════════════════════════════════════════════════════
const HERO_SLIDES = [
  {
    image: heroImage1,
    title: 'Malam ini, temukan film yang terasa dibuat untukmu.',
    subtitle: 'MovieHub memadukan rekomendasi AI, komunitas aktif, dan koleksi film yang terus bertumbuh.',
  },
  {
    image: heroImage2,
    title: 'Simpan tontonan, tandai yang sudah selesai, lihat progresmu.',
    subtitle: 'Kelola watchlist dan watched list dalam satu pengalaman yang elegan dan mudah dipakai.',
  },
  {
    image: heroImage3,
    title: 'Diskusi film yang hidup, review yang jujur, voting yang seru.',
    subtitle: 'Bersama komunitas, setiap film bisa punya percakapan yang lebih dalam.',
  },
];

const SLIDE_DURATION = 2000; // 2 detik, sesuai spesifikasi

// ════════════════════════════════════════════════════════════════
//  POSTER COLLAGE — STATIS, TIDAK FETCH DARI BACKEND
//  Tambah/kurangi poster cukup edit array ini, tanpa ubah struktur.
//  Letakkan file di: public/assets/posters/
// ════════════════════════════════════════════════════════════════
const POSTERS = [
  { title: 'Interstellar', src: '/assets/posters/poster1.jpg' },
  { title: 'Dune', src: '/assets/posters/poster2.jpg' },
  { title: 'Oppenheimer', src: '/assets/posters/poster3.jpg' },
  { title: 'Parasite', src: '/assets/posters/poster4.jpg' },
  { title: 'Blade Runner 2049', src: '/assets/posters/poster5.jpg' },
  { title: 'Her', src: '/assets/posters/poster6.jpg' },
  { title: 'Inception', src: '/assets/posters/poster7.jpg' },
  { title: 'Arrival', src: '/assets/posters/poster8.jpg' },
  { title: 'La La Land', src: '/assets/posters/poster9.jpg' },
];

// Fallback kalau file poster belum diisi — tampil sebagai placeholder rapi
// daripada broken image icon.
const PosterTile = ({ poster }) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 shadow-xl shadow-black/30 bg-[#10101c]">
      {!failed ? (
        <img
          src={poster.src}
          alt={poster.title}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
          <i className="fas fa-film text-2xl text-white/15" />
          <p className="text-[11px] font-semibold text-white/30">{poster.title}</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-white/15">Poster belum diisi</p>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
//  STATISTIK — fetch dari backend, fallback ke nilai default
//  kalau endpoint belum tersedia / gagal.
// ════════════════════════════════════════════════════════════════
const STATS_FALLBACK = {
  total_movies: 10000,
  total_users: 1200,
  total_ratings: 8500,
  total_reviews: 2100,
  total_threads: 640,
};

const STAT_CONFIG = [
  { key: 'total_movies', label: 'Total Koleksi Film', suffix: '+' },
  { key: 'total_users', label: 'Total Pengguna', suffix: '+' },
  { key: 'total_ratings', label: 'Total Rating', suffix: '+' },
  { key: 'total_reviews', label: 'Total Review', suffix: '+' },
  { key: 'total_threads', label: 'Total Diskusi', suffix: '+' },
];

// Kartu statistik dengan count-up animation, dipicu saat masuk viewport
const StatCard = ({ target, label, suffix, delay }) => {
  const { value, elementRef } = useCountUp(target, { duration: 1800 });

  return (
    <div
      ref={elementRef}
      data-aos="fade-up"
      data-aos-delay={delay}
      className="rounded-[1.5rem] border border-white/10 bg-black/30 p-5 text-center"
    >
      <p className="text-3xl font-black text-white">
        {formatNumber(value)}{suffix}
      </p>
      <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/40">{label}</p>
    </div>
  );
};

const SectionShell = ({ children, gradient, reverse = false, aosDelay = 0 }) => (
  <section
    data-aos="fade-up"
    data-aos-delay={aosDelay}
    className={`relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${gradient} p-6 md:p-10`}
  >
    <div className={`grid gap-10 items-center ${reverse ? 'lg:grid-cols-[0.9fr_1.1fr]' : 'lg:grid-cols-[1.1fr_0.9fr]'}`}>
      {children}
    </div>
  </section>
);

const LandingPages = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [stats, setStats] = useState(STATS_FALLBACK);
  const slideTimerRef = useRef(null);

  // ── Inisialisasi AOS sekali saat mount ──────────────────────────
  useEffect(() => {
    AOS.init({
      duration: 700,
      once: true,
      easing: 'ease-out-cubic',
    });
  }, []);

  // ── Hero carousel: ganti slide tiap 2 detik ─────────────────────
  useEffect(() => {
    slideTimerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, SLIDE_DURATION);
    return () => clearInterval(slideTimerRef.current);
  }, []);

  // ── Fetch statistik real dari backend ───────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Endpoint ini perlu ditambahkan di backend (app.py) kalau belum ada:
        // GET /stats → { status: 'ok', total_movies, total_users, total_ratings, total_reviews, total_threads }
        const res = await fetch('http://127.0.0.1:5000/stats');
        const data = await res.json();
        if (data.status === 'ok') {
          setStats((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        // Diam-diam pakai fallback — landing page tidak boleh terlihat rusak
        // hanya karena endpoint statistik belum siap.
        console.warn('Gagal memuat statistik real, memakai data fallback:', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <style>{`
        @keyframes kenburns {
          0%   { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.12) translate(-1%, -1%); }
        }
        .hero-slide-image {
          animation: kenburns 7s ease-out forwards;
        }
      `}</style>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#080810]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-300">MovieHub</p>
            <p className="text-sm text-white/40">AI movie discovery platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.08]">
              Masuk
            </Link>
            <Link to="/register" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              Daftar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-10 md:py-10 space-y-8 md:space-y-10">

        {/* ══════════════════ SECTION 1 — HERO SLIDESHOW ══════════════════ */}
        <section className="relative overflow-hidden rounded-[2.25rem] border border-white/10">
          <div className="relative h-[560px] md:h-[620px]">
            {HERO_SLIDES.map((slide, index) => (
              <div
                key={slide.title}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
              >
                {/* Background image dengan Ken Burns effect — hanya animasi saat slide aktif */}
                <div
                  className={`absolute inset-0 bg-cover bg-center ${index === activeSlide ? 'hero-slide-image' : ''}`}
                  style={{ backgroundImage: `url(${slide.image})`, backgroundColor: '#10101c' }}
                />
                {/* Overlay gelap agar teks tetap terbaca */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080810] via-[#080810]/55 to-[#080810]/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#080810]/70 via-transparent to-transparent" />
              </div>
            ))}

            {/*
              FIX: Konten teks sekarang STATIS — tidak lagi mengikuti slide
              gambar yang berganti otomatis di background. Sebelumnya pakai
              key={activeSlide} yang membuat React membongkar-pasang ulang
              elemen ini setiap 2 detik, sehingga AOS ikut re-trigger animasi
              fade-up berulang kali. Sekarang key dihapus sepenuhnya, jadi
              data-aos hanya jalan SEKALI saat halaman pertama dimuat/refresh
              (sesuai cara kerja default AOS dengan once: true), lalu teks
              diam di tempat selama slide gambar berganti di belakangnya.

              Teks yang ditampilkan diambil dari HERO_SLIDES[0] secara
              permanen (judul utama landing page), bukan ikut index slide
              aktif lagi — karena teks tidak lagi disinkronkan ke slide.
            */}
            <div className="relative z-20 flex h-full flex-col justify-center px-6 md:px-12 max-w-3xl">
              <div
                data-aos="fade-up"
                className="inline-flex items-center gap-2 self-start rounded-full border border-indigo-400/20 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200 mb-6"
              >
                <i className="fas fa-film" />
                MovieHub
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

              <div
                data-aos="fade-up"
                data-aos-delay="300"
                className="flex flex-wrap gap-3"
              >
                <Link to="/login" className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-black transition-transform hover:-translate-y-0.5">
                  Mulai Jelajahi Film
                  <i className="fas fa-arrow-right" />
                </Link>
                <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.1]">
                  Bergabung Sekarang
                  <i className="fas fa-user-plus" />
                </Link>
              </div>
            </div>

            {/* FIX: dot indicators dihapus — slide hanya berganti otomatis
                tanpa kontrol manual, sesuai permintaan. */}
          </div>
        </section>

        {/* ══════════════════ SECTION 2 — WATCHLIST & WATCHED LIST (zigzag normal) ══════════════════ */}
        <SectionShell gradient="from-indigo-500/10 via-slate-950 to-transparent">
          <div className="space-y-4" data-aos="fade-right">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-indigo-300">Watchlist & Watched List</p>
            <h2 className="text-3xl font-black leading-tight md:text-4xl">Simpan tontonan dan lacak progres menontonmu.</h2>
            <p className="max-w-xl text-base leading-7 text-white/65">
              Atur film yang ingin ditonton, tandai yang sudah selesai, dan nikmati pengalaman koleksi film yang terasa personal.
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Menyimpan film untuk nanti ditonton</li>
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Menandai film yang sudah selesai</li>
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Melacak progres menonton pengguna</li>
            </ul>
            <Link to="/register" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black">
              Coba Fitur Ini
            </Link>
          </div>

          {/* Placeholder ilustrasi besar — ganti dengan ilustrasi/icon asli nanti */}
          <div className="flex justify-center" data-aos="fade-left" data-aos-delay="150">
            <div className="flex h-72 w-full max-w-md items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-black/20">
              <div className="text-center px-6">
                <i className="fas fa-bookmark text-4xl text-indigo-300/50 mb-3" />
                <p className="text-sm text-white/30">Placeholder ilustrasi Watchlist</p>
              </div>
            </div>
          </div>
        </SectionShell>

        {/* ══════════════════ SECTION 3 — COMMUNITY DISCUSSION (zigzag terbalik) ══════════════════ */}
        <SectionShell gradient="from-pink-500/10 via-slate-950 to-transparent" reverse>
          {/* Visual di KIRI sesuai spesifikasi */}
          <div className="order-2 lg:order-1 flex justify-center" data-aos="fade-right">
            <div className="flex h-72 w-full max-w-md items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-black/20">
              <div className="text-center px-6">
                <i className="fas fa-comments text-4xl text-pink-300/50 mb-3" />
                <p className="text-sm text-white/30">Placeholder ilustrasi Community</p>
              </div>
            </div>
          </div>

          {/* Teks di KANAN sesuai spesifikasi */}
          <div className="order-1 space-y-4 lg:order-2" data-aos="fade-left" data-aos-delay="150">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-pink-300">Community Discussion</p>
            <h2 className="text-3xl font-black leading-tight md:text-4xl">Ngobrol film bareng komunitas yang aktif dan hangat.</h2>
            <p className="max-w-xl text-base leading-7 text-white/65">
              Bahas teori, tinggalkan review, balas komentar, dan ikut voting film favoritmu bersama pengguna lain.
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Diskusi film bersama pengguna lain</li>
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Membuat review</li>
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Memberikan komentar dan voting polling</li>
            </ul>
            <Link to="/register" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black">
              Gabung Komunitas
            </Link>
          </div>
        </SectionShell>

        {/* ══════════════════ SECTION 4 — AI RECOMMENDATION (zigzag normal) ══════════════════ */}
        <SectionShell gradient="from-violet-500/10 via-slate-950 to-transparent">
          <div className="space-y-4" data-aos="fade-right">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-violet-300">AI Recommendation System</p>
            <h2 className="text-3xl font-black leading-tight md:text-4xl">Rekomendasi hybrid yang belajar dari seleramu.</h2>
            <p className="max-w-xl text-base leading-7 text-white/65">
              Sistem ini menggabungkan Matrix Factorization dan Random Forest untuk memberi saran film yang lebih akurat dan relevan dari waktu ke waktu.
            </p>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Rekomendasi berdasarkan histori rating</li>
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Rekomendasi berdasarkan preferensi pengguna lain</li>
              <li className="flex items-center gap-3"><i className="fas fa-check text-emerald-400" /> Hybrid: Matrix Factorization + Random Forest</li>
            </ul>
            <Link to="/register" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-black">
              Mulai Personalisasi
            </Link>
          </div>

          <div className="flex justify-center" data-aos="fade-left" data-aos-delay="150">
            <div className="flex h-72 w-full max-w-md items-center justify-center rounded-[2rem] border border-dashed border-white/15 bg-black/20">
              <div className="text-center px-6">
                <i className="fas fa-robot text-4xl text-violet-300/50 mb-3" />
                <p className="text-sm text-white/30">Placeholder ilustrasi AI Recommendation</p>
              </div>
            </div>
          </div>
        </SectionShell>

        {/* ══════════════════ SECTION 5 — STATISTIK (center, full width, count-up) ══════════════════ */}
        <section
          data-aos="fade-up"
          className="rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-10 md:px-10"
        >
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300">MovieHub Statistics</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">Skala platform yang menunjukkan kredibilitas.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
              Data berikut diambil langsung dari database MovieHub.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STAT_CONFIG.map((stat, i) => (
              <StatCard
                key={stat.key}
                target={stats[stat.key] ?? 0}
                label={stat.label}
                suffix={stat.suffix}
                delay={i * 100}
              />
            ))}
          </div>
        </section>

        {/* ══════════════════ MOVIE POSTER COLLAGE (statis, tanpa fetch) ══════════════════ */}
        <section data-aos="fade-up" className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 md:p-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/35">Poster Collage</p>
              <h2 className="mt-2 text-2xl font-black md:text-3xl">Koleksi film yang terus bertumbuh.</h2>
            </div>
            <Link to="/register" className="text-sm font-semibold text-indigo-300 hover:text-indigo-200 whitespace-nowrap">
              Jelajahi semua film
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-4 lg:grid-cols-5 md:gap-4">
            {POSTERS.map((poster) => (
              <PosterTile key={poster.title} poster={poster} />
            ))}
          </div>
        </section>

        {/* ══════════════════ CTA PENUTUP ══════════════════ */}
        <section
          data-aos="zoom-in"
          className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-500/15 via-white/[0.03] to-transparent px-6 py-12 text-center md:px-10"
        >
          <h2 className="text-4xl font-black md:text-5xl">Mulai perjalanan filmmu di MovieHub</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/65">
            Daftar gratis dan rasakan rekomendasi film yang benar-benar memahami seleramu.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-black">
              Masuk Sekarang
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-3 text-sm font-semibold text-white">
              Daftar Gratis
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPages;