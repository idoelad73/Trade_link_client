import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import useUIStore from '../../stores/uiStore';
import useAuthStore from '../../stores/authStore';
import { registerContractor } from '../../api/auth.js';
import { CONTRACTOR_EXPERTISE } from '../../constants/trades.js';

const content = {
  en: {
    title: 'Contractor Registration',
    subtitle: 'Post jobs and find the best tradespeople for your projects.',
    sections: {
      company: 'Company Information',
      expertise: 'Building Expertise',
    },
    fields: {
      companyName: 'Company Name',
      email: 'Gmail Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      phone: 'Phone Number',
      address: 'Office Address',
      expertise: 'Select areas of expertise',
    },
    placeholders: {
      companyName: 'Smith Construction LLC',
      email: 'company@gmail.com',
      phone: '+1 (555) 000-0000',
      address: '123 Main St, New York, NY 10001',
    },
    expertiseHint: 'Select all that apply',
    submit: 'Create Account',
    submitting: 'Creating account…',
    loginPrompt: 'Already have an account?',
    login: 'Sign in',
    errors: {
      passwordMatch: 'Passwords do not match',
      expertiseRequired: 'Please select at least one area of expertise',
    },
  },
  es: {
    title: 'Registro de Contratista',
    subtitle: 'Publica trabajos y encuentra los mejores profesionales para tus proyectos.',
    sections: {
      company: 'Información de la Empresa',
      expertise: 'Especialidad en Construcción',
    },
    fields: {
      companyName: 'Nombre de la Empresa',
      email: 'Correo Gmail',
      password: 'Contraseña',
      confirmPassword: 'Confirmar Contraseña',
      phone: 'Número de Teléfono',
      address: 'Dirección de Oficina',
      expertise: 'Selecciona áreas de especialidad',
    },
    placeholders: {
      companyName: 'Construcciones García S.L.',
      email: 'empresa@gmail.com',
      phone: '+1 (555) 000-0000',
      address: 'Calle Principal 123, Ciudad',
    },
    expertiseHint: 'Selecciona todas las que apliquen',
    submit: 'Crear Cuenta',
    submitting: 'Creando cuenta…',
    loginPrompt: '¿Ya tienes cuenta?',
    login: 'Iniciar sesión',
    errors: {
      passwordMatch: 'Las contraseñas no coinciden',
      expertiseRequired: 'Selecciona al menos un área de especialidad',
    },
  },
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition';

const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-8 first:mt-0">
      <div className="h-px flex-1 bg-gradient-to-r from-amber-200 to-transparent" />
      <span className="text-sm font-bold text-amber-600 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-gradient-to-l from-sky-200 to-transparent" />
    </div>
  );
}

export default function ContractorRegister() {
  const { lang, openModal } = useUIStore();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = content[lang];

  const [form, setForm] = useState({
    companyName: '', email: '', password: '', confirmPassword: '',
    phone: '', address: '',
  });
  const [expertise, setExpertise]     = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]             = useState('');
  const [emailTaken, setEmailTaken]   = useState(false);
  const [loading, setLoading]         = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleExpertise = (item) => {
    setExpertise((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError(t.errors.passwordMatch);
    }
    if (expertise.length === 0) {
      return setError(t.errors.expertiseRequired);
    }

    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = form;
      const data = await registerContractor({ ...payload, expertise: JSON.stringify(expertise) });
      setAuth(data);
      navigate('/dashboard/contractor');
    } catch (err) {
      if (err.response?.status === 409) {
        setEmailTaken(true);
        setError('');
      } else {
        setEmailTaken(false);
        setError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-amber-200">
            🏗️ Contractors Area
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-br from-amber-500 via-amber-400 to-sky-400 bg-clip-text text-transparent">
              {t.title}
            </span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-amber-100 p-8 space-y-5">

          {/* ── Company info ── */}
          <SectionHeader>{t.sections.company}</SectionHeader>

          <div>
            <label className={labelCls}>{t.fields.companyName}</label>
            <input className={inputCls} required value={form.companyName} onChange={set('companyName')} placeholder={t.placeholders.companyName} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t.fields.email}</label>
              <input className={inputCls} type="email" required value={form.email} onChange={set('email')} placeholder={t.placeholders.email} />
            </div>
            <div>
              <label className={labelCls}>{t.fields.phone}</label>
              <input className={inputCls} type="tel" required value={form.phone} onChange={set('phone')} placeholder={t.placeholders.phone} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{t.fields.password}</label>
              <div className="relative">
                <input
                  className={inputCls + ' pr-10'}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>{t.fields.confirmPassword}</label>
              <div className="relative">
                <input
                  className={inputCls + ' pr-10'}
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.fields.address}</label>
            <input className={inputCls} required value={form.address} onChange={set('address')} placeholder={t.placeholders.address} />
          </div>

          {/* ── Expertise ── */}
          <SectionHeader>{t.sections.expertise}</SectionHeader>

          <div>
            <p className="text-xs text-slate-400 mb-3">{t.expertiseHint}</p>
            <div className="flex flex-wrap gap-2">
              {CONTRACTOR_EXPERTISE.map((item) => {
                const active = expertise.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleExpertise(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all duration-150 ${
                      active
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400'
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {item}
                  </button>
                );
              })}
            </div>
            {expertise.length > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-2">
                {expertise.length} selected
              </p>
            )}
          </div>

          {/* Error */}
          {emailTaken && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">📧</span>
              <div>
                <p className="font-semibold">This email is already registered.</p>
                <p className="mt-0.5 text-amber-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => openModal('loginContractor')}
                    className="font-bold underline hover:text-amber-800 transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-sky-400 hover:from-amber-400 hover:to-sky-300 disabled:opacity-60 text-white font-semibold text-base py-4 rounded-2xl shadow-lg shadow-amber-200 transition-all duration-200 active:scale-[0.99] mt-2"
          >
            {loading ? t.submitting : t.submit}
          </button>

          <p className="text-center text-sm text-slate-400 pt-1">
            {t.loginPrompt}{' '}
            <button type="button" onClick={() => navigate('/login')} className="text-amber-500 font-semibold hover:underline">
              {t.login}
            </button>
          </p>
        </form>
      </div>

      <footer className="text-center py-8 text-slate-400 text-sm border-t border-yellow-100">
        © 2026 TradeLink. All rights reserved.
      </footer>
    </div>
  );
}
