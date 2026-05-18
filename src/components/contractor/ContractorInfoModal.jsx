import { useState, useEffect } from 'react';
import { getMe, updateMe } from '../../api/contractor.js';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { CONTRACTOR_EXPERTISE } from '../../constants/trades.js';

const content = {
  en: {
    badge:        '🏗️ Contractor Info',
    titleView:    'Account Details',
    titleEdit:    'Update Details',
    labels: {
      company:   'Company Name',
      email:     'Email',
      phone:     'Phone',
      address:   'Office Address',
      expertise: 'Expertise',
      since:     'Member Since',
      logins:    'Total Logins',
      none:      'None selected',
    },
    btn: { update: 'Update Details', close: 'Close', save: 'Save Changes', saving: 'Saving…', cancel: 'Cancel' },
    error: 'Update failed. Please try again.',
  },
  es: {
    badge:        '🏗️ Info del Contratista',
    titleView:    'Detalles de Cuenta',
    titleEdit:    'Actualizar Detalles',
    labels: {
      company:   'Nombre de la Empresa',
      email:     'Correo',
      phone:     'Teléfono',
      address:   'Dirección de Oficina',
      expertise: 'Especialidades',
      since:     'Miembro Desde',
      logins:    'Inicios de Sesión',
      none:      'Ninguna seleccionada',
    },
    btn: { update: 'Actualizar Detalles', close: 'Cerrar', save: 'Guardar Cambios', saving: 'Guardando…', cancel: 'Cancelar' },
    error: 'Error al actualizar. Inténtalo de nuevo.',
  },
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  );
}

export default function ContractorInfoModal({ onClose }) {
  const { user, setUser } = useAuthStore();
  const lang = useUIStore((s) => s.lang);
  const t = content[lang];

  const [contractor, setContractor] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [mode,       setMode]       = useState('view');
  const [form,       setForm]       = useState({});
  const [expertise,  setExpertise]  = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    getMe()
      .then((data) => {
        setContractor(data);
        setForm({ companyName: data.companyName, phone: data.phone, address: data.address });
        setExpertise(data.expertise || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const toggleExpertise = (item) =>
    setExpertise((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = await updateMe({ ...form, expertise: JSON.stringify(expertise) });
      setContractor(updated);
      setUser({ ...user, companyName: updated.companyName });
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

        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-yellow-300 flex-shrink-0" />

        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mb-2">
              {t.badge}
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">{mode === 'view' ? t.titleView : t.titleEdit}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg">×</button>
        </div>

        <div className="overflow-y-auto px-8 py-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : mode === 'view' ? (
            <div className="space-y-5">
              <Field label={t.labels.company}  value={contractor?.companyName} />
              <Field label={t.labels.email}    value={contractor?.email} />
              <Field label={t.labels.phone}    value={contractor?.phone} />
              <Field label={t.labels.address}  value={contractor?.address} />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{t.labels.expertise}</p>
                <div className="flex flex-wrap gap-2">
                  {(contractor?.expertise || []).map((e) => (
                    <span key={e} className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">{e}</span>
                  ))}
                  {!contractor?.expertise?.length && <span className="text-sm text-slate-400">{t.labels.none}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label={t.labels.since}  value={contractor?.createdAt ? new Date(contractor.createdAt).toLocaleDateString() : '—'} />
                <Field label={t.labels.logins} value={contractor?.loginCount ?? '—'} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.company}</label>
                <input className={inputCls} value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
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
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.expertise}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CONTRACTOR_EXPERTISE.map((item) => {
                    const active = expertise.includes(item);
                    return (
                      <button key={item} type="button" onClick={() => toggleExpertise(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all duration-150 ${active ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400'}`}>
                        {active && <span className="mr-1">✓</span>}{item}
                      </button>
                    );
                  })}
                </div>
              </div>
              {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
          {mode === 'view' ? (
            <>
              <button onClick={() => setMode('edit')} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-white font-semibold py-3 rounded-2xl shadow shadow-amber-200 transition-all active:scale-[0.99] text-sm">{t.btn.update}</button>
              <button onClick={onClose} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">{t.btn.close}</button>
            </>
          ) : (
            <>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-amber-200 transition-all active:scale-[0.99] text-sm">{saving ? t.btn.saving : t.btn.save}</button>
              <button onClick={() => { setMode('view'); setError(''); }} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">{t.btn.cancel}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
