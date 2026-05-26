import { useState, useEffect } from 'react';
import { updateSite } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';

const content = {
  en: {
    badge:       '🔧 Manage Trades',
    title:       (name) => `Trades for "${name}"`,
    current:     'Current Trades',
    noCurrent:   'No trades assigned — project is inactive.',
    available:   'Add a Trade',
    allAssigned: 'All trades are already assigned to this project.',
    warn:        'Removing all trades will mark this project as inactive.',
    btn:         { save: 'Save Changes', saving: 'Saving…', cancel: 'Cancel' },
    error:       'Failed to save. Please try again.',
    budget: {
      title:       'Set Budget for',
      typeAmount:  '💰 Total Amount',
      typeHours:   '⏱️ Total Hours',
      amountHint:  'Max amount ($)',
      hoursHint:   'Total hours',
      add:         'Add Trade',
      skip:        'Skip',
      cancel:      'Cancel',
    },
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
    budget: {
      title:       'Establecer Presupuesto para',
      typeAmount:  '💰 Monto Total',
      typeHours:   '⏱️ Horas Totales',
      amountHint:  'Monto máximo ($)',
      hoursHint:   'Total de horas',
      add:         'Agregar Oficio',
      skip:        'Omitir',
      cancel:      'Cancelar',
    },
  },
};

function BudgetBadge({ trade, tb }) {
  if (!trade.budgetType) return null;
  if (trade.budgetType === 'amount' && trade.maxAmount)
    return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-lg">${trade.maxAmount}</span>;
  if (trade.budgetType === 'hours' && trade.totalHours)
    return <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-lg">{trade.totalHours}h</span>;
  return null;
}

export default function ManageTradesModal({ site, onClose, onUpdated }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];
  const tb   = t.budget;

  const [trades,      setTrades]      = useState(() => site.tradesNeeded || []);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  // budget mini-modal state
  const [pendingTrade, setPendingTrade] = useState(null); // trade name waiting for budget
  const [budgetType,   setBudgetType]   = useState('amount');
  const [budgetValue,  setBudgetValue]  = useState('');

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { if (pendingTrade) setPendingTrade(null); else onClose(); } };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, pendingTrade]);

  const openBudgetModal = (name) => {
    setPendingTrade(name);
    setBudgetType('amount');
    setBudgetValue('');
  };

  const confirmAdd = (skip = false) => {
    const entry = { name: pendingTrade, assigned: false, budgetType: null, maxAmount: null, totalHours: null };
    if (!skip && budgetValue) {
      const num = parseFloat(budgetValue);
      if (!isNaN(num) && num > 0) {
        entry.budgetType = budgetType;
        if (budgetType === 'amount') entry.maxAmount  = num;
        else                         entry.totalHours = num;
      }
    }
    setTrades((prev) => [...prev, entry]);
    setPendingTrade(null);
  };

  const removeTrade = (name) => setTrades((prev) => prev.filter((x) => x.name !== name));

  const available = TRADE_PROFESSIONALITIES.filter((tr) => !trades.some((x) => x.name === tr));
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
    <>
      {/* ── Main modal ──────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && !pendingTrade && onClose()}
      >
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-sky-400 flex-shrink-0" />

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

          <div className="overflow-y-auto px-8 py-6 flex-1 space-y-6">

            {/* Current trades */}
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
                      key={tr.name}
                      className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl border-2 text-xs font-semibold transition hover:border-red-300 hover:bg-red-50 ${
                        tr.assigned
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {tr.assigned && <span className="text-orange-500">✓</span>}
                      <span className="group-hover:text-red-700 transition">{tr.name}</span>
                      <BudgetBadge trade={tr} />
                      <button
                        type="button"
                        onClick={() => removeTrade(tr.name)}
                        title="Remove"
                        className="w-5 h-5 rounded-full bg-amber-200 group-hover:bg-red-200 flex items-center justify-center text-amber-700 group-hover:text-red-600 font-bold transition text-xs ml-0.5"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isEmpty && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 -mt-2">
                <span className="text-amber-500 text-base">ℹ️</span>
                <span className="text-xs text-amber-700">{t.warn}</span>
              </div>
            )}

            {/* Available trades */}
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
                      onClick={() => openBudgetModal(tr)}
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

      {/* ── Budget mini-modal ────────────────────────────────── */}
      {pendingTrade && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">

            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-violet-400" />

            <div className="px-6 pt-5 pb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{tb.title}</p>
              <p className="text-base font-extrabold text-slate-800 mb-4">{pendingTrade}</p>

              {/* Type toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setBudgetType('amount')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition ${
                    budgetType === 'amount'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'
                  }`}
                >
                  {tb.typeAmount}
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetType('hours')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition ${
                    budgetType === 'hours'
                      ? 'bg-violet-50 border-violet-400 text-violet-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'
                  }`}
                >
                  {tb.typeHours}
                </button>
              </div>

              {/* Value input */}
              <div className="relative mb-5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                  {budgetType === 'amount' ? '$' : '⏱'}
                </span>
                <input
                  type="number"
                  min="0"
                  step={budgetType === 'amount' ? '0.01' : '1'}
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder={budgetType === 'amount' ? tb.amountHint : tb.hoursHint}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmAdd(); }}
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button
                type="button"
                onClick={() => confirmAdd(false)}
                className="flex-1 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold py-2.5 rounded-xl text-sm shadow shadow-sky-200 transition-all active:scale-[0.98]"
              >
                {tb.add}
              </button>
              <button
                type="button"
                onClick={() => confirmAdd(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
                title="Add without budget"
              >
                {tb.skip}
              </button>
              <button
                type="button"
                onClick={() => setPendingTrade(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
              >
                {tb.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
