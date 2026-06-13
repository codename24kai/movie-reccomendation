import { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Import Komponen Layout
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ProtectedRoute from './components/ProtectedRoute'; // Import satpam kita

// Import Halaman
import LandingPages from './pages/LandingPages';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Wishlist from './pages/Wishlist';
import Profile from './pages/Profile';
import Trending from './pages/Trending';
import Catalog from './pages/Catalog';
import Community from './pages/Community';

const AppLayout = ({ children }) => {
  const [, setSearchQuery] = useState('');
  return (
    <div className="h-screen flex overflow-hidden bg-[#0f0f0f] text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
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
        
        <Route path="/wishlist" element={
          <ProtectedRoute>
            <AppLayout><Wishlist /></AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout><Profile /></AppLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/trending" element={
          <ProtectedRoute>
            <AppLayout><Trending /></AppLayout>
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

        <Route path="*" element={<h2 className="text-center text-white mt-20 text-2xl font-bold">404 - Halaman tidak ditemukan</h2>} />
      </Routes>
    </Router>
  );
}

export default App;