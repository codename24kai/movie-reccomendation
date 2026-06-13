import { useState } from 'react';

const CategoryFilter = () => {
  const [activeFilter, setActiveFilter] = useState('Semua');

  const categories = [
    { id: 'Semua', icon: '🍿' },
    { id: 'Trending', icon: '🔥' },
    { id: 'Top Rated', icon: '⭐' },
    { id: 'Action', icon: '💥' },
    { id: 'Sci-Fi', icon: '🛸' },
    { id: 'Romance', icon: '❤️' },
    { id: 'Era 2000-an', icon: '📼' },
  ];

  return (
    <div className="w-full overflow-x-auto pb-4 custom-scrollbar hide-scroll-indicator">
      <div className="flex items-center gap-3 w-max">
        {categories.map((cat) => {
          const isActive = activeFilter === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveFilter(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/50' 
                  : 'bg-white/[0.03] text-white/50 border border-white/[0.05] hover:bg-white/[0.08] hover:text-white'
                }`}
            >
              <span>{cat.icon}</span>
              {cat.id}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;