import { useState, useRef, useEffect } from 'react';
import { createSite } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';
import { TRADE_PROFESSIONALITIES } from '../../constants/trades.js';
import api from '../../api/axios.js';

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

/* ── inline address autocomplete (Photon / OpenStreetMap, no API key) ── */
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

function AddressField({ onChange, inputCls, placeholder }) {
  const [query,   setQuery]   = useState('');   // own local state — not tied to parent cycle
  const [items,   setItems]   = useState([]);
  const [busy,    setBusy]    = useState(false);
  const [hi,      setHi]      = useState(-1);
  const [dropPos, setDropPos] = useState(null);
  const inputRef  = useRef(null);
  const skipRef   = useRef(false);  // skip search after user picks

  // ── Debounced search via useEffect (React handles cleanup reliably) ──────
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    const q = query.trim();
    if (q.length < 3) { setItems([]); setBusy(false); return; }

    let cancelled = false;
    setBusy(true);
    console.log('[AddressField] queuing search for:', q);

    const tid = setTimeout(async () => {
      console.log('[AddressField] fetching Photon for:', q);
      try {
        const { data } = await api.get('/address/autocomplete', { params: { q } });
        console.log('[AddressField] raw Photon response:', data);
        if (cancelled) return;
        const list = (data.features || [])
          .map(f => fmtAddr(f.properties))
          .filter(Boolean)
          .filter((a, i, arr) => arr.indexOf(a) === i);
        console.log('[AddressField] formatted list:', list);
        setItems(list); setHi(-1);
        if (list.length && inputRef.current) {
          const r = inputRef.current.getBoundingClientRect();
          setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
        }
      } catch (err) { console.error('[AddressField] fetch error:', err); if (!cancelled) setItems([]); }
      finally       { if (!cancelled) setBusy(false); }
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
    setQuery(q);   // drives useEffect search
    onChange(q);   // keeps parent form in sync
  }

  function pick(addr) {
    skipRef.current = true;   // prevent re-searching the chosen address
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
          ref={inputRef} type="text" autoComplete="off"
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
    badge:   '🏗️ New Project',
    title:   'Add a Project',
    labels: {
      name:    'Project Name',
      type:    'Project Type',
      address: 'Project Address',
      trades:  'Trades Needed',
      photo:   'Project Photo',
      optional:'(optional)',
      required:'*',
    },
    types:      { residential: '🏠 Residential', commercial: '🏢 Commercial' },
    photoHint:  'Click to upload a photo',
    selected:   (n) => `${n} selected`,
    btn:        { create: 'Create Project', creating: 'Creating…', cancel: 'Cancel' },
    errors: {
      name:    'Project name is required.',
      type:    'Project type is required.',
      address: 'Project address is required.',
      trades:  'Please select at least one trade needed.',
      server:  'Failed to create project. Please try again.',
    },
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
  },
  es: {
    badge:   '🏗️ Nuevo Proyecto',
    title:   'Agregar Proyecto',
    labels: {
      name:    'Nombre del Proyecto',
      type:    'Tipo de Proyecto',
      address: 'Dirección del Proyecto',
      trades:  'Oficios Necesarios',
      photo:   'Foto del Proyecto',
      optional:'(opcional)',
      required:'*',
    },
    types:      { residential: '🏠 Residencial', commercial: '🏢 Comercial' },
    photoHint:  'Haz clic para subir una foto',
    selected:   (n) => `${n} seleccionados`,
    btn:        { create: 'Crear Proyecto', creating: 'Creando…', cancel: 'Cancelar' },
    errors: {
      name:    'El nombre del proyecto es obligatorio.',
      type:    'El tipo de proyecto es obligatorio.',
      address: 'La dirección del proyecto es obligatoria.',
      trades:  'Selecciona al menos un oficio necesario.',
      server:  'Error al crear el proyecto. Inténtalo de nuevo.',
    },
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
  },
};

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 transition';

function BudgetBadge({ trade }) {
  if (trade.budgetType === 'amount' && trade.maxAmount)
    return <span className="ml-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 py-0.5 rounded">${trade.maxAmount}</span>;
  if (trade.budgetType === 'hours' && trade.totalHours)
    return <span className="ml-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1 py-0.5 rounded">{trade.totalHours}h</span>;
  return null;
}

function DateBadge({ trade }) {
  if (!trade.requiredDate) return null;
  return <span className="ml-1 text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 px-1 py-0.5 rounded">📅 {trade.requiredDate}</span>;
}

export default function AddSiteModal({ onClose, onCreated }) {
  const lang = useUIStore((s) => s.lang);
  const t = content[lang];
  const tb = t.budget;
  const td = t.datePick;

  const today    = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const photoInputRef = useRef();
  const [form,         setForm]         = useState({ name: '', type: '', address: '' });
  const [trades,       setTrades]       = useState([]); // [{name, assigned, budgetType, maxAmount, totalHours, requiredDate}]
  const [photoFile,    setPhotoFile]    = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // budget mini-modal (step 1)
  const [pendingTrade,  setPendingTrade]  = useState(null);
  const [budgetType,    setBudgetType]    = useState('amount');
  const [budgetValue,   setBudgetValue]   = useState('');
  const [workersValue,  setWorkersValue]  = useState('');

  // date picker mini-modal (step 2)
  const [pendingDateEntry, setPendingDateEntry] = useState(null);
  const [dateViewYear,  setDateViewYear]  = useState(today.getFullYear());
  const [dateViewMonth, setDateViewMonth] = useState(today.getMonth());
  const [selectedDate,  setSelectedDate]  = useState(null);

  const maxDateMonth   = today.getMonth() === 11 ? 0  : today.getMonth() + 1;
  const maxDateYear    = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const isDateMaxMonth = dateViewYear === maxDateYear  && dateViewMonth === maxDateMonth;
  const isDateMinMonth = dateViewYear === today.getFullYear() && dateViewMonth === today.getMonth();

  useEffect(() => {
    const h = (e) => {
      if (e.key !== 'Escape') return;
      if (pendingDateEntry) { setPendingDateEntry(null); return; }
      if (pendingTrade)     { setPendingTrade(null);     return; }
      onClose();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, pendingTrade, pendingDateEntry]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleTradeClick = (name) => {
    const exists = trades.some((x) => x.name === name);
    if (exists) {
      setTrades((prev) => prev.filter((x) => x.name !== name));
    } else {
      setPendingTrade(name);
      setBudgetType('amount');
      setBudgetValue('');
      setWorkersValue('');
    }
  };

  const confirmBudget = (skip = false) => {
    const entry = { name: pendingTrade, assigned: false, budgetType: null, maxAmount: null, totalHours: null, workers_no: null };
    if (!skip && budgetValue) {
      const num = parseFloat(budgetValue);
      if (!isNaN(num) && num > 0) {
        entry.budgetType = budgetType;
        if (budgetType === 'amount') entry.maxAmount  = num;
        else                         entry.totalHours = num;
      }
    }
    const w = parseInt(workersValue);
    if (!isNaN(w) && w > 0) entry.workers_no = w;
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

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim())    return setError(t.errors.name);
    if (!form.type)           return setError(t.errors.type);
    if (!form.address.trim()) return setError(t.errors.address);
    if (!trades.length)       return setError(t.errors.trades);

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
    } catch {
      setError(t.errors.server);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && !pendingTrade && !pendingDateEntry && onClose()}>
        <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

          <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-amber-400 flex-shrink-0" />

          <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-2">{t.badge}</div>
              <h2 className="text-xl font-extrabold text-slate-800">{t.title}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg">×</button>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto px-8 py-6 flex-1 space-y-5">

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.name} <span className="text-red-400">{t.labels.required}</span></label>
              <input className={inputCls} value={form.name} onChange={set('name')} placeholder="Downtown Office Renovation" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.type} <span className="text-red-400">{t.labels.required}</span></label>
              <div className="flex gap-3">
                {['residential', 'commercial'].map((tp) => (
                  <button key={tp} type="button" onClick={() => setForm((f) => ({ ...f, type: tp }))}
                    className={`flex-1 py-3 rounded-2xl text-sm font-semibold border-2 capitalize transition-all duration-150 ${form.type === tp ? 'bg-amber-500 border-amber-500 text-white shadow' : 'bg-white border-amber-200 text-amber-700 hover:border-amber-400'}`}>
                    {t.types[tp]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.address} <span className="text-red-400">{t.labels.required}</span></label>
              <AddressField
                onChange={(val) => setForm((f) => ({ ...f, address: val }))}
                placeholder="456 Oak Ave, Los Angeles, CA 90001"
                inputCls={inputCls}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{t.labels.trades} <span className="text-red-400">{t.labels.required}</span></label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TRADE_PROFESSIONALITIES.map((item) => {
                  const tradeObj = trades.find((x) => x.name === item);
                  const active   = !!tradeObj;
                  return (
                    <button key={item} type="button" onClick={() => handleTradeClick(item)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all duration-150 ${active ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-sky-200 text-sky-700 hover:border-sky-400'}`}>
                      {active && <span className="mr-1">✓</span>}
                      {item}
                      {tradeObj && <BudgetBadge trade={tradeObj} />}
                      {tradeObj && <DateBadge trade={tradeObj} />}
                    </button>
                  );
                })}
              </div>
              {trades.length > 0 && <p className="text-xs text-sky-600 font-medium mt-2">{t.selected(trades.length)}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                {t.labels.photo} <span className="text-slate-400 normal-case font-normal">{t.labels.optional}</span>
              </label>
              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-amber-100 shadow-sm">
                  <img src={photoPreview} alt="Site preview" className="w-full h-40 object-cover" />
                  <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); photoInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white text-sm flex items-center justify-center hover:bg-black/70 transition">×</button>
                </div>
              ) : (
                <button type="button" onClick={() => photoInputRef.current.click()}
                  className="w-full border-2 border-dashed border-amber-200 rounded-2xl py-8 text-center text-sm text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-all">
                  <span className="text-2xl block mb-1">📷</span>{t.photoHint}
                </button>
              )}
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>

            {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">{error}</div>}
          </form>

          <div className="px-8 py-5 border-t border-slate-100 flex gap-3 flex-shrink-0">
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 bg-gradient-to-r from-amber-500 to-sky-400 hover:from-amber-400 disabled:opacity-60 text-white font-semibold py-3 rounded-2xl shadow shadow-amber-200 transition-all active:scale-[0.99] text-sm">
              {loading ? t.btn.creating : t.btn.create}
            </button>
            <button onClick={onClose} className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">{t.btn.cancel}</button>
          </div>
        </div>
      </div>

      {/* ── Budget mini-modal ────────────────────────────────── */}
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

              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                  {budgetType === 'amount' ? '$' : '⏱'}
                </span>
                <input
                  type="number" min="0" step={budgetType === 'amount' ? '0.01' : '1'}
                  value={budgetValue} onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder={budgetType === 'amount' ? tb.amountHint : tb.hoursHint}
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmBudget(false); } }}
                />
              </div>

              {/* Workers needed */}
              <div className="relative mb-5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">👷</span>
                <input
                  type="number" min="1" step="1"
                  value={workersValue} onChange={(e) => setWorkersValue(e.target.value)}
                  placeholder={lang === 'es' ? 'Número de trabajadores' : 'Number of workers'}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 transition"
                />
              </div>
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button type="button" onClick={() => confirmBudget(false)}
                className="flex-1 bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white font-semibold py-2.5 rounded-xl text-sm shadow shadow-sky-200 transition-all active:scale-[0.98]">
                {tb.next}
              </button>
              <button type="button" onClick={() => confirmBudget(true)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition" title="Add without budget">
                {tb.skip}
              </button>
              <button type="button" onClick={() => setPendingTrade(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">
                {tb.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Date picker mini-modal ───────────────────────────── */}
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
              {buildCalendar(dateViewYear, dateViewMonth).map((day, i) => {
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
    </>
  );
}
