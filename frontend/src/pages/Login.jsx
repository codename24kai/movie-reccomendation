import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (login) login(data.user, data.token);
        navigate('/home');
      } else {
        setError(data.message || 'Email atau password salah. Coba lagi.');
      }
    } catch (err) {
      console.error(err);
      setError('Tidak dapat terhubung ke server. Periksa koneksimu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080810] text-white px-4">
      {/* Background subtle glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                   w-[500px] h-[500px] rounded-full pointer-events-none -z-10"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8
                        shadow-2xl shadow-black/40">

          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600
                              flex items-center justify-center text-base">
                🎬
              </div>
              <span className="text-lg font-extrabold tracking-tight">MovieHub</span>
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight">Selamat Datang Kembali</h1>
            <p className="text-sm text-white/40 mt-1.5">
              Masuk untuk melanjutkan perjalanan filmmu
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20
                            text-red-400 px-4 py-3 rounded-xl mb-6 text-sm">
              <i className="fas fa-circle-exclamation mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@example.com"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                           px-4 py-3 text-sm text-white placeholder-white/20
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                           focus:border-indigo-500/40 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Password
                </label>
                {/* Placeholder — hubungkan ke halaman forgot password jika tersedia */}
                <span className="text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">
                  Lupa password?
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                             px-4 py-3 pr-11 text-sm text-white placeholder-white/20
                             focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                             focus:border-indigo-500/40 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                             text-white/30 hover:text-white/70 transition-colors p-1"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2
                         bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40
                         disabled:cursor-not-allowed text-white font-bold
                         py-3 rounded-xl transition-all mt-2
                         hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/25"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin text-sm" />
                  <span>Memproses...</span>
                </>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-white/25">atau</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Register link */}
          <p className="text-center text-sm text-white/40">
            Belum punya akun?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Daftar gratis
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <p className="text-center mt-5">
          <Link to="/" className="text-xs text-white/25 hover:text-white/50 transition-colors flex items-center justify-center gap-1">
            <i className="fas fa-arrow-left text-[10px]" />
            Kembali ke halaman utama
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;