import { useState, useEffect } from 'react';
import { getMe, updateMe } from '../../api/contractor.js';
import useAuthStore from '../../stores/authStore.js';
import { CONTRACTOR_EXPERTISE } from '../../constants/trades.js';


function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition';

export default function ContractorInfoModal({ onClose }) {
  const { user, setUser } = useAuthStore();
  const [contractor, setContractor] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [mode, setMode]             = useState('view'); // 'view' | 'edit'

  // Edit form state
  const [form, setForm]         = useState({});
  const [expertise, setExpertise] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    getMe()
      .then((data) => {
        setContractor(data);
        setForm({ companyName: data.companyName, phone: data.phone, address: data.address });
        setExpertise(data.expertise || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const toggleExpertise = (item) =>
    setExpertise((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = await updateMe({ ...form, expertise: JSON.stringify(expertise) });
      setContractor(updated);
      setUser({ ...user, companyName: updated.companyName });
      setMode('view');
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Top colour bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-yellow-300 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mb-2">
              🏗️ Contractor Info
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {mode === 'view' ? 'Account Details' : 'Update Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 py-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : mode === 'view' ? (
            <div className="space-y-5">
              <Field label="Company Name"  value={contractor?.companyName} />
              <Field label="Email"         value={contractor?.email} />
              <Field label="Phone"         value={contractor?.phone} />
              <Field label="Office Address" value={contractor?.address} />
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Expertise</p>
                <div className="flex flex-wrap gap-2">
                  {(contractor?.expertise || []).map((e) => (
                    <span key={e} className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      {e}
                    </span>
                  ))}
                  {!contractor?.expertise?.length && <span className="text-sm text-slate-400">None selected</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Member Since" value={contractor?.createdAt ? new Date(contractor.createdAt).toLocaleDateString() : '—'} />
                <Field label="Total Logins"  value={contractor?.loginCount ?? '—'} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Company Name</label>
                <input
                  className={inputCls}
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Phone</label>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Office Address</label>
                <input
                  className={inputCls}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, New York, NY 10001"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Expertise</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {CONTRACTOR_EXPERTISE.map((item) => {
                    const active = expertise.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleExpertise(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all duration-150 ${
                          active
                            ? 'bg-amber-500 border-amber-500 text-white'
                            : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400'
                        }`}
                      >
                        {active && <span className="mr-1">✓</span>}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
          {mode === 'view' ? (
            <>
              <button
                onClick={() => setMode('edit')}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-white font-semibold py-3 rounded-2xl shadow shadow-amber-200 transition-all duration-200 active:scale-[0.99] text-sm"
              >
                Update Details
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-amber-200 transition-all duration-200 active:scale-[0.99] text-sm"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => { setMode('view'); setError(''); }}
                className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
