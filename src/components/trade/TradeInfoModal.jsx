import { useState, useEffect, useRef } from 'react';
import { getMe, updateMe } from '../../api/trade.js';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';

const content = {
  en: {
    badge:      '🔧 Trade Professional',
    titleView:  'Account Details',
    titleEdit:  'Update Details',
    labels: {
      name:      'Full Name',
      email:     'Email',
      phone:     'Phone',
      trade:     'Trade',
      address:   'Address',
      photo:     'Profile Photo',
      photoHint: 'Click to change photo',
      docs:      'Documents',
      license:   'License',
      insurance: 'Insurance',
      cv:        'CV',
      since:     'Member Since',
      logins:    'Total Logins',
      location:  'Location Sharing',
      locOn:     '📍 Enabled',
      locOff:    'Disabled',
    },
    btn: { update: 'Update Details', close: 'Close', save: 'Save Changes', saving: 'Saving…', cancel: 'Cancel' },
    error: 'Update failed. Please try again.',
  },
  es: {
    badge:      '🔧 Profesional de Oficios',
    titleView:  'Detalles de Cuenta',
    titleEdit:  'Actualizar Detalles',
    labels: {
      name:      'Nombre Completo',
      email:     'Correo',
      phone:     'Teléfono',
      trade:     'Oficio',
      address:   'Dirección',
      photo:     'Foto de Perfil',
      photoHint: 'Clic para cambiar foto',
      docs:      'Documentos',
      license:   'Licencia',
      insurance: 'Seguro',
      cv:        'CV',
      since:     'Miembro Desde',
      logins:    'Inicios de Sesión',
      location:  'Compartir Ubicación',
      locOn:     '📍 Activado',
      locOff:    'Desactivado',
    },
    btn: { update: 'Actualizar Detalles', close: 'Cerrar', save: 'Guardar Cambios', saving: 'Guardando…', cancel: 'Cancelar' },
    error: 'Error al actualizar. Inténtalo de nuevo.',
  },
};

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

export default function TradeInfoModal({ onClose }) {
  const user    = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const lang    = useUIStore((s) => s.lang);
  const t       = content[lang];

  const [trade,        setTrade]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [mode,         setMode]         = useState('view');
  const [form,         setForm]         = useState({});
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const photoInputRef = useRef();

  useEffect(() => {
    getMe()
      .then((data) => {
        setTrade(data);
        setForm({ fullName: data.fullName, phone: data.phone, address: data.address, professionality: data.professionality });
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      let payload;
      if (photoFile) {
        payload = new FormData();
        Object.entries(form).forEach(([k, v]) => payload.append(k, v));
        payload.append('photo', photoFile);
      } else {
        payload = form;
      }
      const updated = await updateMe(payload);
      setTrade(updated);
      setUser({ ...user, fullName: updated.fullName });
      setPhotoFile(null);
      setPhotoPreview(null);
      setMode('view');
    } catch {
      setError(t.error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-sky-300 flex-shrink-0" />

        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-2">{t.badge}</div>
            <h2 className="text-xl font-extrabold text-slate-800">{mode === 'view' ? t.titleView : t.titleEdit}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg">×</button>
        </div>

        <div className="overflow-y-auto px-8 py-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : mode === 'view' ? (
            <div className="space-y-5">
              {trade?.photo && (
                <div className="flex justify-center mb-2">
                  <img src={trade.photo} alt={trade.fullName} className="w-20 h-20 rounded-2xl object-cover border-2 border-sky-100 shadow" />
                </div>
              )}
              <Field label={t.labels.name}    value={trade?.fullName} />
              <Field label={t.labels.email}   value={trade?.email} />
              <Field label={t.labels.phone}   value={trade?.phone} />
              <Field label={t.labels.trade}   value={trade?.professionality} />
              <Field label={t.labels.address} value={trade?.address} />
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t.labels.docs}</p>
                  <div className="flex flex-col gap-1 mt-1">
                    {[
                      { label: t.labels.license,   url: trade?.licenseDoc },
                      { label: t.labels.insurance, url: trade?.insuranceDoc },
                      { label: t.labels.cv,        url: trade?.cv },
                    ].map(({ label, url }) => (
                      <span key={label} className={`text-xs font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${url ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                        {url ? '✓' : '—'} {label}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <Field label={t.labels.since}  value={trade?.createdAt ? new Date(trade.createdAt).toLocaleDateString() : '—'} />
                  <div className="mt-3"><Field label={t.labels.logins} value={trade?.loginCount ?? '—'} /></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t.labels.location}</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${trade?.locationConsent ? 'bg-sky-50 text-sky-600 border border-sky-200' : 'bg-slate-50 text-slate-400 border border-slate-200'}`}>
                  {trade?.locationConsent ? t.labels.locOn : t.labels.locOff}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Photo upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{t.labels.photo}</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-sky-100 flex-shrink-0 bg-sky-50 flex items-center justify-center">
                    {photoPreview || trade?.photo
                      ? <img src={photoPreview || trade.photo} alt="preview" className="w-full h-full object-cover" />
                      : <span className="text-2xl">👤</span>
                    }
                  </div>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current.click()}
                    className="flex-1 rounded-xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 px-4 py-3 text-sm text-sky-500 font-medium transition flex items-center gap-2"
                  >
                    <span>📷</span>
                    <span className="truncate text-left">
                      {photoFile ? photoFile.name : <span className="text-slate-400">{t.labels.photoHint}</span>}
                    </span>
                    {photoFile && <span className="text-green-500 ml-auto">✓</span>}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.name}</label>
                <input className={inputCls} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.phone}</label>
                <input className={inputCls} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.address}</label>
                <input className={inputCls} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.trade}</label>
                <select className={inputCls} value={form.professionality} onChange={(e) => setForm((f) => ({ ...f, professionality: e.target.value }))}>
                  {TRADE_PROFESSIONALITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
          {mode === 'view' ? (
            <>
              <button onClick={() => setMode('edit')} className="flex-1 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold py-3 rounded-2xl shadow shadow-sky-200 transition-all active:scale-[0.99] text-sm">{t.btn.update}</button>
              <button onClick={onClose} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">{t.btn.close}</button>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-sky-200 transition-all active:scale-[0.99] text-sm">{saving ? t.btn.saving : t.btn.save}</button>
              <button onClick={() => { setMode('view'); setError(''); }} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">{t.btn.cancel}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
