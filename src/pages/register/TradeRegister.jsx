import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import useUIStore from '../../stores/uiStore';
import useAuthStore from '../../stores/authStore';
import { registerTrade } from '../../api/auth.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';

const content = {
  en: {
    title: 'Trade Professional Registration',
    subtitle: 'Join TradeLink and connect with clients who need your expertise.',
    sections: {
      personal: 'Personal Information',
      professional: 'Professional Details',
      documents: 'Documents & Certifications',
      location: 'Location Sharing',
    },
    fields: {
      fullName: 'Full Name',
      email: 'Gmail Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      phone: 'Phone Number',
      professionality: 'Select your trade',
      address: 'Office / Business Address',
      photo: 'Profile Photo',
      licenseDoc: 'Trade License',
      insuranceDoc: 'Insurance Certificate',
      cv: 'CV / Resume',
      locationConsent: 'Allow location sharing',
      locationDesc: 'Sharing your location helps nearby clients find you. You can change this in settings.',
    },
    locationModal: {
      title: 'Enable Location Sharing?',
      body: 'Your location will be used to show you to clients in your area. TradeLink will never share your precise location publicly.',
      allow: 'Allow',
      decline: 'Not now',
    },
    placeholders: {
      fullName: 'John Smith',
      email: 'you@gmail.com',
      phone: '+1 (555) 000-0000',
      address: '123 Main St, New York, NY 10001',
    },
    fileHint: 'PDF, Word, or image — max 10 MB',
    submit: 'Create Account',
    submitting: 'Creating account…',
    loginPrompt: 'Already have an account?',
    login: 'Sign in',
    errors: {
      passwordMatch: 'Passwords do not match',
      required: 'All fields are required',
    },
  },
  es: {
    title: 'Registro de Profesional',
    subtitle: 'Únete a TradeLink y conecta con clientes que necesitan tu experiencia.',
    sections: {
      personal: 'Información Personal',
      professional: 'Detalles Profesionales',
      documents: 'Documentos y Certificaciones',
      location: 'Compartir Ubicación',
    },
    fields: {
      fullName: 'Nombre Completo',
      email: 'Correo Gmail',
      password: 'Contraseña',
      confirmPassword: 'Confirmar Contraseña',
      phone: 'Número de Teléfono',
      professionality: 'Selecciona tu oficio',
      address: 'Dirección de Oficina / Negocio',
      photo: 'Foto de Perfil',
      licenseDoc: 'Licencia Comercial',
      insuranceDoc: 'Certificado de Seguro',
      cv: 'CV / Currículum',
      locationConsent: 'Permitir compartir ubicación',
      locationDesc: 'Compartir tu ubicación ayuda a los clientes cercanos a encontrarte.',
    },
    locationModal: {
      title: '¿Activar Compartir Ubicación?',
      body: 'Tu ubicación se usará para mostrarte a clientes en tu área. TradeLink nunca compartirá tu ubicación exacta públicamente.',
      allow: 'Permitir',
      decline: 'Ahora no',
    },
    placeholders: {
      fullName: 'Juan García',
      email: 'tu@gmail.com',
      phone: '+1 (555) 000-0000',
      address: 'Calle Principal 123, Ciudad',
    },
    fileHint: 'PDF, Word o imagen — máx. 10 MB',
    submit: 'Crear Cuenta',
    submitting: 'Creando cuenta…',
    loginPrompt: '¿Ya tienes cuenta?',
    login: 'Iniciar sesión',
    errors: {
      passwordMatch: 'Las contraseñas no coinciden',
      required: 'Todos los campos son obligatorios',
    },
  },
};

// ── Shared input style ────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition';

const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

function SectionHeader({ children }) {
  return (
    <div className="flex items-center gap-3 mb-5 mt-8 first:mt-0">
      <div className="h-px flex-1 bg-gradient-to-r from-sky-200 to-transparent" />
      <span className="text-sm font-bold text-sky-600 uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="h-px flex-1 bg-gradient-to-l from-amber-200 to-transparent" />
    </div>
  );
}

function FileField({ label, hint, name, accept, onChange, value }) {
  const inputRef = useRef();
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current.click()}
        className="w-full rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 px-4 py-4 text-sm text-sky-500 font-medium transition flex items-center gap-3"
      >
        <span className="text-xl">📎</span>
        <span className="truncate flex-1 text-left">
          {value ? value.name : <span className="text-slate-400">{hint}</span>}
        </span>
        {value && <span className="text-green-500 text-lg">✓</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files[0] || null)}
      />
    </div>
  );
}

