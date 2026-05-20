import { useState, useEffect } from 'react';
import { getTradeBusyDays, askAvailability } from '../../api/contractor.js';
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
    badge:      '📅 Availability Calendar',
    subtitle:   (name) => `${name}'s schedule`,
    legend:     { free: 'Available', busy: 'Off', booked: 'On Job', today: 'Today', selected: 'Selected' },
    pickHint:   'Tap a day to select a date for your request',
    selectedOn: (d) => `Selected: ${d}`,
    askBtn:     'Ask for Availability',
    asking:     'Sending…',
    sent:       '✓ Request sent!',
    loading:    'Loading calendar…',
    error:      'Failed to load calendar.',
    sendError:  'Failed to send. Please try again.',
  },
  es: {
    badge:      '📅 Calendario de Disponibilidad',
    subtitle:   (name) => `Horario de ${name}`,
    legend:     { free: 'Disponible', busy: 'Libre no', booked: 'En obra', today: 'Hoy', selected: 'Seleccionado' },
    pickHint:   'Toca un día para seleccionar la fecha de tu solicitud',
    selectedOn: (d) => `Seleccionado: ${d}`,
    askBtn:     'Solicitar Disponibilidad',
    asking:     'Enviando…',
    sent:       '✓ ¡Solicitud enviada!',
    loading:    'Cargando calendario…',
    error:      'Error al cargar el calendario.',
    sendError:  'Error al enviar. Inténtalo de nuevo.',
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

function formatDisplay(dateKey, lang) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function TradeCalendarModal({ tradeId, siteName, siteAddress, mySiteNames = [], onClose }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const today    = new Date();
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const [year,        setYear]        = useState(today.getFullYear());
  const [month,       setMonth]       = useState(today.getMonth());
  const [pro,         setPro]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [sending,     setSending]     = useState(false);
  const [sent,        setSent]        = useState(false);
  const [sendError,   setSendError]   = useState('');

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    getTradeBusyDays(tradeId)
      .then(setPro)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [tradeId]);

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const busySet    = new Set(pro?.busyDays ?? []);
  // bookingMap: date → { siteName, siteAddress }
  const bookingMap = Object.fromEntries((pro?.bookings ?? []).map((b) => [b.date, b]));
  const cells      = buildCalendar(year, month);

  const handleDayClick = (day) => {
    const key = toDateKey(year, month, day);
    setSelectedKey((prev) => prev === key ? null : key);
    setSent(false);
    setSendError('');
  };

  const handleAsk = async () => {
    if (!selectedKey || sending || sent) return;
    setSendError('');
    setSending(true);
    try {
      await askAvailability(tradeId, selectedKey, siteName, siteAddress, lang);
      setSent(true);
      setTimeout(onClose, 2000);
    } catch {
      setSendError(t.sendError);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 to-emerald-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            {pro?.photo && (
              <img src={pro.photo} alt={pro.fullName} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-sm flex-shrink-0" />
            )}
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200 mb-1">
                {t.badge}
              </div>
              <h2 className="text-base font-extrabold text-slate-800 leading-tight">
                {pro ? t.subtitle(pro.fullName) : '…'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg flex-shrink-0 ml-3"
          >×</button>
        </div>

        {/* Calendar body */}
        <div className="flex flex-col overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
            </div>
          ) : fetchError ? (
            <div className="px-8 py-10 text-center text-sm text-red-500">{t.error}</div>
          ) : (
            <>
              {/* Month nav */}
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-500 to-sky-400">
                <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition">‹</button>
                <h3 className="text-white font-extrabold text-base tracking-tight">{MONTHS[lang][month]} {year}</h3>
                <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition">›</button>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 px-6 py-2.5 border-b border-sky-50 bg-sky-50/40 flex-wrap">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.free}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300" /><span className="text-xs text-slate-500 font-medium">{t.legend.busy}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-600" /><span className="text-xs text-slate-500 font-medium">{t.legend.booked}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-sky-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.today}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.selected}</span></div>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 px-3 pt-3 pb-1">
                {DAYS[lang].map((d) => (
                  <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide py-1">{d}</div>
                ))}
              </div>

              {/* Day cells — clickable to select */}
              <div className="grid grid-cols-7 gap-1 px-3 pb-4">
                {cells.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />;
                  const key        = toDateKey(year, month, day);
                  const booking    = bookingMap[key];
                  const isOff      = busySet.has(key);
                  const isToday    = key === todayKey;
                  const isSelected = key === selectedKey;
                  return (
                    <div key={key} className="relative group">
                      <button
                        type="button"
                        onClick={() => !booking && handleDayClick(day)}
                        disabled={!!booking}
                        className={`w-full aspect-square rounded-xl text-sm font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 select-none
                          ${isSelected
                            ? 'bg-amber-400 text-white shadow-md shadow-amber-200 scale-105'
                            : booking
                              ? 'bg-red-700 text-white shadow-sm shadow-red-300 cursor-default'
                              : isOff
                                ? 'bg-red-300 text-white shadow-sm shadow-red-100 hover:bg-red-400'
                                : 'bg-emerald-400 text-white shadow-sm shadow-emerald-100 hover:bg-emerald-500'}
                          ${isToday ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`}
                      >
                        {day}
                        {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />}
                      </button>
                      {/* Tooltip — only visible to the contractor who owns this site */}
                      {booking && mySiteNames.includes(booking.siteName) && (
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

              {/* Selected date + ask button */}
              <div className="px-6 pb-6 space-y-3">
                {selectedKey ? (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
                    <span className="text-amber-500">📅</span>
                    <span className="text-sm font-semibold text-amber-700">{formatDisplay(selectedKey, lang)}</span>
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400">{t.pickHint}</p>
                )}

                {sendError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600">{sendError}</div>
                )}

                <button
                  onClick={handleAsk}
                  disabled={!selectedKey || sending || sent}
                  className={`w-full py-3 rounded-2xl text-sm font-bold transition-all duration-200 active:scale-[0.99]
                    ${sent
                      ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                      : selectedKey
                        ? 'bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 text-white shadow shadow-sky-200'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      {t.asking}
                    </span>
                  ) : sent ? t.sent : t.askBtn}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
