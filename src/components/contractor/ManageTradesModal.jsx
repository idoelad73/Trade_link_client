import { useState, useEffect } from 'react';
import { updateSite } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';

const DAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};
const MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildCalendar(year, month) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function formatDisplay(dateKey, lang) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  });
}

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
    manageBtn:   'Manage Trade',
    budget: {
      title:      'Set Budget for',
      typeAmount: '💰 Total Amount',
      typeHours:  '⏱️ Total Hours',
      amountHint: 'Max amount ($)',
      hoursHint:  'Total hours',
      next:       'Next: Pick Date →',
      skip:       'No budget',
      cancel:     'Cancel',
    },
    datePick: {
      badge:   '📅 Required Date',
      title:   (name) => `Start date for ${name}`,
      hint:    'Tap a day to select the required start date',
      confirm: 'Add Trade',
      cancel:  'Cancel',
    },
    tradeInfo: {
      badge:       '📋 Trade Details',
      budgetLabel: 'Budget',
      dateLabel:   'Required Date',
      hint:        'Tap a day to change the date',
      approve:     '✅ Approve Trade',
      approved:    '✓ Approved',
      update:      'Update',
      cancel:      'Cancel',
      typeAmount:  '💰 Amount',
      typeHours:   '⏱ Hours',
      amountHint:  'Max amount ($)',
      hoursHint:   'Total hours',
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
    manageBtn:   'Gestionar Oficio',
    budget: {
      title:      'Establecer Presupuesto para',
      typeAmount: '💰 Monto Total',
      typeHours:  '⏱️ Horas Totales',
      amountHint: 'Monto máximo ($)',
      hoursHint:  'Total de horas',
      next:       'Siguiente: Elegir Fecha →',
      skip:       'Sin presupuesto',
      cancel:     'Cancelar',
    },
    datePick: {
      badge:   '📅 Fecha Requerida',
      title:   (name) => `Fecha de inicio para ${name}`,
      hint:    'Toca un día para seleccionar la fecha de inicio requerida',
      confirm: 'Agregar Oficio',
      cancel:  'Cancelar',
    },
    tradeInfo: {
      badge:       '📋 Detalles del Oficio',
      budgetLabel: 'Presupuesto',
      dateLabel:   'Fecha Requerida',
      hint:        'Toca un día para cambiar la fecha',
      approve:     '✅ Aprobar Oficio',
      approved:    '✓ Aprobado',
      update:      'Actualizar',
      cancel:      'Cancelar',
      typeAmount:  '💰 Monto',
      typeHours:   '⏱ Horas',
      amountHint:  'Monto máximo ($)',
      hoursHint:   'Total de horas',
    },
  },
};

