import { useState, useEffect, useRef } from 'react';
import { getMe, updateMe, updateLocation, updateWorkingHours, addPortfolioPhoto, deletePortfolioPhoto } from '../../api/trade.js';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_LABELS = { monday:'Mon', tuesday:'Tue', wednesday:'Wed', thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun' };
const DAY_FULL   = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };

const DEFAULT_HOURS = Object.fromEntries(
  DAYS.map(d => [d, { active: false, start: '08:00', end: '17:00' }])
);

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  );
}

// ── Tab 1: Trade Info (view + edit) ──────────────────────────────────────────
function TradeInfoTab({ trade, t, onSaved }) {
  const setUser = useAuthStore((s) => s.setUser);
  const user    = useAuthStore((s) => s.user);

  const [mode,         setMode]         = useState('view');
  const [form,         setForm]         = useState({});
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [locStatus,    setLocStatus]    = useState('');
  const photoInputRef = useRef();

  useEffect(() => {
    if (trade) {
      setForm({
        fullName:        trade.fullName,
        phone:           trade.phone,
        address:         trade.address,
        professionality: trade.professionality,
        hourlyRate:      trade.hourlyRate ?? '',
        locationConsent: trade.locationConsent ?? false,
      });
    }
  }, [trade]);

  const handleLocationToggle = () => {
    const enabling = !form.locationConsent;
    if (enabling) {
      if (!navigator.geolocation) { setLocStatus('denied'); return; }
      setLocStatus('acquiring');
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setForm(f => ({ ...f, locationConsent: true }));
          setLocStatus('ok');
          updateLocation(coords.latitude, coords.longitude).catch(() => {});
        },
        () => { setLocStatus('denied'); setForm(f => ({ ...f, locationConsent: false })); },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } else {
      setForm(f => ({ ...f, locationConsent: false }));
      setLocStatus('');
    }
  };

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      let payload;
      if (photoFile) {
        payload = new FormData();
        Object.entries(form).forEach(([k, v]) => payload.append(k, String(v)));
        payload.append('photo', photoFile);
      } else {
        payload = form;
      }
      const updated = await updateMe(payload);
      setUser({ ...user, fullName: updated.fullName });
      setPhotoFile(null); setPhotoPreview(null);
      setMode('view');
      onSaved(updated);
    } catch {
      setError(t.error);
    } finally {
      setSaving(false);
    }
  };

  if (!trade) return null;

  if (mode === 'view') return (
    <div className="space-y-5">
      {trade.photo && (
        <div className="flex justify-center mb-2">
          <img src={trade.photo} alt={trade.fullName} className="w-20 h-20 rounded-2xl object-cover border-2 border-sky-100 shadow" />
        </div>
      )}
      <Field label={t.labels.name}    value={trade.fullName} />
      <Field label={t.labels.email}   value={trade.email} />
      <Field label={t.labels.phone}   value={trade.phone} />
      <Field label={t.labels.trade}   value={trade.professionality} />
      <Field label={t.labels.address} value={trade.address} />
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t.labels.hourlyRate}</p>
        {trade.hourlyRate != null
          ? <p className="text-sm font-extrabold text-emerald-600">${trade.hourlyRate}<span className="text-xs font-normal text-slate-400 ml-0.5">/hr</span></p>
          : <p className="text-sm text-slate-400">—</p>}
      </div>
      <div className="grid grid-cols-2 gap-4 pt-1">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t.labels.docs}</p>
          <div className="flex flex-col gap-1 mt-1">
            {[
              { label: t.labels.license,   url: trade.licenseDoc },
              { label: t.labels.insurance, url: trade.insuranceDoc },
              { label: t.labels.cv,        url: trade.cv },
            ].map(({ label, url }) => (
              <span key={label} className={`text-xs font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${url ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                {url ? '✓' : '—'} {label}
              </span>
            ))}
          </div>
        </div>
        <div>
          <Field label={t.labels.since}  value={trade.createdAt ? new Date(trade.createdAt).toLocaleDateString() : '—'} />
          <div className="mt-3"><Field label={t.labels.logins} value={trade.loginCount ?? '—'} /></div>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t.labels.location}</p>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trade.locationConsent ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
          {trade.locationConsent ? t.labels.locOn : t.labels.locOff}
        </span>
      </div>

      <div className="pt-2">
        <button onClick={() => setMode('edit')}
          className="w-full bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold py-3 rounded-2xl shadow shadow-sky-200 transition-all active:scale-[0.99] text-sm">
          {t.btn.update}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Photo upload */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{t.labels.photo}</label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-sky-100 flex-shrink-0 bg-sky-50 flex items-center justify-center">
            {photoPreview || trade.photo
              ? <img src={photoPreview || trade.photo} alt="preview" className="w-full h-full object-cover" />
              : <span className="text-2xl">👤</span>}
          </div>
          <button type="button" onClick={() => photoInputRef.current.click()}
            className="flex-1 rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 px-4 py-3 text-sm text-sky-500 font-medium transition flex items-center gap-2">
            <span>📷</span>
            <span className="truncate text-left">
              {photoFile ? photoFile.name : <span className="text-slate-400">{t.labels.photoHint}</span>}
            </span>
            {photoFile && <span className="text-green-500 ml-auto">✓</span>}
          </button>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setPhotoFile(f); setPhotoPreview(URL.createObjectURL(f)); }}} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.name}</label>
        <input className={inputCls} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.phone}</label>
        <input className={inputCls} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.address}</label>
        <input className={inputCls} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.hourlyRate}</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm pointer-events-none">$</span>
          <input className={`${inputCls} pl-8`} type="number" min="0" step="0.01" placeholder="0.00"
            value={form.hourlyRate} onChange={e => setForm(f => ({ ...f, hourlyRate: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.trade}</label>
        <select className={inputCls} value={form.professionality} onChange={e => setForm(f => ({ ...f, professionality: e.target.value }))}>
          {TRADE_PROFESSIONALITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Location toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.location}</label>
        <button type="button" onClick={handleLocationToggle} disabled={locStatus === 'acquiring'}
          className={`w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all ${form.locationConsent ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-300'} disabled:opacity-60`}>
          <span className="text-lg">📍</span>
          <span className={`flex-1 text-left text-sm font-medium ${form.locationConsent ? 'text-sky-700' : 'text-slate-600'}`}>
            {locStatus === 'acquiring' ? 'Acquiring location…' : form.locationConsent ? t.labels.locOn : t.labels.locOff}
          </span>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${form.locationConsent ? 'bg-sky-500' : 'bg-slate-200'}`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${form.locationConsent ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>
        {locStatus === 'denied' && <p className="mt-1 text-xs text-amber-600">⚠️ Location access denied. Please allow it in your browser settings.</p>}
        {locStatus === 'ok'     && <p className="mt-1 text-xs text-sky-600">✓ Location acquired and updated.</p>}
      </div>

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-sky-200 transition-all active:scale-[0.99] text-sm">
          {saving ? t.btn.saving : t.btn.save}
        </button>
        <button onClick={() => { setMode('view'); setError(''); }}
          className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">
          {t.btn.cancel}
        </button>
      </div>
    </div>
  );
}

// ── Tab 2: Working Hours ──────────────────────────────────────────────────────
function WorkingHoursTab({ trade }) {
  const [hours,   setHours]   = useState(DEFAULT_HOURS);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (trade?.workingHours) {
      const merged = { ...DEFAULT_HOURS };
      DAYS.forEach(d => {
        if (trade.workingHours[d]) merged[d] = { ...DEFAULT_HOURS[d], ...trade.workingHours[d] };
      });
      setHours(merged);
    }
  }, [trade]);

  const toggle = (day) => setHours(h => ({ ...h, [day]: { ...h[day], active: !h[day].active } }));
  const setTime = (day, field, val) => setHours(h => ({ ...h, [day]: { ...h[day], [field]: val } }));

  const handleSave = async () => {
    setError(''); setSaving(true); setSaved(false);
    try {
      await updateWorkingHours(hours);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 mb-4">Set your regular weekly availability. Contractors will see when you're open for work.</p>

      {DAYS.map(day => {
        const { active, start, end } = hours[day];
        return (
          <div key={day} className={`rounded-2xl border-2 px-4 py-3 transition-all ${active ? 'border-sky-200 bg-sky-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex items-center gap-3">
              {/* Toggle */}
              <button type="button" onClick={() => toggle(day)}
                className={`w-10 h-5 rounded-full relative flex-shrink-0 transition-colors ${active ? 'bg-sky-500' : 'bg-slate-200'}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow absolute top-0.5 transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>

              {/* Day label */}
              <span className={`w-10 text-sm font-bold flex-shrink-0 ${active ? 'text-sky-700' : 'text-slate-400'}`}>
                {DAY_LABELS[day]}
              </span>
              <span className={`flex-1 text-xs hidden sm:block ${active ? 'text-sky-600' : 'text-slate-400'}`}>
                {DAY_FULL[day]}
              </span>

              {/* Time pickers */}
              {active ? (
                <div className="flex items-center gap-2 ml-auto">
                  <input type="time" value={start} onChange={e => setTime(day, 'start', e.target.value)}
                    className="rounded-xl border border-sky-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-300 transition" />
                  <span className="text-xs text-slate-400 font-medium">to</span>
                  <input type="time" value={end} onChange={e => setTime(day, 'end', e.target.value)}
                    className="rounded-xl border border-sky-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-sky-300 transition" />
                </div>
              ) : (
                <span className="ml-auto text-xs text-slate-300 italic">Unavailable</span>
              )}
            </div>
          </div>
        );
      })}

      {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="pt-2">
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-sky-200 transition-all active:scale-[0.99] text-sm">
          {saving ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
          ) : saved ? '✓ Saved!' : '💾 Save Working Hours'}
        </button>
      </div>
    </div>
  );
}

// ── Tab 3: Portfolio Photos ───────────────────────────────────────────────────
function PhotosTab({ trade, onPhotosChanged }) {
  const [photos,    setPhotos]    = useState(trade?.portfolioPhotos ?? []);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const fileInputRef = useRef();

  useEffect(() => {
    setPhotos(trade?.portfolioPhotos ?? []);
  }, [trade]);

  const handleAdd = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (photos.length >= 5) return;
    setError(''); setUploading(true);
    try {
      const updated = await addPortfolioPhoto(file);
      setPhotos(updated);
      onPhotosChanged(updated);
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (idx) => {
    setError('');
    try {
      const updated = await deletePortfolioPhoto(idx);
      setPhotos(updated);
      onPhotosChanged(updated);
    } catch {
      setError('Failed to delete photo.');
    }
  };

  const slots = [...photos];
  if (slots.length < 5) slots.push(null); // one "add" slot

  return (
    <div>
      <p className="text-xs text-slate-400 mb-5">Add up to 5 photos to showcase your work. These are visible to contractors searching for your trade.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {slots.map((url, idx) =>
          url ? (
            <div key={idx} className="relative group rounded-2xl overflow-hidden border-2 border-slate-100 aspect-square">
              <img src={url} alt={`Portfolio ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => handleDelete(idx)}
                className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow">🗑 Remove</span>
              </button>
              <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                {idx + 1}/5
              </span>
            </div>
          ) : (
            <button
              key="add"
              type="button"
              onClick={() => !uploading && fileInputRef.current.click()}
              disabled={uploading}
              className="rounded-2xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 aspect-square flex flex-col items-center justify-center gap-2 transition disabled:opacity-60"
            >
              {uploading ? (
                <span className="w-6 h-6 border-2 border-sky-300 border-t-sky-500 rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-2xl">📸</span>
                  <span className="text-xs font-semibold text-sky-500">Add Photo</span>
                  <span className="text-[10px] text-slate-400">{photos.length}/5 used</span>
                </>
              )}
            </button>
          )
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAdd} />

      {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
const content = {
  en: {
    badge: '🔧 Trade Professional',
    tabs:  { info: 'Trade Info', hours: 'Working Hours', photos: 'Photos' },
    labels: {
      name: 'Full Name', email: 'Email', phone: 'Phone', trade: 'Trade',
      address: 'Address', hourlyRate: 'Hourly Rate ($/hr)', photo: 'Profile Photo',
      photoHint: 'Click to change photo', docs: 'Documents', license: 'License',
      insurance: 'Insurance', cv: 'CV', since: 'Member Since', logins: 'Total Logins',
      location: 'Location Sharing', locOn: '📍 Enabled', locOff: 'Disabled',
    },
    btn: { update: 'Update Details', close: 'Close', save: 'Save Changes', saving: 'Saving…', cancel: 'Cancel' },
    error: 'Update failed. Please try again.',
  },
  es: {
    badge: '🔧 Profesional de Oficios',
    tabs:  { info: 'Info del Oficio', hours: 'Horario Laboral', photos: 'Fotos' },
    labels: {
      name: 'Nombre Completo', email: 'Correo', phone: 'Teléfono', trade: 'Oficio',
      address: 'Dirección', hourlyRate: 'Tarifa por Hora ($/hr)', photo: 'Foto de Perfil',
      photoHint: 'Clic para cambiar foto', docs: 'Documentos', license: 'Licencia',
      insurance: 'Seguro', cv: 'CV', since: 'Miembro Desde', logins: 'Inicios de Sesión',
      location: 'Compartir Ubicación', locOn: '📍 Activado', locOff: 'Desactivado',
    },
    btn: { update: 'Actualizar Detalles', close: 'Cerrar', save: 'Guardar Cambios', saving: 'Guardando…', cancel: 'Cancelar' },
    error: 'Error al actualizar. Inténtalo de nuevo.',
  },
};

export default function TradeInfoModal({ onClose }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [trade,   setTrade]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('info');

  useEffect(() => {
    getMe().then(setTrade).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const TABS = [
    { id: 'info',  label: t.tabs.info,  icon: '👤' },
    { id: 'hours', label: t.tabs.hours, icon: '🕐' },
    { id: 'photos',label: t.tabs.photos,icon: '📸' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-sky-300 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-1">{t.badge}</div>
            <h2 className="text-xl font-extrabold text-slate-800">Account Details</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg">×</button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pb-3 flex-shrink-0 border-b border-slate-100">
          {TABS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === id
                  ? 'bg-sky-100 text-sky-700 border border-sky-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}>
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'info'  && <TradeInfoTab trade={trade} t={t} onSaved={setTrade} />}
              {tab === 'hours' && <WorkingHoursTab trade={trade} />}
              {tab === 'photos' && (
                <PhotosTab
                  trade={trade}
                  onPhotosChanged={(photos) => setTrade(tr => ({ ...tr, portfolioPhotos: photos }))}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">
            {t.btn.close}
          </button>
        </div>
      </div>
    </div>
  );
}
