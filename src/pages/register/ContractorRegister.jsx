import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Navbar from '../../components/Navbar';
import useUIStore from '../../stores/uiStore';
import useAuthStore from '../../stores/authStore';
import { registerContractor } from '../../api/auth.js';
import { CONTRACTOR_EXPERTISE } from '../../constants/trades.js';

const emailSchema = z.object({
  email:        z.string().email('Invalid email address'),
  confirmEmail: z.string(),
}).refine(d => d.email === d.confirmEmail, {
  message: 'Email addresses do not match',
  path: ['confirmEmail'],
});

/* ── inline address autocomplete ── */
function fmtAddr(p) {
  const parts = [];
  if (p.housenumber && p.street) parts.push(`${p.housenumber} ${p.street}`);
  else if (p.street) parts.push(p.street);
  else if (p.name)   parts.push(p.name);
  if (p.city)     parts.push(p.city);
  if (p.state)    parts.push(p.state);
  if (p.postcode) parts.push(p.postcode);
  return parts.join(', ');
}

function AddressField({ onChange, inputCls, placeholder, required }) {
  const [query,   setQuery]   = useState('');   // local — not tied to parent re-render
  const [items,   setItems]   = useState([]);
  const [busy,    setBusy]    = useState(false);
  const [hi,      setHi]      = useState(-1);
  const [dropPos, setDropPos] = useState(null);
  const inputRef = useRef(null);
  const skipRef  = useRef(false);

  // ── Debounced search via useEffect ──────────────────────────────────────
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    const q = query.trim();
    if (q.length < 3) { setItems([]); setBusy(false); return; }

    let cancelled = false;
    setBusy(true);

    const tid = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/address/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (cancelled) return;
        const list = (data.features || [])
          .map(f => fmtAddr(f.properties))
          .filter(Boolean)
          .filter((a, i, arr) => arr.indexOf(a) === i);
        setItems(list); setHi(-1);
        if (list.length && inputRef.current) {
          const r = inputRef.current.getBoundingClientRect();
          setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
        }
      } catch { if (!cancelled) setItems([]); }
      finally  { if (!cancelled) setBusy(false); }
    }, 400);

    return () => { cancelled = true; clearTimeout(tid); };
  }, [query]);

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => { if (inputRef.current && !inputRef.current.parentNode.contains(e.target)) setItems([]); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  function onInput(e) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
  }

  function pick(addr) {
    skipRef.current = true;
    setQuery(addr);
    onChange(addr);
    setItems([]); setHi(-1);
  }

  function onKey(e) {
    if (e.key === 'ArrowDown')            { e.preventDefault(); setHi(h => Math.min(h + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp')         { e.preventDefault(); setHi(h => Math.max(h - 1, -1)); }
    else if (e.key === 'Enter' && hi >= 0){ e.preventDefault(); pick(items[hi]); }
    else if (e.key === 'Escape')            setItems([]);
  }

  const charsLeft = 3 - query.trim().length;

  return (
    <div className="relative">
      <style>{`@keyframes addr-spin{to{transform:rotate(360deg)}}`}</style>
      <div className="relative">
        <input
          ref={inputRef} type="text" autoComplete="off" required={required}
          value={query} onChange={onInput} onKeyDown={onKey}
          placeholder={placeholder} className={inputCls}
        />
        {busy && (
          <span aria-hidden style={{position:'absolute',right:12,top:'50%',marginTop:-7,width:14,height:14,border:'2px solid #f59e0b',borderTopColor:'transparent',borderRadius:'50%',animation:'addr-spin 0.65s linear infinite',display:'inline-block'}}/>
        )}
      </div>

      {busy && <p style={{fontSize:11,color:'#d97706',marginTop:3}}>Searching…</p>}
      {!busy && query.trim().length > 0 && charsLeft > 0 && (
        <p style={{fontSize:11,color:'#94a3b8',marginTop:3}}>
          Type {charsLeft} more character{charsLeft !== 1 ? 's' : ''} to search…
        </p>
      )}

      {items.length > 0 && dropPos && (
        <ul style={{position:'fixed',top:dropPos.top,left:dropPos.left,width:dropPos.width,zIndex:9999,background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,boxShadow:'0 8px 30px rgba(0,0,0,.12)',overflow:'hidden',fontSize:14,margin:0,padding:0,listStyle:'none'}}>
          {items.map((addr, i) => (
            <li key={addr}
              onMouseDown={e => { e.preventDefault(); pick(addr); }}
              onMouseEnter={() => setHi(i)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'10px 16px',cursor:'pointer',background:i===hi?'#fffbeb':'#fff',color:i===hi?'#92400e':'#334155',borderTop:i>0?'1px solid #f1f5f9':'none'}}>
              <span>📍</span>
              <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{addr}</span>
            </li>
          ))}
          <li style={{padding:'4px 16px',fontSize:10,color:'#94a3b8',borderTop:'1px solid #f1f5f9'}}>
            <a href="https://photon.komoot.io" target="_blank" rel="noreferrer" style={{textDecoration:'underline'}}>Photon / OpenStreetMap</a>
          </li>
        </ul>
      )}
    </div>
  );
}

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
      email: 'Email Address',
      confirmEmail: 'Confirm Email Address',
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
      emailMatch: 'Email addresses do not match',
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
      email: 'Correo Electrónico',
      confirmEmail: 'Confirmar Correo Electrónico',
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
      emailMatch: 'Los correos electrónicos no coinciden',
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
    companyName: '', email: '', confirmEmail: '', password: '', confirmPassword: '',
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

    const emailValidation = emailSchema.safeParse({ email: form.email, confirmEmail: form.confirmEmail });
    if (!emailValidation.success) {
      return setError(emailValidation.error.errors[0].message);
    }

    if (form.password !== form.confirmPassword) {
      return setError(t.errors.passwordMatch);
    }
    if (expertise.length === 0) {
      return setError(t.errors.expertiseRequired);
    }

    setLoading(true);
    try {
      const { confirmPassword: _, confirmEmail: __, ...payload } = form;
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
              <input className={inputCls} type="email" required value={form.email} onChange={set('email')} placeholder={t.placeholders.email} autoComplete="email" />
            </div>
            <div>
              <label className={labelCls}>{t.fields.phone}</label>
              <input className={inputCls} type="tel" required value={form.phone} onChange={set('phone')} placeholder={t.placeholders.phone} />
            </div>
          </div>

          {/* Confirm email — full width with live match indicator */}
          <div>
            <label className={labelCls}>{t.fields.confirmEmail}</label>
            <div className="relative">
              <input
                className={inputCls + ' pr-10'}
                type="email"
                required
                autoComplete="off"
                value={form.confirmEmail}
                onChange={set('confirmEmail')}
                placeholder={t.placeholders.email}
              />
              {form.confirmEmail.length > 0 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-base font-bold ${
                  form.email === form.confirmEmail ? 'text-green-500' : 'text-red-400'
                }`}>
                  {form.email === form.confirmEmail ? '✓' : '✗'}
                </span>
              )}
            </div>
            {form.confirmEmail.length > 0 && form.email !== form.confirmEmail && (
              <p className="mt-1 text-xs text-red-500 font-medium">{t.errors.emailMatch}</p>
            )}
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
            <AddressField
              onChange={(val) => setForm((f) => ({ ...f, address: val }))}
              placeholder={t.placeholders.address}
              inputCls={inputCls}
              required
            />
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
