import { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { API_BASE_URL } from '../config/api';

export const CollectionContext = createContext();

export const CollectionProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [watchlist, setWatchlist] = useState([]);
  const [watchedList, setWatchedList] = useState([]);

  const activeUser = user || JSON.parse(localStorage.getItem('user'));
  const userId = activeUser?.user_id || activeUser?.id;



  const fetchCollections = async () => {
    if (!userId) {
      setWatchlist([]);
      setWatchedList([]);
      return;
    }
    try {
      const [resWatchlist, resWatched] = await Promise.all([
        fetch(`${API_BASE_URL}/watchlist/${userId}`),
        fetch(`${API_BASE_URL}/watched/${userId}`)
      ]);
      const dataWatchlist = await resWatchlist.json();
      const dataWatched = await resWatched.json();

      if (dataWatchlist.status === 'ok') {
        setWatchlist(dataWatchlist.watchlist.map(m => String(m.movie_id ?? m.movieId).replace('tmdb-', '')));
      }
      if (dataWatched.status === 'ok') {
        const wData = dataWatched.watched_list || dataWatched.movies || [];
        setWatchedList(wData.map(m => String(m.movie_id ?? m.movieId).replace('tmdb-', '')));
      }
    } catch (err) {
      console.error("Gagal mengambil data koleksi global:", err);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [userId]);

  const toggleWatchlistGlobal = (movieId, isAdded) => {
    const cleanId = String(movieId).replace('tmdb-', '');
    setWatchlist(prev =>
      isAdded ? [...prev, cleanId] : prev.filter(id => id !== cleanId)
    );
  };

  const toggleWatchedGlobal = (movieId, isWatched) => {
    const cleanId = String(movieId).replace('tmdb-', '');
    setWatchedList(prev =>
      isWatched ? [...prev, cleanId] : prev.filter(id => id !== cleanId)
    );
  };

  // Kita juga sediakan trigger untuk force refresh page yang butuh full data
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const notifyCollectionChanged = () => setTriggerRefresh(prev => prev + 1);

  return (
    <CollectionContext.Provider value={{
      watchlist,
      watchedList,
      toggleWatchlistGlobal,
      toggleWatchedGlobal,
      notifyCollectionChanged,
      triggerRefresh
    }}>
      {children}
    </CollectionContext.Provider>
  );
};
