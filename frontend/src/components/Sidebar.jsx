import { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/home',       icon: 'fa-house',         label: 'Home' },
  { to: '/trending',   icon: 'fa-fire',          label: 'Trending' },
  { to: '/wishlist',   icon: 'fa-bookmark',      label: 'Wishlist' },
  { to: '/community',  icon: 'fa-users',         label: 'Communities' },
  { to: '/catalog',    icon: 'fa-users',         label: 'Catalog' },
];

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user?.name ?? user?.username ?? 'Pengguna';
  const email = user?.email ?? '';

  return (
    <aside className="w-60 flex flex-col flex-shrink-0 bg-[#080810]
                      border-r border-white/[0.06]">

      {/* Logo */}
      <div className="px-5 h-16 flex items-center gap-2.5 border-b border-white/[0.06]">
          <img src="/assets/logo.png" alt="MovieHub" className="w-full h-full object-cover pt-5"/>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-150
                        ${isActive(to)
                          ? 'bg-indigo-500/15 text-white border border-indigo-500/20'
                          : 'text-white/40 hover:text-white hover:bg-white/[0.06] border border-transparent'
                        }`}
          >
            <i className={`fas ${icon} w-4 text-center text-[13px]
                           ${isActive(to) ? 'text-indigo-400' : ''}`} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom: profile + logout */}
      <div className="px-3 py-4 border-t border-white/[0.06] space-y-0.5">
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-150
                      ${isActive('/profile')
                        ? 'bg-indigo-500/15 text-white border border-indigo-500/20'
                        : 'text-white/40 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      }`}
        >
          {/* Mini avatar */}
          <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center
                          text-[9px] font-bold text-indigo-300 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate leading-none">{displayName}</p>
            {email && (
              <p className="text-[10px] text-white/25 truncate mt-0.5">{email}</p>
            )}
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-white/30 hover:text-red-400 hover:bg-red-500/[0.07]
                     border border-transparent transition-all duration-150"
        >
          <i className="fas fa-arrow-right-from-bracket w-4 text-center text-[13px]" />
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;