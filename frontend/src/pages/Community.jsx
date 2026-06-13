import { useState } from 'react';

// Data Dummy Sementara untuk Desain UI
const MOCK_FEED = [
  {
    id: 1,
    user: { name: 'Alex Rahman', avatar: 'AR', color: 'bg-indigo-500/20 text-indigo-300' },
    action: 'memberikan rating 5 bintang untuk',
    movie: 'Inception',
    review: 'Konsep mimpi di dalam mimpinya sangat mind-blowing. Visual dan scoring dari Hans Zimmer benar-benar juara!',
    time: '2 jam yang lalu',
    likes: 12,
    comments: 3
  },
  {
    id: 2,
    user: { name: 'Diana Novita', avatar: 'DN', color: 'bg-pink-500/20 text-pink-300' },
    action: 'menambahkan ke wishlist',
    movie: 'Interstellar',
    review: null,
    time: '5 jam yang lalu',
    likes: 4,
    comments: 0
  }
];

const Community = () => {
  const [feed] = useState(MOCK_FEED);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Komunitas */}
      <div className="border-b border-white/[0.05] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 bg-teal-500/10 border border-teal-500/20 text-[10px] font-bold text-teal-400 uppercase tracking-widest">
          <i className="fas fa-users"></i> Forum Sosial
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Aktivitas Komunitas</h1>
        <p className="text-white/40 text-sm max-w-xl leading-relaxed">
          Lihat apa yang sedang ditonton, dinilai, dan diulas oleh pengguna lain. Temukan referensi film baru dari teman-temanmu.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Kolom Kiri: Feed Aktivitas */}
        <div className="flex-1 space-y-5">
          {feed.map((item) => (
            <div key={item.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 hover:bg-white/[0.03] transition-colors">
              {/* Profil & Aksi */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 ${item.user.color}`}>
                  {item.user.avatar}
                </div>
                <div>
                  <p className="text-sm text-white/80">
                    <span className="font-bold text-white cursor-pointer hover:text-indigo-400 transition-colors">{item.user.name}</span>{' '}
                    <span className="text-white/40">{item.action}</span>{' '}
                    <span className="font-bold text-indigo-300 cursor-pointer hover:underline">{item.movie}</span>
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">{item.time}</p>
                </div>
              </div>

              {/* Ulasan (Jika ada) */}
              {item.review && (
                <div className="bg-[#080810]/50 border border-white/[0.03] rounded-xl p-4 mb-4 relative">
                  <i className="fas fa-quote-left absolute top-3 left-3 text-white/5 text-2xl"></i>
                  <p className="text-sm text-white/60 leading-relaxed relative z-10 pl-6">
                    "{item.review}"
                  </p>
                </div>
              )}

              {/* Interaksi */}
              <div className="flex items-center gap-4 text-xs font-medium text-white/40">
                <button className="flex items-center gap-1.5 hover:text-pink-400 transition-colors">
                  <i className="far fa-heart"></i> {item.likes} Suka
                </button>
                <button className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                  <i className="far fa-comment"></i> {item.comments} Balasan
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Kolom Kanan: Rekomendasi Akun */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 sticky top-24">
            <h3 className="font-extrabold text-sm text-white tracking-wide mb-4 flex items-center justify-between">
              Siapa yang harus diikuti
              <i className="fas fa-user-plus text-white/20"></i>
            </h3>
            
            <div className="space-y-4">
              {/* Contoh User 1 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-500/20 text-orange-300 flex items-center justify-center text-xs font-bold border border-white/10">
                    FH
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white line-clamp-1">Faisal H.</p>
                    <p className="text-[10px] text-white/40">240 Ulasan</p>
                  </div>
                </div>
                <button className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
                  Ikuti
                </button>
              </div>

              {/* Contoh User 2 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-500/20 text-green-300 flex items-center justify-center text-xs font-bold border border-white/10">
                    SR
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white line-clamp-1">Siti R.</p>
                    <p className="text-[10px] text-white/40">18 Film Sama</p>
                  </div>
                </div>
                <button className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-1.5 px-3 rounded-lg transition-colors">
                  Ikuti
                </button>
              </div>
            </div>
            
            <button className="w-full mt-5 py-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-white/[0.03] rounded-lg transition-colors">
              Lihat lebih banyak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community;