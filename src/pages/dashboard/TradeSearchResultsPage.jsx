import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/uiStore.js';
import TradeCalendarModal from '../../components/contractor/TradeCalendarModal.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDistance(meters, unit) {
  if (unit === 'km') return `${(meters / 1000).toFixed(1)} km`;
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function isBusyToday(busyDays = []) {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return busyDays.includes(key);
}

// ── Content strings ───────────────────────────────────────────────────────────
const content = {
  en: {
    back:      '← Back to Projects',
    found:     (n) => `${n} professional${n !== 1 ? 's' : ''} found`,
    none:      'No professionals found in this area.',
    title:     (trade, site) => `${trade} professionals near project "${site}"`,
    distance:  'away',
    busy:      'Busy today',
    available: 'Available',
    openCal:   'Schedule',
  },
  es: {
    back:      '← Volver a Proyectos',
    found:     (n) => `${n} profesional${n !== 1 ? 'es' : ''} encontrado${n !== 1 ? 's' : ''}`,
    none:      'No se encontraron profesionales en esta área.',
    title:     (trade, site) => `Profesionales de ${trade} cerca del proyecto "${site}"`,
    distance:  'de distancia',
    busy:      'Ocupado hoy',
    available: 'Disponible',
    openCal:   'Agendar',
  },
};

// ── Pro card ──────────────────────────────────────────────────────────────────
function ProCard({ pro, unit, t, siteName, tradeEntry = {}, onOpenCalendar }) {
  const busy        = isBusyToday(pro.busyDays);
  const siteBooking = pro.bookings?.find((b) => b.siteName === siteName);

  const formatBookingDate = (dateKey) =>
    new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const borderClass = siteBooking
    ? 'border-sky-200 bg-sky-50/30'
    : busy
      ? 'border-red-100'
      : 'border-emerald-100';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm px-4 py-4 transition-all ${borderClass}`}>

      {/* Row 1: avatar + name + status + distance */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {pro.photo
            ? <img src={pro.photo} alt={pro.fullName} className="w-12 h-12 rounded-xl object-cover object-top border border-slate-100" />
            : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-2xl">🔧</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-base truncate">{pro.fullName}</p>
          {siteBooking
            ? <p className="text-xs text-slate-400 truncate">📍 {pro.address}</p>
            : <p className="text-xs text-slate-300 italic truncate">Address visible after booking</p>
          }
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {siteBooking ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 whitespace-nowrap">
              ✅ {formatBookingDate(siteBooking.dates?.[0])}
            </span>
          ) : (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${busy ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {busy ? t.busy : t.available}
            </span>
          )}
          <span className="text-[10px] text-slate-400 whitespace-nowrap">
            {formatDistance(pro.distance, unit)} {t.distance}
          </span>
        </div>
      </div>

      {/* Row 2: rate + estimated cost + schedule button */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {pro.hourlyRate ? (
          <span className="text-xs text-slate-500">
            💰 <span className="font-extrabold text-amber-500">${pro.hourlyRate}/hr</span>
          </span>
        ) : (
          <span className="text-xs text-slate-300 italic">No rate</span>
        )}
        {tradeEntry.budgetType === 'hours' && tradeEntry.totalHours && pro.hourlyRate && (
          <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold px-2 py-0.5 rounded-lg">
            {tradeEntry.totalHours}h × ${pro.hourlyRate} = <span className="font-extrabold">${tradeEntry.totalHours * pro.hourlyRate}</span>
          </span>
        )}
        <div className="ml-auto flex-shrink-0">
          <button
            onClick={() => onOpenCalendar(pro._id)}
            className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-4 py-2 rounded-xl transition active:scale-95"
          >
            📅 {t.openCal}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TradeSearchResultsPage() {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const results      = state?.results      ?? [];
  const siteName     = state?.siteName     ?? '';
  const siteAddress  = state?.siteAddress  ?? '';
  const siteId       = state?.siteId       ?? '';
  const trade        = state?.trade        ?? '';
  const tradeEntry   = state?.tradeEntry   ?? {};
  const requiredDate = state?.requiredDate ?? null;
  const unit         = state?.unit         ?? 'mi';
  const mySiteNames  = state?.mySiteNames  ?? [];

  const [calendarPro, setCalendarPro] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800">

      {/* ── Sticky top bar ──────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/contractor')}
          className="flex items-center gap-2 text-amber-600 hover:text-amber-500 font-semibold text-sm transition"
        >
          {t.back}
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-base font-bold text-sky-600 tracking-tight hidden sm:block">TradeLink</span>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Results header */}
        <div className="mb-6 px-1">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 leading-snug">
            {t.title(trade, siteName)}
          </h1>
          <p className="text-sm text-slate-400 mt-1">{t.found(results.length)}</p>
        </div>

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-10 text-sm text-slate-400 text-center">
            {t.none}
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((pro) => (
              <ProCard
                key={pro._id}
                pro={pro}
                unit={unit}
                t={t}
                siteName={siteName}
                tradeEntry={tradeEntry}
                onOpenCalendar={(proId) =>
                  setCalendarPro({ proId, siteName, siteAddress, siteId, requiredDate })
                }
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Trade Calendar Modal ─────────────────────────────────────── */}
      {calendarPro && (
        <TradeCalendarModal
          tradeId={calendarPro.proId}
          siteName={calendarPro.siteName}
          siteAddress={calendarPro.siteAddress}
          siteId={calendarPro.siteId}
          requiredDate={calendarPro.requiredDate ?? null}
          mySiteNames={mySiteNames}
          onClose={() => setCalendarPro(null)}
        />
      )}
    </div>
  );
}
