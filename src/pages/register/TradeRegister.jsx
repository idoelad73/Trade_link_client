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
      bank: 'Bank Account (Payouts)',
    },
    fields: {
      fullName: 'Full Name',
      email: 'Gmail Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      phone: 'Phone Number',
      professionality: 'Select your trade',
      address: 'Street Address',
      city: 'City',
      state: 'State',
      zip: 'ZIP Code',
      hourlyRate: 'Hourly Rate (optional)',
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
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
    },
    fileHint: 'PDF, Word, or image — max 10 MB',
    submit: 'Create Account',
    submitting: 'Creating account…',
    loginPrompt: 'Already have an account?',
    login: 'Sign in',
    bank: {
      holderName:   'Account Holder Name',
      holderType:   'Account Holder Type',
      holderTypes:  { individual: 'Individual', company: 'Company' },
      dob:          'Date of Birth',
      ssnLast4:     'Last 4 digits of SSN',
      routing:      'Routing Number',
      account:      'Account Number',
      confirmAcct:  'Confirm Account Number',
      skip:         'Skip for now (connect bank later)',
      tokenizing:   'Setting up payout account…',
      secureNote:   '🔒 Bank numbers are tokenized by Stripe — your raw numbers never reach our server.',
      tos:          'By connecting my bank account, I agree to the Stripe Connected Account Agreement and authorize TradeLink to create a payout account on my behalf.',
      tosLink:      'Stripe Connected Account Agreement',
      mismatch:     'Account numbers do not match',
      stripeError:  'Bank account setup failed',
      dobRequired:  'Date of birth is required.',
      ssnRequired:  'Please enter the last 4 digits of your SSN.',
    },
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
      bank: 'Cuenta Bancaria (Pagos)',
    },
    fields: {
      fullName: 'Nombre Completo',
      email: 'Correo Gmail',
      password: 'Contraseña',
      confirmPassword: 'Confirmar Contraseña',
      phone: 'Número de Teléfono',
      professionality: 'Selecciona tu oficio',
      address: 'Calle / Dirección',
      city: 'Ciudad',
      state: 'Estado',
      zip: 'Código Postal',
      hourlyRate: 'Tarifa por Hora (opcional)',
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
      address: 'Calle Principal 123',
      city: 'Miami',
      state: 'FL',
      zip: '33101',
    },
    fileHint: 'PDF, Word o imagen — máx. 10 MB',
    submit: 'Crear Cuenta',
    submitting: 'Creando cuenta…',
    loginPrompt: '¿Ya tienes cuenta?',
    login: 'Iniciar sesión',
    bank: {
      holderName:   'Nombre del Titular',
      holderType:   'Tipo de Titular',
      holderTypes:  { individual: 'Personal', company: 'Empresa' },
      dob:          'Fecha de Nacimiento',
      ssnLast4:     'Últimos 4 dígitos del SSN',
      routing:      'Número de Ruta',
      account:      'Número de Cuenta',
      confirmAcct:  'Confirmar Número de Cuenta',
      skip:         'Omitir por ahora (conectar banco después)',
      tokenizing:   'Configurando cuenta de pagos…',
      secureNote:   '🔒 Los datos bancarios son tokenizados por Stripe y nunca llegan a nuestro servidor.',
      tos:          'Al conectar mi cuenta bancaria, acepto el Acuerdo de Cuenta Conectada de Stripe y autorizo a TradeLink a crear una cuenta de pagos en mi nombre.',
      tosLink:      'Acuerdo de Cuenta Conectada de Stripe',
      mismatch:     'Los números de cuenta no coinciden',
      stripeError:  'La configuración de cuenta bancaria falló',
      dobRequired:  'La fecha de nacimiento es requerida.',
      ssnRequired:  'Por favor ingresa los últimos 4 dígitos de tu SSN.',
    },
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
  const { lang, openModal } = useUIStore();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const t = content[lang];

  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    phone: '', professionality: '', address: '',
    city: '', state: '', zip: '',
    hourlyRate: '',
    locationConsent: false, latitude: null, longitude: null,
  });
  const [files, setFiles] = useState({
    photo: null, licenseDoc: null, insuranceDoc: null, cv: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [error, setError]         = useState('');
  const [emailTaken, setEmailTaken] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  // ── Bank account fields ───────────────────────────────────────────────────
  const [skipBank,  setSkipBank]  = useState(false);
  const [bankForm,  setBankForm]  = useState({
    holderName:    '',
    holderType:    'individual', // most tradespeople are sole proprietors
    dob:           '',           // YYYY-MM-DD from <input type="date">
    ssnLast4:      '',           // last 4 digits — sent to server, never stored in DB
    routingNumber: '',
    accountNumber: '',
    confirmAcct:   '',
  });
  const setBank = (field) => (e) => {
    // For numeric fields, strip any non-digit characters automatically
    const numericFields = ['routingNumber', 'accountNumber', 'confirmAcct'];
    const val = numericFields.includes(field) ? e.target.value.replace(/\D/g, '') : e.target.value;
    setBankForm((b) => ({ ...b, [field]: val }));
  };

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

    // Bank validation (only when not skipped)
    if (!skipBank) {
      if (!bankForm.dob) {
        return setError(t.bank.dobRequired);
      }
      if (bankForm.ssnLast4.length !== 4) {
        return setError(t.bank.ssnRequired);
      }
      if (bankForm.routingNumber.length !== 9) {
        return setError('Routing number must be exactly 9 digits.');
      }
      if (bankForm.accountNumber.length < 4) {
        return setError('Please enter a valid account number.');
      }
      if (bankForm.accountNumber !== bankForm.confirmAcct) {
        return setError(t.bank.mismatch);
      }
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

      // ── KYC fields — sent to server (HTTPS), never stored in DB ──────────
      if (!skipBank) {
        fd.append('holderType', bankForm.holderType);
        fd.append('dob',        bankForm.dob);
        fd.append('ssnLast4',   bankForm.ssnLast4);
      }

      // ── Tokenize bank account via Stripe.js (CDN) ───────────────────────
      // Raw routing/account numbers stay in the browser — only the btok_... token is sent
      console.log('[Register] skipBank:', skipBank);
      console.log('[Register] bankForm.routingNumber:', bankForm.routingNumber ? '✅ present' : '❌ empty');
      console.log('[Register] bankForm.accountNumber:', bankForm.accountNumber ? '✅ present' : '❌ empty');

      if (!skipBank && bankForm.routingNumber && bankForm.accountNumber) {
        console.log('[Stripe.js] Tokenizing bank account...');
        const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
        const { token, error: stripeErr } = await stripe.createToken('bank_account', {
          country:              'US',
          currency:             'usd',
          routing_number:       bankForm.routingNumber,
          account_number:       bankForm.accountNumber,
          account_holder_name:  bankForm.holderName || form.fullName,
          account_holder_type:  bankForm.holderType,
        });

        if (stripeErr) {
          console.error('[Stripe.js] ❌ createToken error:', stripeErr.message);
          setError(stripeErr.message ?? t.bank.stripeError);
          setLoading(false);
          return;
        }

        console.log('[Stripe.js] ✅ Bank token created:', token.id);
        fd.append('bankToken', token.id);
      } else {
        console.log('[Register] Bank tokenization skipped');
      }

      console.log('[Register] Sending registration request...');
      const data = await registerTrade(fd);
      console.log('[Register] ✅ Registered — stripeAccountId set:', !!data.user?.stripeAccountId);
      setAuth(data);
      // Custom accounts are verified in the background by Stripe — no redirect needed
      navigate('/dashboard/trade');
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>{t.fields.city}</label>
              <input className={inputCls} required value={form.city} onChange={set('city')} placeholder={t.placeholders.city} />
            </div>
            <div>
              <label className={labelCls}>{t.fields.state}</label>
              <input className={inputCls} required value={form.state} onChange={set('state')} placeholder={t.placeholders.state} maxLength={2} style={{textTransform:'uppercase'}} />
            </div>
            <div>
              <label className={labelCls}>{t.fields.zip}</label>
              <input className={inputCls} required value={form.zip} onChange={(e) => setForm(f => ({...f, zip: e.target.value.replace(/\D/g,'')}))} placeholder={t.placeholders.zip} maxLength={5} inputMode="numeric" />
            </div>
          </div>

          <div>
            <label className={labelCls}>{t.fields.hourlyRate}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">$</span>
              <input
                className={inputCls + ' pl-8'}
                type="number"
                min="0"
                step="0.01"
                value={form.hourlyRate}
                onChange={set('hourlyRate')}
                placeholder="0.00"
              />
            </div>
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

          {/* ── Bank Account ── */}
          <SectionHeader>{t.sections.bank}</SectionHeader>

          {/* Skip toggle */}
          <button
            type="button"
            onClick={() => setSkipBank((v) => !v)}
            className={`w-full flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-sm transition ${
              skipBank
                ? 'border-slate-200 bg-slate-50 text-slate-500'
                : 'border-sky-200 bg-sky-50/50 text-sky-600'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              skipBank ? 'border-slate-300 bg-white' : 'border-sky-400 bg-sky-400'
            }`}>
              {!skipBank && <span className="text-white text-xs font-bold">✓</span>}
            </div>
            <span className="font-medium">
              {skipBank ? t.bank.skip : '🏦 Connect bank account for automatic payouts'}
            </span>
          </button>

          {!skipBank && (
            <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/30 p-4">

              {/* Holder name + type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.bank.holderName}</label>
                  <input
                    className={inputCls}
                    value={bankForm.holderName}
                    onChange={setBank('holderName')}
                    placeholder={form.fullName || 'John Smith'}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t.bank.holderType}</label>
                  <select
                    className={inputCls}
                    value={bankForm.holderType}
                    onChange={setBank('holderType')}
                  >
                    <option value="individual">{t.bank.holderTypes.individual}</option>
                    <option value="company">{t.bank.holderTypes.company} ⚠️</option>
                  </select>
                  {bankForm.holderType === 'company' && (
                    <p className="mt-1 text-[11px] text-amber-600 font-medium">
                      ⚠️ Company accounts require additional verification (tax ID, owners, representative). Most tradespeople should choose Individual.
                    </p>
                  )}
                </div>
              </div>

              {/* DOB + SSN last 4 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.bank.dob}</label>
                  <input
                    className={inputCls}
                    type="date"
                    value={bankForm.dob}
                    onChange={setBank('dob')}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().slice(0, 10)}
                  />
                </div>
                <div>
                  <label className={labelCls}>{t.bank.ssnLast4}</label>
                  <input
                    className={inputCls}
                    value={bankForm.ssnLast4}
                    onChange={setBank('ssnLast4')}
                    placeholder="1234"
                    maxLength={4}
                    inputMode="numeric"
                    type="password"
                  />
                </div>
              </div>

              {/* Routing number */}
              <div>
                <label className={labelCls}>
                  {t.bank.routing}
                  <span className="ml-2 text-slate-400 font-normal text-xs">
                    ({bankForm.routingNumber.length}/9 digits)
                  </span>
                </label>
                <input
                  className={inputCls}
                  value={bankForm.routingNumber}
                  onChange={setBank('routingNumber')}
                  placeholder="110000000"
                  maxLength={9}
                  inputMode="numeric"
                  pattern="\d{9}"
                />
              </div>

              {/* Account number + confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>{t.bank.account}</label>
                  <input
                    className={inputCls}
                    type="password"
                    value={bankForm.accountNumber}
                    onChange={setBank('accountNumber')}
                    placeholder="••••••••••••"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className={labelCls}>{t.bank.confirmAcct}</label>
                  <input
                    className={inputCls}
                    type="password"
                    value={bankForm.confirmAcct}
                    onChange={setBank('confirmAcct')}
                    placeholder="••••••••••••"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Stripe ToS agreement — required by Stripe for Custom accounts */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-sky-500 accent-sky-500 flex-shrink-0"
                />
                <span className="text-[11px] text-slate-500 leading-relaxed">
                  {t.bank.tos.split(t.bank.tosLink)[0]}
                  <a
                    href="https://stripe.com/legal/connect-account"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-500 underline hover:text-sky-700"
                  >
                    {t.bank.tosLink}
                  </a>
                  {t.bank.tos.split(t.bank.tosLink)[1]}
                </span>
              </label>

              <p className="text-[11px] text-slate-400">{t.bank.secureNote}</p>
            </div>
          )}

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
          {emailTaken && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700 flex items-start gap-3">
              <span className="text-lg leading-none mt-0.5">📧</span>
              <div>
                <p className="font-semibold">This email is already registered.</p>
                <p className="mt-0.5 text-amber-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => openModal('loginTrade')}
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
