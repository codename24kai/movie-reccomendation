import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import UserHistory from '../components/UserHistory';

const Profile = () => {
  const { user } = useContext(AuthContext);

  const userId = user?.id ?? user?.user_id ?? null;
  const displayName = user?.name ?? user?.username ?? 'Pengguna';
  const email = user?.email ?? '';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* Header Profile */}
      <div className="bg-white/[0.03] p-8 rounded-2xl border border-white/[0.07]
                      flex flex-col md:flex-row items-center md:items-start
                      gap-6 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                      transform: 'translate(30%, -30%)' }} />

        {/* Avatar */}
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&size=128`}
          alt={`Avatar ${displayName}`}
          className="w-28 h-28 rounded-full border-4 border-indigo-500/30 relative z-10 shrink-0"
        />

        {/* Info User */}
        <div className="text-center md:text-left relative z-10 flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{displayName}</h1>

          {email && (
            <p className="text-sm text-white/40 mt-1 flex items-center justify-center md:justify-start gap-1.5">
              <i className="fas fa-envelope text-xs" />
              {email}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-2">
            {userId && (
              <span className="bg-white/[0.06] border border-white/[0.08] px-3 py-1.5
                               rounded-lg text-xs text-white/50 font-medium flex items-center gap-1.5">
                <i className="fas fa-id-badge text-[11px]" />
                ID: {userId}
              </span>
            )}
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400
                             px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <i className="fas fa-crown text-[11px]" />
              Movie Enthusiast
            </span>
          </div>
        </div>
      </div>

      {/* Riwayat Rating */}
      {userId ? (
        <UserHistory userId={userId} />
      ) : (
        <div className="text-center text-white/30 text-sm py-12">
          Data pengguna tidak ditemukan. Silakan login ulang.
        </div>
      )}
    </div>
  );
};

export default Profile;