export default function TradeRegister() {
  const { lang } = useUIStore();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = content[lang];

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    phone: '', professionality: '', address: '',
    locationConsent: false, latitude: null, longitude: null,
  });
  const [files, setFiles] = useState({
    photo: null, licenseDoc: null, insuranceDoc: null, cv: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handlePhotoChange = (file) => {
    setFiles((f) => ({ ...f, photo: file }));
    if (file) setPhotoPreview(URL.createObjectURL(file));
  };

  const handleLocationToggle = () => {
    if (!form.locationConsent) {
      setShowLocationModal(true);
    } else {
      setForm((f) => ({ ...f, locationConsent: false, latitude: null, longitude: null }));
    }
  };

  const handleLocationAllow = () => {
    setShowLocationModal(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          locationConsent: true,
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
      },
      () => {
        setForm((f) => ({ ...f, locationConsent: true }));
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError(t.errors.passwordMatch);
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== 'confirmPassword') fd.append(k, v);
      });
      Object.entries(files).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });

      const data = await registerTrade(fd);
      setAuth(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden">
      <Navbar />

      {/* Location consent modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="text-4xl mb-4 text-center">📍</div>
            <h3 className="text-xl font-bold text-slate-800 mb-3 text-center">
              {t.locationModal.title}
            </h3>
            <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">
              {t.locationModal.body}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLocationModal(false)}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:border-slate-300 transition"
              >
                {t.locationModal.decline}
              </button>
              <button
                onClick={handleLocationAllow}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 text-white font-semibold text-sm shadow hover:from-sky-400 transition"
              >
                {t.locationModal.allow}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-sky-200">
            🔧 Professional Trade Area
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-br from-sky-500 via-sky-400 to-amber-400 bg-clip-text text-transparent">
              {t.title}
            </span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-sky-100 p-8 space-y-5">

          {/* ── Personal ── */}
          <SectionHeader>{t.sections.personal}</SectionHeader>

          {/* Profile photo */}
          <div>
            <label className={labelCls}>{t.fields.photo}</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-100 border-2 border-sky-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {photoPreview
                  ? <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  : <span className="text-2xl">👤</span>}
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('photoInput').click()}
                className="flex-1 rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 px-4 py-3 text-sm text-sky-500 font-medium transition flex items-center gap-2"
              >
                <span>📷</span>
                <span className="truncate">
                  {files.photo ? files.photo.name : <span className="text-slate-400">Upload photo (JPG, PNG)</span>}
                </span>
                {files.photo && <span className="text-green-500">✓</span>}
              </button>
              <input
                id="photoInput"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoChange(e.target.files[0] || null)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.fields.fullName}</label>
            <input className={inputCls} required value={form.fullName} onChange={set('fullName')} placeholder={t.placeholders.fullName} />
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

          {/* ── Professional ── */}
          <SectionHeader>{t.sections.professional}</SectionHeader>

          <div>
            <label className={labelCls}>{t.fields.professionality}</label>
            <select className={inputCls} required value={form.professionality} onChange={set('professionality')}>
              <option value="">{t.fields.professionality}</option>
              {TRADE_PROFESSIONALITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>{t.fields.address}</label>
            <input className={inputCls} required value={form.address} onChange={set('address')} placeholder={t.placeholders.address} />
          </div>

          {/* ── Documents ── */}
          <SectionHeader>{t.sections.documents}</SectionHeader>

          <FileField
            label={t.fields.licenseDoc}
            hint={t.fileHint}
            name="licenseDoc"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            value={files.licenseDoc}
            onChange={(f) => setFiles((prev) => ({ ...prev, licenseDoc: f }))}
          />
          <FileField
            label={t.fields.insuranceDoc}
            hint={t.fileHint}
            name="insuranceDoc"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            value={files.insuranceDoc}
            onChange={(f) => setFiles((prev) => ({ ...prev, insuranceDoc: f }))}
          />
          <FileField
            label={t.fields.cv}
            hint={t.fileHint}
            name="cv"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            value={files.cv}
            onChange={(f) => setFiles((prev) => ({ ...prev, cv: f }))}
          />

          {/* ── Location ── */}
          <SectionHeader>{t.sections.location}</SectionHeader>

          <button
            type="button"
            onClick={handleLocationToggle}
            className={`w-full flex items-center gap-4 rounded-2xl border-2 px-5 py-4 transition-all duration-200 ${
              form.locationConsent
                ? 'border-sky-400 bg-sky-50'
                : 'border-slate-200 bg-white/60 hover:border-sky-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
              form.locationConsent ? 'bg-sky-500' : 'bg-slate-100'
            }`}>
              📍
            </div>
            <div className="text-left flex-1">
              <p className={`font-semibold text-sm ${form.locationConsent ? 'text-sky-700' : 'text-slate-700'}`}>
                {t.fields.locationConsent}
                {form.locationConsent && form.latitude && (
                  <span className="ml-2 text-xs font-normal text-sky-500">✓ Location acquired</span>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{t.fields.locationDesc}</p>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
              form.locationConsent ? 'bg-sky-500' : 'bg-slate-200'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                form.locationConsent ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </div>
          </button>

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
            className="w-full bg-gradient-to-r from-sky-500 to-amber-400 hover:from-sky-400 hover:to-amber-300 disabled:opacity-60 text-white font-semibold text-base py-4 rounded-2xl shadow-lg shadow-sky-200 transition-all duration-200 active:scale-[0.99] mt-2"
          >
            {loading ? t.submitting : t.submit}
          </button>

          <p className="text-center text-sm text-slate-400 pt-1">
            {t.loginPrompt}{' '}
            <button type="button" onClick={() => navigate('/login')} className="text-sky-500 font-semibold hover:underline">
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
