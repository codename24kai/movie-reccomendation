import { useMemo } from 'react';

// ════════════════════════════════════════════════════════════════
//  FireflyBackground — partikel cahaya mengambang (efek kunang-kunang)
//  yang muncul di belakang seluruh konten aplikasi.
//
//  CARA PASANG (sekali saja, di level layout tertinggi):
//
//  // App.jsx atau Layout.jsx
//  import FireflyBackground from './components/FireflyBackground';
//
//  function App() {
//    return (
//      <div className="relative min-h-screen bg-[#080810]">
//        <FireflyBackground />
//        <div className="relative z-10">
//          {/* seluruh routes/halaman lain di sini */}
//        </div>
//      </div>
//    );
//  }
//
//  PENTING:
//  - FireflyBackground harus diletakkan SEBELUM konten halaman dalam DOM,
//    dan kontennya dibungkus dengan class "relative z-10" agar partikel
//    tetap berada di belakang, tidak menutupi atau memblokir klik.
//  - Komponen ini "fixed" terhadap viewport (position: fixed) sehingga
//    efeknya konsisten dan tidak ikut ter-scroll bersama konten —
//    tetap terlihat di seluruh halaman manapun yang memakai layout ini.
//  - pointer-events: none diset agar partikel tidak pernah memblokir
//    interaksi (klik tombol, link, dll) di balik atau di sekitarnya.
// ════════════════════════════════════════════════════════════════

const FIREFLY_COUNT = 35;
const FIREFLY_COLORS = [
    'rgba(165, 180, 252, OPACITY)', // indigo terang
    'rgba(196, 181, 253, OPACITY)', // violet terang
    'rgba(252, 211, 77, OPACITY)',  // amber hangat (selingan, mirip kunang-kunang asli)
];

// Generate properti acak untuk setiap partikel sekali saja (di luar render
// agar tidak berubah-ubah setiap re-render komponen induk).
const generateFireflies = (count) => {
    return Array.from({ length: count }).map((_, i) => {
        const colorTemplate = FIREFLY_COLORS[i % FIREFLY_COLORS.length];
        const size = 2 + Math.random() * 3; // 2px - 5px
        return {
            id: i,
            size,
            colorTemplate,
            startX: Math.random() * 100, // posisi awal dalam vw (%)
            startY: Math.random() * 100, // posisi awal dalam vh (%)
            driftX: (Math.random() - 0.5) * 40, // jarak melayang horizontal (vw)
            driftY: (Math.random() - 0.5) * 40, // jarak melayang vertikal (vh)
            duration: 12 + Math.random() * 18, // 12s - 30s per siklus melayang
            delay: Math.random() * -30, // delay negatif agar animasi tidak mulai bersamaan
            glowDuration: 2 + Math.random() * 3, // 2s - 5s siklus berkedip
            glowDelay: Math.random() * -5,
            maxOpacity: 0.35 + Math.random() * 0.45, // variasi terang partikel
        };
    });
};

const FireflyBackground = () => {
    // useMemo agar posisi/timing partikel digenerate sekali per mount,
    // bukan setiap render (yang akan membuat partikel "lompat" acak terus).
    const fireflies = useMemo(() => generateFireflies(FIREFLY_COUNT), []);

    return (
        <div
            aria-hidden="true"
            className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
        >
            <style>{`
        @keyframes firefly-drift {
          0%   { transform: translate(0, 0); }
          50%  { transform: translate(var(--drift-x), var(--drift-y)); }
          100% { transform: translate(0, 0); }
        }
        @keyframes firefly-glow {
          0%, 100% { opacity: 0.15; }
          50%      { opacity: var(--max-opacity); }
        }
        .firefly-particle {
          position: absolute;
          border-radius: 50%;
          will-change: transform;
          animation: firefly-drift var(--duration) ease-in-out infinite;
          animation-delay: var(--delay);
        }
        .firefly-glow-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          animation: firefly-glow var(--glow-duration) ease-in-out infinite;
          animation-delay: var(--glow-delay);
        }
        @media (prefers-reduced-motion: reduce) {
          .firefly-particle, .firefly-glow-inner {
            animation: none;
          }
        }
      `}</style>

            {fireflies.map((f) => {
                const glowColor = f.colorTemplate.replace('OPACITY', f.maxOpacity);
                const haloColor = f.colorTemplate.replace('OPACITY', f.maxOpacity * 0.4);

                return (
                    <div
                        key={f.id}
                        className="firefly-particle"
                        style={{
                            left: `${f.startX}%`,
                            top: `${f.startY}%`,
                            width: `${f.size}px`,
                            height: `${f.size}px`,
                            '--drift-x': `${f.driftX}vw`,
                            '--drift-y': `${f.driftY}vh`,
                            '--duration': `${f.duration}s`,
                            '--delay': `${f.delay}s`,
                        }}
                    >
                        <div
                            className="firefly-glow-inner"
                            style={{
                                background: glowColor,
                                boxShadow: `0 0 ${f.size * 3}px ${f.size}px ${haloColor}`,
                                '--glow-duration': `${f.glowDuration}s`,
                                '--glow-delay': `${f.glowDelay}s`,
                                '--max-opacity': f.maxOpacity,
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default FireflyBackground;