import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const STARS = [1, 2, 3, 4, 5];

const StarDisplay = ({ rating }) => (
  <div className="flex items-center gap-0.5">
    {STARS.map((s) => (
      <i
        key={s}
        className={`fas fa-star text-[11px] ${s <= Math.round(rating) ? 'text-amber-400' : 'text-white/10'
          }`}
      />
    ))}
    <span className="ml-1.5 text-xs font-bold text-amber-400">{Number(rating || 0).toFixed(1)}</span>
  </div>
);

const UserHistory = ({ userId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        // Endpoint sesuai permintaanmu
        const response = await fetch(`${API_BASE_URL}/user/${userId}/history`);
        const data = await response.json();

        if (data.status === 'ok') {
          // Normalisasi: Pastikan data yang diterima di-map agar konsisten
          const normalized = (data.ratings || []).map(item => ({
            movieId: item.movie_id ?? item.movieId,
            title: item.title ?? 'Unknown Title',
            genres: item.genres ?? '',
            rating: item.rating ?? 0
          }));
          setHistory(normalized);
        } else {
          setError(data.message || 'Gagal memuat riwayat rating.');
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError('Tidak dapat terhubung ke server.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId]);

  return (
    <section className="border-t border-white/[0.07] pt-8">

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
          <i className="fas fa-clock-rotate-left text-indigo-400 text-sm" />
        </div>
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-white">Riwayat Rating</h2>
          {!loading && !error && history.length > 0 && (
            <p className="text-xs text-white/30">{history.length} film telah diberi rating</p>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl
                        bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <i className="fas fa-circle-exclamation shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-center
                        rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <div className="w-12 h-12 rounded-full bg-white/[0.05] flex items-center justify-center">
            <i className="fas fa-star text-white/15 text-lg" />
          </div>
          <p className="text-sm text-white/30">Belum ada film yang diberi rating.</p>
          <p className="text-xs text-white/20">Mulai tonton dan beri rating film favoritmu!</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && history.length > 0 && (
        <div className="rounded-xl border border-white/[0.07] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.04] border-b border-white/[0.07]">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Judul Film
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider
                               hidden sm:table-cell">
                  Genre
                </th>
                <th className="px-5 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {history.map((item, index) => (
                <tr
                  key={item.movie_id ?? item.movieId ?? index}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-white/80 max-w-[200px]">
                    <span className="line-clamp-1">{item.title}</span>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    {item.genres ? (
                      <div className="flex flex-wrap gap-1">
                        {item.genres.split('|').slice(0, 2).map((g) => (
                          <span
                            key={g}
                            className="text-[10px] px-2 py-0.5 rounded-md
                                       bg-white/[0.06] text-white/35 border border-white/[0.06]"
                          >
                            {g.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-white/20 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <StarDisplay rating={item.rating} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default UserHistory;
