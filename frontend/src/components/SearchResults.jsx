import { useState, useEffect } from 'react';
import MovieCard from './MovieCard';

const SearchResults = ({ query }) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSearch = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:5000/movies/search?q=${query}`);
        const data = await response.json();
        
        if (data.status === 'ok') {
          setResults(data.data);
        }
      } catch (err) {
        console.error("Gagal mencari film:", err);
      } finally {
        setLoading(false);
      }
    };

    if (query) fetchSearch();
  }, [query]); // Effect ini akan berjalan ulang setiap kali 'query' berubah

  return (
    <section>
      <h3 className="text-xl font-bold mb-6">Hasil pencarian untuk "{query}"</h3>
      {loading ? (
        <p className="text-zinc-400 animate-pulse">Mencari film...</p>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {results.map((movie) => (
            <MovieCard key={movie.movieId} movie={movie} />
          ))}
        </div>
      ) : (
        <p className="text-zinc-400">Tidak ada film yang cocok dengan pencarianmu.</p>
      )}
    </section>
  );
};

export default SearchResults;