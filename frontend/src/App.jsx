import { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Import Komponen Layout
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ProtectedRoute from './components/ProtectedRoute'; // Import satpam kita
import FireflyBackground from './components/FireflyBackground';

// Import Halaman
import LandingPages from './pages/LandingPages';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Watchlist from './pages/Watchlist';
import Profile from './pages/Profile';
import Catalog from './pages/Catalog';
import Community from './pages/Community';
import UserProfile from './pages/UserProfile';

const AppLayout = ({ children }) => {
  const [, setSearchQuery] = useState('');
  return (
    <div className="h-screen flex overflow-hidden bg-transparent text-white relative">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 z-10 relative">
        <TopBar onSearch={setSearchQuery} />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) return <div className="h-screen bg-[#0f0f0f] text-white flex items-center justify-center">Memuat Aplikasi...</div>;

  return (
    <div className="relative min-h-screen bg-[#080810]">
      <FireflyBackground />
      <div className="relative z-10 h-full">
        <Router>
          <Routes>
            {/* Rute Publik */}
            <Route path="/" element={<LandingPages />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Rute yang Dilindungi (Dibungkus ProtectedRoute) */}
            <Route path="/home" element={
              <ProtectedRoute>
                <AppLayout><Home /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/watchlist" element={
              <ProtectedRoute>
                <AppLayout><Watchlist /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute>
                <AppLayout><Profile /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/user/:id" element={
              <ProtectedRoute>
                <AppLayout><UserProfile /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/catalog" element={
              <ProtectedRoute>
                <AppLayout><Catalog /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/community" element={
              <ProtectedRoute>
                <AppLayout><Community /></AppLayout>
              </ProtectedRoute>
            } />

            <Route path="/trending" element={<Navigate to="/home" replace />} />

            {/* Redirect /movie/:movieId ke Home karena MovieDetailPage sudah dihapus */}
            <Route path="/movie/:movieId" element={<Navigate to="/home" replace />} />

            <Route path="*" element={<h2 className="text-center text-white mt-20 text-2xl font-bold">404 - Halaman tidak ditemukan</h2>} />
          </Routes>
        </Router>
      </div>
    </div>
  );
}

export default App;
