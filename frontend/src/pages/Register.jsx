import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Ganti alert() dengan state sukses agar tidak memblokir UI
        navigate('/login', { state: { registered: true } });
      } else {
        setError(data.message || 'Gagal mendaftar. Coba lagi.');
      }
    } catch {
      setError('Tidak dapat terhubung ke server. Periksa koneksimu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080810] text-white px-4">
      {/* Background glow */}
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
            <h1 className="text-2xl font-extrabold tracking-tight">Buat Akun Baru</h1>
            <p className="text-sm text-white/40 mt-1.5">
              Gratis selamanya — mulai temukan film favoritmu
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
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username unikmu"
                className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl
                           px-4 py-3 text-sm text-white placeholder-white/20
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                           focus:border-indigo-500/40 transition-all"
              />
            </div>

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
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="minimal 8 karakter"
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
              {/* Password strength hint */}
              {password.length > 0 && (
                <p className={`text-xs mt-1.5 ${password.length < 8 ? 'text-red-400/70' : 'text-emerald-400/70'}`}>
                  {password.length < 8
                    ? `Kurang ${8 - password.length} karakter lagi`
                    : '✓ Panjang password sudah cukup'}
                </p>
              )}
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
                'Daftar Sekarang'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.07]" />
            <span className="text-xs text-white/25">atau</span>
            <div className="flex-1 h-px bg-white/[0.07]" />
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-white/40">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Masuk di sini
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

export default Register;