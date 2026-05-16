import { useState, useRef, useEffect } from 'react';
import { createSite } from '../../api/contractor.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition';
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide';

export default function AddSiteModal({ onClose, onCreated }) {
  const photoInputRef = useRef();
  const [form, setForm] = useState({ name: '', type: '', address: '' });
  const [trades, setTrades]       = useState([]);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleTrade = (item) =>
    setTrades((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim())    return setError('Site name is required.');
    if (!form.type)           return setError('Site type is required.');
    if (!form.address.trim()) return setError('Site address is required.');
    if (!trades.length)       return setError('Please select at least one trade needed.');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('name',         form.name);
      fd.append('type',         form.type);
      fd.append('address',      form.address);
      fd.append('tradesNeeded', JSON.stringify(trades));
      if (photoFile) fd.append('photo', photoFile);

      const site = await createSite(fd);
      onCreated(site);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create site. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-amber-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-2">
              🏗️ New Site
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">Add a Site</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-8 py-6 flex-1 space-y-5">

          {/* Site name */}
          <div>
            <label className={labelCls}>Site Name <span className="text-red-400">*</span></label>
            <input
              className={inputCls}
              value={form.name}
              onChange={set('name')}
              placeholder="Downtown Office Renovation"
            />
          </div>

          {/* Site type */}
          <div>
            <label className={labelCls}>Site Type <span className="text-red-400">*</span></label>
            <div className="flex gap-3">
              {['residential', 'commercial'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold border-2 capitalize transition-all duration-150 ${
                    form.type === t
                      ? 'bg-amber-500 border-amber-500 text-white shadow'
                      : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400'
                  }`}
                >
                  {t === 'residential' ? '🏠' : '🏢'} {t}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Site Address <span className="text-red-400">*</span></label>
            <input
              className={inputCls}
              value={form.address}
              onChange={set('address')}
              placeholder="456 Oak Ave, Los Angeles, CA 90001"
            />
          </div>

          {/* Trades needed */}
          <div>
            <label className={labelCls}>Trades Needed <span className="text-red-400">*</span></label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TRADE_PROFESSIONALITIES.map((item) => {
                const active = trades.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleTrade(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all duration-150 ${
                      active
                        ? 'bg-sky-500 border-sky-500 text-white'
                        : 'bg-white border-sky-200 text-sky-700 hover:border-sky-400'
                    }`}
                  >
                    {active && <span className="mr-1">✓</span>}
                    {item}
                  </button>
                );
              })}
            </div>
            {trades.length > 0 && (
              <p className="text-xs text-sky-600 font-medium mt-2">{trades.length} selected</p>
            )}
          </div>

          {/* Site photo (optional) */}
          <div>
            <label className={labelCls}>Site Photo <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-amber-100 shadow-sm">
                <img src={photoPreview} alt="Site preview" className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); photoInputRef.current.value = ''; }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-sm flex items-center justify-center hover:bg-black/70 transition"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => photoInputRef.current.click()}
                className="w-full border-2 border-dashed border-amber-200 rounded-2xl py-8 text-center text-sm text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-all"
              >
                <span className="text-2xl block mb-1">📷</span>
                Click to upload a photo
              </button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-amber-500 to-sky-400 hover:from-amber-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-amber-200 transition-all duration-200 active:scale-[0.99] text-sm"
          >
            {loading ? 'Creating…' : 'Create Site'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
