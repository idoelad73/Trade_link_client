import { useState, useEffect } from 'react';
import { updateSite } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';

const content = {
  en: {
    badge:       '🔧 Manage Trades',
    title:       (name) => `Trades for "${name}"`,
    current:     'Current Trades',
    noCurrent:   'No trades assigned — site is inactive.',
    available:   'Add a Trade',
    allAssigned: 'All trades are already assigned to this site.',
    warn:        'Removing all trades will mark this site as inactive.',
    btn:         { save: 'Save Changes', saving: 'Saving…', cancel: 'Cancel' },
    error:       'Failed to save. Please try again.',
  },
  es: {
    badge:       '🔧 Gestionar Oficios',
    title:       (name) => `Oficios para "${name}"`,
    current:     'Oficios Actuales',
    noCurrent:   'Sin oficios asignados — la obra está inactiva.',
    available:   'Agregar un Oficio',
    allAssigned: 'Todos los oficios ya están asignados a esta obra.',
    warn:        'Eliminar todos los oficios marcará esta obra como inactiva.',
    btn:         { save: 'Guardar Cambios', saving: 'Guardando…', cancel: 'Cancelar' },
    error:       'Error al guardar. Inténtalo de nuevo.',
  },
};

export default function ManageTradesModal({ site, onClose, onUpdated }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [trades,  setTrades]  = useState([...( site.tradesNeeded || [])]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const removeTrade = (tr) => setTrades((prev) => prev.filter((x) => x !== tr));
  const addTrade    = (tr) => setTrades((prev) => [...prev, tr]);

  const available = TRADE_PROFESSIONALITIES.filter((tr) => !trades.includes(tr));
  const isEmpty   = trades.length === 0;

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const updated = await updateSite(site._id, { tradesNeeded: trades });
      onUpdated(updated);
      onClose();
    } catch {
      setError(t.error);
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

        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-sky-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mb-2">
              {t.badge}
            </div>
            <h2 className="text-lg font-extrabold text-slate-800 leading-tight">{t.title(site.name)}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-8 py-6 flex-1 space-y-6">

          {/* ── Current trades ───────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{t.current}</p>

            {isEmpty ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <span className="text-red-400 text-lg">⚠️</span>
                <span className="text-sm text-red-600 font-medium">{t.noCurrent}</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {trades.map((tr) => (
                  <div
                    key={tr}
                    className="group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-800 text-xs font-semibold transition hover:border-red-300 hover:bg-red-50"
                  >
                    <span className="group-hover:text-red-700 transition">{tr}</span>
                    <button
                      type="button"
                      onClick={() => removeTrade(tr)}
                      title="Remove"
                      className="w-5 h-5 rounded-full bg-amber-200 group-hover:bg-red-200 flex items-center justify-center text-amber-700 group-hover:text-red-600 font-bold transition text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Empty-trades warning */}
          {isEmpty && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 -mt-2">
              <span className="text-amber-500 text-base">ℹ️</span>
              <span className="text-xs text-amber-700">{t.warn}</span>
            </div>
          )}

          {/* ── Available trades ─────────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{t.available}</p>

            {available.length === 0 ? (
              <p className="text-sm text-slate-400 italic">{t.allAssigned}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {available.map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => addTrade(tr)}
                    className="flex items-center gap-1 pl-2.5 pr-3 py-1.5 rounded-xl bg-white border-2 border-sky-200 text-sky-700 text-xs font-semibold hover:border-sky-400 hover:bg-sky-50 transition active:scale-95"
                  >
                    <span className="text-sky-400 font-bold">+</span> {tr}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-amber-500 to-sky-400 hover:from-amber-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-amber-200 transition-all active:scale-[0.99] text-sm"
          >
            {saving ? t.btn.saving : t.btn.save}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            {t.btn.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
