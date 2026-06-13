import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  // Kita cek langsung ke sumber aslinya (Local Storage)
  // Ini mencegah "race condition" (balapan data) dari Context
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  // Jika tidak ada token atau user, lempar kembali ke login
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Jika ada, persilakan masuk ke halaman yang dituju
  return children;
};

export default ProtectedRoute;