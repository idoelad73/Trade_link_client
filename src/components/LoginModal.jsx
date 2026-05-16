import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUIStore from '../stores/uiStore';
import useAuthStore from '../stores/authStore';
import { loginTrade, loginContractor } from '../api/auth.js';

const STORAGE_KEY = {
  trade:      'tl_remembered_trade',
  contractor: 'tl_remembered_contractor',
};

const content = {
  en: {
    trade: {
      badge: '🔧 Trade Professional',
      title: 'Welcome back',
      subtitle: 'Sign in to your trade professional account',
      accent: 'sky',
    },
    contractor: {
      badge: '🏗️ Building Contractor',
      title: 'Welcome back',
      subtitle: 'Sign in to your contractor account',
      accent: 'amber',
    },
    email:       'Gmail Address',
    password:    'Password',
    remember:    'Remember me',
    forgot:      'Forgot password?',
    submit:      'Sign In',
    submitting:  'Signing in…',
    noAccount:   "Don't have an account?",
    register:    'Register',
    errors: {
      required: 'Email and password are required',
    },
  },
  es: {
    trade: {
      badge: '🔧 Profesional de Oficios',
      title: 'Bienvenido de nuevo',
      subtitle: 'Inicia sesión en tu cuenta de profesional',
      accent: 'sky',
    },
    contractor: {
      badge: '🏗️ Contratista',
      title: 'Bienvenido de nuevo',
      subtitle: 'Inicia sesión en tu cuenta de contratista',
      accent: 'amber',
    },
    email:      'Correo Gmail',
    password:   'Contraseña',
    remember:   'Recordarme',
    forgot:     '¿Olvidaste tu contraseña?',
    submit:     'Iniciar Sesión',
    submitting: 'Iniciando sesión…',
    noAccount:  '¿No tienes cuenta?',
    register:   'Regístrate',
    errors: {
      required: 'Correo y contraseña son obligatorios',
    },
  },
};

export default function LoginModal() {
  const { lang, activeModal, closeModal } = useUIStore();
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const t = content[lang];

  const type    = activeModal === 'loginTrade' ? 'trade' : 'contractor';
  const isTrade = type === 'trade';
  const info    = t[type];

  const savedKey = STORAGE_KEY[type];

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  // Pre-fill email if previously remembered
  useEffect(() => {
    const saved = localStorage.getItem(savedKey);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    } else {
      setEmail('');
      setRemember(false);
    }
    setPassword('');
    setError('');
  }, [activeModal, savedKey]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [closeModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError(t.errors.required);

    setLoading(true);
    try {
      const fn   = isTrade ? loginTrade : loginContractor;
      const data = await fn({ email, password });

      if (remember) {
        localStorage.setItem(savedKey, email);
      } else {
        localStorage.removeItem(savedKey);
      }

      setAuth(data);
      closeModal();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Accent colours ──────────────────────────────────────────────────────────
  const ring    = isTrade ? 'focus:ring-sky-300'   : 'focus:ring-amber-300';
  const btn     = isTrade
    ? 'from-sky-500 to-sky-400 hover:from-sky-400 shadow-sky-200'
    : 'from-amber-500 to-amber-400 hover:from-amber-400 shadow-amber-200';
  const badgeBg = isTrade ? 'bg-sky-100 text-sky-700 border-sky-200'   : 'bg-amber-100 text-amber-700 border-amber-200';
  const topBar  = isTrade ? 'from-sky-400 to-sky-300' : 'from-amber-400 to-yellow-300';
  const linkClr = isTrade ? 'text-sky-500'  : 'text-amber-500';

  const inputCls = `w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800
    placeholder-slate-400 focus:outline-none focus:ring-2 ${ring} transition`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && closeModal()}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">

        {/* Coloured top bar */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${topBar}`} />

        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          aria-label="Close"
        >
          ×
        </button>

        <div className="px-8 pt-7 pb-8">
          {/* Badge */}
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${badgeBg} mb-5`}>
            {info.badge}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">{info.title}</h2>
          <p className="text-sm text-slate-400 mb-7">{info.subtitle}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                {t.email}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className={inputCls}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t.password}
                </label>
                <button
                  type="button"
                  className={`text-xs ${linkClr} font-medium hover:underline`}
                >
                  {t.forgot}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls + ' pr-10'}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setRemember((v) => !v)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                  remember
                    ? isTrade ? 'bg-sky-500 border-sky-500' : 'bg-amber-500 border-amber-500'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {remember && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-slate-600">{t.remember}</span>
            </label>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-gradient-to-r ${btn} disabled:opacity-60 text-white font-semibold text-sm py-3.5 rounded-2xl shadow-lg transition-all duration-200 active:scale-[0.99] mt-1`}
            >
              {loading ? t.submitting : t.submit}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-slate-400 mt-5">
            {t.noAccount}{' '}
            <button
              onClick={() => { closeModal(); navigate(isTrade ? '/register/trade' : '/register/contractor'); }}
              className={`${linkClr} font-semibold hover:underline`}
            >
              {t.register}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