function BudgetBadge({ trade }) {
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
  const td   = t.datePick;
  const ti   = t.tradeInfo;

  const today    = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [trades,  setTrades]  = useState(() => site.tradesNeeded || []);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  // Selected trade chip (click to select → orange)
  const [selectedTradeName, setSelectedTradeName] = useState(null);

  // ── ADD flow: Step 1 — budget ──────────────────────────────
  const [pendingTrade, setPendingTrade] = useState(null);
  const [budgetType,   setBudgetType]   = useState('amount');
  const [budgetValue,  setBudgetValue]  = useState('');

  // ── ADD flow: Step 2 — date picker ─────────────────────────
  const [pendingDateEntry, setPendingDateEntry] = useState(null);
  const [dateViewYear,  setDateViewYear]  = useState(today.getFullYear());
  const [dateViewMonth, setDateViewMonth] = useState(today.getMonth());
  const [selectedDate,  setSelectedDate]  = useState(null);

  // ── EDIT flow: TradeInfo modal ─────────────────────────────
  const [tradeInfoOpen,  setTradeInfoOpen]  = useState(false);
  const [tiTrade,        setTiTrade]        = useState(null);
  const [tiBudgetType,   setTiBudgetType]   = useState('amount');
  const [tiBudgetValue,  setTiBudgetValue]  = useState('');
  const [tiSelectedDate, setTiSelectedDate] = useState(null);
  const [tiViewYear,     setTiViewYear]     = useState(today.getFullYear());
  const [tiViewMonth,    setTiViewMonth]    = useState(today.getMonth());

  const tiMaxMonth  = today.getMonth() === 11 ? 0  : today.getMonth() + 1;
  const tiMaxYear   = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const tiIsMax     = tiViewYear === tiMaxYear  && tiViewMonth === tiMaxMonth;
  const tiIsMin     = tiViewYear === today.getFullYear() && tiViewMonth === today.getMonth();

  const maxDateMonth  = today.getMonth() === 11 ? 0  : today.getMonth() + 1;
  const maxDateYear   = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const isDateMaxMonth = dateViewYear === maxDateYear  && dateViewMonth === maxDateMonth;
  const isDateMinMonth = dateViewYear === today.getFullYear() && dateViewMonth === today.getMonth();

  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Escape') return;
      if (tradeInfoOpen)    { setTradeInfoOpen(false); return; }
      if (pendingDateEntry) { setPendingDateEntry(null); return; }
      if (pendingTrade)     { setPendingTrade(null);     return; }
      onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, pendingTrade, pendingDateEntry, tradeInfoOpen]);

  // ── ADD flow handlers ──────────────────────────────────────
  const openBudgetModal = (name) => {
    setPendingTrade(name);
    setBudgetType('amount');
    setBudgetValue('');
  };

  const confirmBudget = (skip = false) => {
    const entry = { name: pendingTrade, assigned: false, budgetType: null, maxAmount: null, totalHours: null };
    if (!skip && budgetValue) {
      const num = parseFloat(budgetValue);
      if (!isNaN(num) && num > 0) {
        entry.budgetType = budgetType;
        if (budgetType === 'amount') entry.maxAmount  = num;
        else                         entry.totalHours = num;
      }
    }
    setPendingTrade(null);
    setPendingDateEntry(entry);
    setSelectedDate(null);
    setDateViewYear(today.getFullYear());
    setDateViewMonth(today.getMonth());
  };

  const confirmWithDate = () => {
    if (!selectedDate) return;
    setTrades((prev) => [...prev, { ...pendingDateEntry, requiredDate: selectedDate }]);
    setPendingDateEntry(null);
    setSelectedDate(null);
  };

  // ── EDIT flow handlers ─────────────────────────────────────
  const openTradeInfo = () => {
    const tr = trades.find((x) => x.name === selectedTradeName);
    if (!tr) return;
    setTiTrade(tr);
    setTiBudgetType(tr.budgetType || 'amount');
    setTiBudgetValue(
      tr.budgetType === 'amount' ? (tr.maxAmount?.toString()  ?? '') :
      tr.budgetType === 'hours'  ? (tr.totalHours?.toString() ?? '') : ''
    );
    const preDate = tr.requiredDate ?? null;
    setTiSelectedDate(preDate);
    if (preDate) {
      const [y, m] = preDate.split('-').map(Number);
      setTiViewYear(y);
      setTiViewMonth(m - 1);
    } else {
      setTiViewYear(today.getFullYear());
      setTiViewMonth(today.getMonth());
    }
    setTradeInfoOpen(true);
  };

  const buildTiUpdated = (extraFields = {}) => {
    const num = parseFloat(tiBudgetValue);
    const hasBudget = !isNaN(num) && num > 0;
    return {
      ...tiTrade,
      budgetType:   hasBudget ? tiBudgetType : null,
      maxAmount:    hasBudget && tiBudgetType === 'amount' ? num : null,
      totalHours:   hasBudget && tiBudgetType === 'hours'  ? num : null,
      requiredDate: tiSelectedDate,
      ...extraFields,
    };
  };

  const confirmTradeInfo = () => {
    setTrades((prev) => prev.map((tr) => tr.name === tiTrade.name ? buildTiUpdated() : tr));
    setTradeInfoOpen(false);
    setTiTrade(null);
    setSelectedTradeName(null);
  };

  const approveTradeInfo = () => {
    setTrades((prev) => prev.map((tr) => tr.name === tiTrade.name ? buildTiUpdated({ assigned: true }) : tr));
    setTradeInfoOpen(false);
    setTiTrade(null);
    setSelectedTradeName(null);
  };

  const removeTrade = (name) => {
    setTrades((prev) => prev.filter((x) => x.name !== name));
    if (selectedTradeName === name) setSelectedTradeName(null);
  };

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

  const dateCells = buildCalendar(dateViewYear, dateViewMonth);
  const tiCells   = buildCalendar(tiViewYear, tiViewMonth);

  return (
    <>
      {/* ── Main modal ──────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && !pendingTrade && !pendingDateEntry && !tradeInfoOpen && onClose()}
      >
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-sky-400 flex-shrink-0" />

          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
            <div>
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
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t.current}</p>
                {selectedTradeName && (
                  <button
                    type="button"
                    onClick={openTradeInfo}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white shadow shadow-orange-200 transition-all active:scale-95"
                  >
                    📋 {t.manageBtn}
                  </button>
                )}
              </div>

              {isEmpty ? (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <span className="text-sm text-red-600 font-medium">{t.noCurrent}</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {trades.map((tr) => {
                    const isSelected = selectedTradeName === tr.name;
                    return (
                      <div
                        key={tr.name}
                        onClick={() => setSelectedTradeName((prev) => prev === tr.name ? null : tr.name)}
                        className={`group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl border-2 text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95 ${
                          isSelected
                            ? 'bg-orange-400 border-orange-400 text-white shadow shadow-orange-200 scale-[1.03]'
                            : tr.assigned
                              ? 'bg-orange-50 border-orange-300 text-orange-700 hover:border-orange-400'
                              : 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400'
                        }`}
                      >
                        {tr.assigned && <span className={isSelected ? 'text-white' : 'text-orange-500'}>✓</span>}
                        <span>{tr.name}</span>
                        {!isSelected && <BudgetBadge trade={tr} />}
                        {!isSelected && tr.requiredDate && (
                          <span className="text-xs font-semibold text-sky-600 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded-lg">📅 {tr.requiredDate}</span>
                        )}
                        {isSelected && (
                          <span className="text-[10px] text-white/80 font-normal">tap again to deselect</span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeTrade(tr.name); }}
                          title="Remove"
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold transition text-xs ml-0.5 ${
                            isSelected
                              ? 'bg-white/30 hover:bg-white/50 text-white'
                              : 'bg-amber-200 hover:bg-red-200 text-amber-700 hover:text-red-600'
                          }`}
                        >×</button>
                      </div>
                    );
                  })}
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

      {/* ── ADD: Budget mini-modal (step 1) ─────────────────── */}
      {pendingTrade && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">

            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-violet-400" />

            <div className="flex items-center gap-2 px-6 pt-4 pb-0">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">Budget</span>
              </div>
              <div className="flex-1 h-px bg-slate-200" />
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date</span>
              </div>
            </div>

            <div className="px-6 pt-4 pb-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{tb.title}</p>
              <p className="text-base font-extrabold text-slate-800 mb-4">{pendingTrade}</p>

              <div className="flex gap-2 mb-4">
                <button type="button" onClick={() => setBudgetType('amount')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition ${budgetType === 'amount' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}>
                  {tb.typeAmount}
                </button>
                <button type="button" onClick={() => setBudgetType('hours')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition ${budgetType === 'hours' ? 'bg-violet-50 border-violet-400 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                  {tb.typeHours}
                </button>
              </div>

              <div className="relative mb-5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                  {budgetType === 'amount' ? '$' : '⏱'}
                </span>
                <input
                  type="number" min="0" step={budgetType === 'amount' ? '0.01' : '1'}
                  value={budgetValue} onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder={budgetType === 'amount' ? tb.amountHint : tb.hoursHint}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmBudget(false); }}
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button type="button" onClick={() => confirmBudget(false)}
                className="flex-1 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold py-2.5 rounded-xl text-sm shadow shadow-sky-200 transition-all active:scale-[0.98]">
                {tb.next}
              </button>
              <button type="button" onClick={() => confirmBudget(true)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-xs transition">
                {tb.skip}
              </button>
              <button type="button" onClick={() => setPendingTrade(null)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-xs transition">
                {tb.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD: Date picker mini-modal (step 2) ────────────── */}
      {pendingDateEntry && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">

            <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-emerald-400" />

            <div className="px-6 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-400 text-white text-[10px] font-bold flex items-center justify-center">✓</span>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Budget</span>
                </div>
                <div className="flex-1 h-px bg-sky-200" />
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-sky-500 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">Date</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-1.5">{td.badge}</div>
              <h3 className="text-base font-extrabold text-slate-800">{td.title(pendingDateEntry.name)}</h3>
            </div>

            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-400">
              <button onClick={() => { if (isDateMinMonth) return; if (dateViewMonth === 0) { setDateViewYear(y => y-1); setDateViewMonth(11); } else setDateViewMonth(m => m-1); }}
                disabled={isDateMinMonth}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold transition">‹</button>
              <h4 className="text-white font-extrabold text-sm tracking-tight">{MONTHS[lang][dateViewMonth]} {dateViewYear}</h4>
              <button onClick={() => { if (isDateMaxMonth) return; if (dateViewMonth === 11) { setDateViewYear(y => y+1); setDateViewMonth(0); } else setDateViewMonth(m => m+1); }}
                disabled={isDateMaxMonth}
                className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold transition">›</button>
            </div>

            <div className="grid grid-cols-7 px-3 pt-2 pb-1">
              {DAYS[lang].map((d) => <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide py-1">{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1 px-3 pb-3">
              {dateCells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const key    = toDateKey(dateViewYear, dateViewMonth, day);
                const isPast = new Date(dateViewYear, dateViewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isSel  = key === selectedDate;
                if (isPast) return <div key={key} className="w-full aspect-square rounded-xl bg-slate-100 ring-1 ring-black/20 flex items-center justify-center text-xs text-slate-300 font-medium select-none">{day}</div>;
                return (
                  <button key={key} type="button" onClick={() => setSelectedDate((prev) => prev === key ? null : key)}
                    className={`relative w-full aspect-square rounded-xl ring-1 ring-black/20 text-sm font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 select-none
                      ${isSel ? 'bg-amber-400 text-white shadow-md shadow-amber-200 scale-105 ring-2 ring-amber-500 ring-offset-1' : 'bg-emerald-400 text-white shadow-sm shadow-emerald-100 hover:bg-emerald-500'}
                      ${key === todayKey && !isSel ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`}>
                    {day}
                    {key === todayKey && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />}
                  </button>
                );
              })}
            </div>

            <div className="px-4 pb-2">
              {selectedDate ? (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
                  <span className="text-amber-500">📅</span>
                  <span className="text-sm font-semibold text-amber-700">{formatDisplay(selectedDate, lang)}</span>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400 py-1">{td.hint}</p>
              )}
            </div>

            <div className="px-4 pb-5 pt-2 flex gap-2">
              <button type="button" onClick={confirmWithDate} disabled={!selectedDate}
                className="flex-1 bg-gradient-to-r from-sky-500 to-emerald-400 hover:from-sky-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-2xl text-sm shadow shadow-sky-200 transition-all active:scale-[0.98]">
                {td.confirm}
              </button>
              <button type="button" onClick={() => setPendingDateEntry(null)}
                className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">
                {td.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT: TradeInfo modal ────────────────────────────── */}
      {tradeInfoOpen && tiTrade && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">

            <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 to-amber-400 flex-shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200 mb-1">
                  {ti.badge}
                </div>
                <h3 className="text-base font-extrabold text-slate-800">{tiTrade.name}</h3>
              </div>
              <button onClick={() => setTradeInfoOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg">×</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">

              {/* Budget section */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{ti.budgetLabel}</p>
                <div className="flex gap-2 mb-3">
                  <button type="button" onClick={() => setTiBudgetType('amount')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition ${tiBudgetType === 'amount' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'}`}>
                    {ti.typeAmount}
                  </button>
                  <button type="button" onClick={() => setTiBudgetType('hours')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition ${tiBudgetType === 'hours' ? 'bg-violet-50 border-violet-400 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                    {ti.typeHours}
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                    {tiBudgetType === 'amount' ? '$' : '⏱'}
                  </span>
                  <input
                    type="number" min="0" step={tiBudgetType === 'amount' ? '0.01' : '1'}
                    value={tiBudgetValue} onChange={(e) => setTiBudgetValue(e.target.value)}
                    placeholder={tiBudgetType === 'amount' ? ti.amountHint : ti.hoursHint}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300 transition"
                  />
                </div>
              </div>

              {/* Date section */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{ti.dateLabel}</p>

                {/* Month nav */}
                <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 mb-2">
                  <button onClick={() => { if (tiIsMin) return; if (tiViewMonth === 0) { setTiViewYear(y => y-1); setTiViewMonth(11); } else setTiViewMonth(m => m-1); }}
                    disabled={tiIsMin}
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold transition text-sm">‹</button>
                  <span className="text-white font-extrabold text-sm">{MONTHS[lang][tiViewMonth]} {tiViewYear}</span>
                  <button onClick={() => { if (tiIsMax) return; if (tiViewMonth === 11) { setTiViewYear(y => y+1); setTiViewMonth(0); } else setTiViewMonth(m => m+1); }}
                    disabled={tiIsMax}
                    className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white font-bold transition text-sm">›</button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 pb-1">
                  {DAYS[lang].map((d) => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wide py-0.5">{d}</div>)}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-0.5">
                  {tiCells.map((day, i) => {
                    if (!day) return <div key={`e-${i}`} />;
                    const key    = toDateKey(tiViewYear, tiViewMonth, day);
                    const isPast = new Date(tiViewYear, tiViewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const isSel  = key === tiSelectedDate;
                    if (isPast) return <div key={key} className="w-full aspect-square rounded-lg bg-slate-100 flex items-center justify-center text-[11px] text-slate-300 font-medium select-none">{day}</div>;
                    return (
                      <button key={key} type="button" onClick={() => setTiSelectedDate((prev) => prev === key ? null : key)}
                        className={`relative w-full aspect-square rounded-lg text-[11px] font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 select-none
                          ${isSel ? 'bg-amber-400 text-white shadow shadow-amber-200 scale-105 ring-2 ring-amber-500 ring-offset-1' : 'bg-emerald-400 text-white hover:bg-emerald-500'}
                          ${key === todayKey && !isSel ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`}>
                        {day}
                        {key === todayKey && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />}
                      </button>
                    );
                  })}
                </div>

                {/* Selected date display */}
                <div className="mt-2">
                  {tiSelectedDate ? (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <span className="text-amber-500 text-sm">📅</span>
                      <span className="text-xs font-semibold text-amber-700">{formatDisplay(tiSelectedDate, lang)}</span>
                    </div>
                  ) : (
                    <p className="text-center text-xs text-slate-400">{ti.hint}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col gap-2 flex-shrink-0">
              {/* Approve button — only show if not already assigned */}
              {!tiTrade.assigned && (
                <button type="button" onClick={approveTradeInfo}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-white font-bold py-2.5 rounded-2xl text-sm shadow shadow-emerald-200 transition-all active:scale-[0.99]">
                  {ti.approve}
                </button>
              )}
              {tiTrade.assigned && (
                <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl py-2.5">
                  <span className="text-emerald-500 text-sm font-bold">{ti.approved}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={confirmTradeInfo}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 text-white font-bold py-2.5 rounded-2xl text-sm shadow shadow-orange-200 transition-all active:scale-[0.99]">
                  {ti.update}
                </button>
                <button type="button" onClick={() => setTradeInfoOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">
                  {ti.cancel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
