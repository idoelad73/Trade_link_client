import { useState, useCallback } from 'react';
import { updateSchedule } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';

const DAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};
const MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};

const content = {
  en: {
    legend:   { free: 'Available', busy: 'Off', booked: 'On Job', today: 'Today' },
    hint:     'Tap a day to toggle',
    save:     'Save Schedule',
    saving:   'Saving…',
    saved:    '✓ Schedule saved',
    tapHint:  'Tap any day to change your availability',
    radius:   { title: 'Work Radius', desc: 'How far are you willing to travel?' },
    findJob:  'Find a Job',
    within:   'within',
  },
  es: {
    legend:   { free: 'Disponible', busy: 'Libre no', booked: 'En obra', today: 'Hoy' },
    hint:     'Toca un día para cambiar',
    save:     'Guardar Calendario',
    saving:   'Guardando…',
    saved:    '✓ Calendario guardado',
    tapHint:  'Toca cualquier día para cambiar tu disponibilidad',
    radius:   { title: 'Radio de Trabajo', desc: '¿Qué tan lejos estás dispuesto a viajar?' },
    findJob:  'Buscar Trabajo',
    within:   'en',
  },
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

export default function TradeSchedule({ initialBusyDays = [], initialBookings = [] }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [busyDays,   setBusyDays]   = useState(() => new Set(initialBusyDays));
  const bookingMap = Object.fromEntries(initialBookings.map((b) => [b.date, b]));
  const [dirty,    setDirty]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const [unit,     setUnit]     = useState('mi');
  const [distance, setDistance] = useState(25);

  const cells    = buildCalendar(year, month);
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); };

  const toggleDay = (day) => {
    if (!day) return;
    const key = toDateKey(year, month, day);
    setBusyDays((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
    setDirty(true);
    setSaved(false);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateSchedule([...busyDays]);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* keep dirty so user can retry */ }
    finally { setSaving(false); }
  }, [busyDays]);

  const kmValue    = Math.round(distance * 1.609);
  const displayDist = unit === 'mi' ? `${distance} mi` : `${kmValue} km`;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">

      {/* Calendar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-md overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-500 to-sky-400">
          <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition">‹</button>
          <h2 className="text-white font-extrabold text-lg tracking-tight">{MONTHS[lang][month]} {year}</h2>
          <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition">›</button>
        </div>

        <div className="flex items-center gap-3 px-6 py-3 border-b border-sky-50 bg-sky-50/40 flex-wrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.free}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300" /><span className="text-xs text-slate-500 font-medium">{t.legend.busy}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-700" /><span className="text-xs text-slate-500 font-medium">{t.legend.booked}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-sky-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.today}</span></div>
          <span className="text-xs text-slate-400 ml-auto">{t.hint}</span>
        </div>

        <div className="grid grid-cols-7 px-3 pt-3 pb-1">
          {DAYS[lang].map((d) => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-3 pb-4">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const key     = toDateKey(year, month, day);
            const booking = bookingMap[key];
            const isOff   = busyDays.has(key);
            const isToday = key === todayKey;
            // Booked days can't be toggled manually
            return (
              <div key={key} className="relative group">
                <button
                  onClick={() => !booking && toggleDay(day)}
                  disabled={!!booking}
                  className={`relative w-full aspect-square rounded-xl text-sm font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 select-none
                    ${booking
                      ? 'bg-red-700 text-white shadow-sm shadow-red-300 cursor-default'
                      : isOff
                        ? 'bg-red-300 text-white shadow-sm shadow-red-100 hover:bg-red-400'
                        : 'bg-emerald-400 text-white shadow-sm shadow-emerald-100 hover:bg-emerald-500'}
                    ${isToday ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`}
                >
                  {day}
                  {booking && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/80" />}
                  {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />}
                </button>
                {booking && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 hidden group-hover:block w-44 bg-slate-800 text-white text-xs rounded-xl p-2.5 shadow-xl pointer-events-none">
                    <p className="font-bold truncate">🏗️ {booking.siteName}</p>
                    {booking.siteAddress && <p className="text-slate-300 mt-0.5 truncate">📍 {booking.siteAddress}</p>}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 pb-5">
          {dirty || saved ? (
            <button onClick={handleSave} disabled={saving || saved}
              className={`w-full py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${saved ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-sky-500 hover:bg-sky-400 text-white shadow shadow-sky-200 active:scale-[0.99]'}`}>
              {saving ? t.saving : saved ? t.saved : t.save}
            </button>
          ) : (
            <p className="text-center text-xs text-slate-400">{t.tapHint}</p>
          )}
        </div>
      </div>

      {/* Distance & Find Job */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-md px-6 py-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700">{t.radius.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t.radius.desc}</p>
          </div>
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            {['mi', 'km'].map((u) => (
              <button key={u} onClick={() => setUnit(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${unit === u ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <span className="text-4xl font-extrabold text-sky-500">{displayDist}</span>
        </div>

        <div>
          <input type="range" min={5} max={200} step={5} value={distance} onChange={(e) => setDistance(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-sky-500"
            style={{ background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((distance - 5) / 195) * 100}%, #e0f2fe ${((distance - 5) / 195) * 100}%, #e0f2fe 100%)` }}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
            <span>5 {unit}</span><span>200 {unit}</span>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400 hover:from-amber-400 hover:to-sky-300 text-white font-extrabold text-base py-4 rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-[0.99] tracking-wide flex items-center justify-center gap-3 mt-2">
          <span className="text-xl">🔍</span>
          {t.findJob}
          <span className="text-sm font-normal opacity-80">{t.within} {displayDist}</span>
        </button>
      </div>
    </div>
  );
}
