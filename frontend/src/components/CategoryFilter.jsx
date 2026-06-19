import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';

const GENRE_ICONS = {
  'Semua': '🍿', 'Action': '💥', 'Adventure': '🧭', 'Animation': '🎨',
  'Comedy': '😂', 'Crime': '🕵️', 'Drama': '🎭', 'Fantasy': '🦄',
  'Horror': '😱', 'Mystery': '🔍', 'Romance': '❤️', 'Sci-Fi': '🚀',
  'Thriller': '😰', 'War': '🪖', 'Western': '🤠'
};

const CategoryFilter = ({ activeGenre = 'Semua', onGenreChange }) => {
  const [categories, setCategories] = useState(['Semua']);

  // Ambil daftar genre untuk tombol filter
  useEffect(() => {
    fetch(`${API_BASE_URL}/movies/genres`) // Pastikan endpoint ini mengembalikan array genre
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') setCategories(['Semua', ...data.genres]);
      })
      .catch(err => console.error("Gagal memuat genre:", err));
  }, []);

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar hide-scroll-indicator">
      <div className="flex items-center gap-3 w-max">
        {categories.map((cat) => {
          const isActive = activeGenre === cat;
          return (
            <button
              key={cat}
              onClick={() => onGenreChange && onGenreChange(cat)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50' 
                  : 'bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.08] hover:text-white'
                }`}
            >
              <span>{GENRE_ICONS[cat] || '🏷️'}</span>
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;