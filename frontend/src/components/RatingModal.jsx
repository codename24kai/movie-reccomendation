import { useContext, useState } from 'react';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/api';

const RatingModal = ({ isOpen, onClose, movieId, movieTitle }) => {
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const { user } = useContext(AuthContext); // Ambil user dari Context


  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
    setStatus('loading');
    try {
      const response = await fetch(`${API_BASE_URL}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.user_id, // Gunakan user_id dari context
          movie_id: movieId,
          rating: rating
        }),
      });

      const data = await response.json();
      
      if (data.status === 'ok') {
        setStatus('success');
        // Tutup modal otomatis setelah 2 detik
        setTimeout(() => {
          setStatus('idle');
          setRating(0);
          onClose();
        }, 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#121212] border border-white/10 p-6 rounded-2xl w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <i className="fas fa-times"></i>
        </button>
        
        <h3 className="text-xl font-bold mb-2">Beri Rating</h3>
        <p className="text-zinc-400 mb-6">{movieTitle}</p>

        {status === 'success' ? (
          <div className="text-green-500 flex items-center space-x-2 bg-green-500/10 p-4 rounded-xl">
            <i className="fas fa-check-circle"></i>
            <span>Rating berhasil disimpan!</span>
          </div>
        ) : (
          <>
            <div className="flex justify-center space-x-4 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-orange-500' : 'text-zinc-600'}`}
                >
                  <i className="fas fa-star"></i>
                </button>
              ))}
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-sm mb-4 text-center">Gagal menyimpan rating. Coba lagi.</p>
            )}

            <button 
              onClick={handleSubmit}
              disabled={rating === 0 || status === 'loading'}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white py-3 rounded-xl font-bold transition-colors"
            >
              {status === 'loading' ? 'Menyimpan...' : 'Kirim Rating'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RatingModal;
