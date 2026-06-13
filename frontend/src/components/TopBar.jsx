import { useState, useContext, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const TopBar = ({ onSearch }) => {
  const { user } = useContext(AuthContext);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  const displayName = user?.name ?? user?.username ?? 'Pengguna';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSearch(inputValue.trim());
    }
    if (e.key === 'Escape') {
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setInputValue('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 gap-4
                       bg-[#080810] border-b border-white/[0.06] shrink-0">

      {/* Search */}
      <div className="relative w-80">
        <i className="fas fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2
                      text-white/25 text-sm pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cari film, genre, sutradara..."
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                     pl-9 pr-8 py-2 text-sm text-white placeholder-white/25
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                     focus:border-indigo-500/30 transition-all"
        />
        {/* Clear button */}
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2
                       text-white/25 hover:text-white/60 transition-colors"
            aria-label="Hapus pencarian"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Shortcut hint */}
        <span className="hidden lg:flex items-center gap-1 text-[11px] text-white/20 mr-2">
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.07] border border-white/[0.08] font-mono">
            Enter
          </kbd>
          untuk mencari
        </span>

        {/* Profile link */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl
                     hover:bg-white/[0.06] border border-transparent
                     hover:border-white/[0.08] transition-all group"
        >
          <div className="w-7 h-7 rounded-full bg-indigo-500/25 flex items-center justify-center
                          text-[11px] font-bold text-indigo-300 shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-white/60 group-hover:text-white
                           transition-colors hidden sm:block">
            {displayName}
          </span>
          <i className="fas fa-chevron-down text-[10px] text-white/25 hidden sm:block" />
        </Link>
      </div>
    </header>
  );
};

export default TopBar;