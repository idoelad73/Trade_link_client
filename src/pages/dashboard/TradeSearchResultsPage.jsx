import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/uiStore.js';
import { getWorkersLeft } from '../../api/contractor.js';
import useTradeRate from '../../hooks/useTradeRate.js';
import GradeBadge from '../../components/shared/GradeBadge.jsx';

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
    typical:   'Typical',
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
    typical:   'Típica',
  },
};

// ── Pro card ──────────────────────────────────────────────────────────────────
function ProCard({ pro, unit, t, siteName, tradeEntry = {}, typicalRate, slotsLeft, isFull, onOpenCalendar, onOpenProfile }) {
  const busy        = isBusyToday(pro.busyDays);
  const siteBooking = pro.bookings?.find((b) => b.siteName === siteName);

  const formatBookingDate = (dateKey) =>
    new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const borderClass = isFull
    ? 'border-slate-200 bg-slate-50/50 opacity-60'
    : siteBooking
      ? 'border-sky-200 bg-sky-50/30'
      : busy
        ? 'border-red-100'
        : 'border-emerald-100';

  return (
    // Whole card opens the pro's full profile page (same as Schedule)
    <div
      onClick={onOpenProfile}
      className={`bg-white rounded-2xl border shadow-sm px-4 py-4 transition-all cursor-pointer hover:shadow-md ${borderClass}`}
    >

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
          {pro.avgGrade
            ? <div className="mt-0.5 mb-0.5"><GradeBadge avg={pro.avgGrade} count={pro.gradeCount ?? 0} onOpen={onOpenProfile} /></div>
            : <button type="button" onClick={(e) => { e.stopPropagation(); onOpenProfile(); }} className="text-[10px] text-slate-300 italic mt-0.5 hover:text-sky-400 transition">View profile</button>
          }
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
        {typicalRate && (
          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full whitespace-nowrap">
            📊 {t.typical} ${typicalRate.rateLow}–{typicalRate.rateHigh}/hr
          </span>
        )}
        <div className="ml-auto flex-shrink-0 flex items-center gap-2">
          {slotsLeft != null && !isFull && (
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              👷 {slotsLeft} slot{slotsLeft !== 1 ? 's' : ''} left
            </span>
          )}
          {isFull ? (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl">
              🚫 Slots Full
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onOpenCalendar(pro._id); }}
              className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-4 py-2 rounded-xl transition active:scale-95"
            >
              📅 {t.openCal}
            </button>
          )}
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
  const directSearch = state?.directSearch ?? false;
  const typicalRate  = useTradeRate(trade);

  const [slotsInfo,   setSlotsInfo]   = useState(null); // { workersLeft, isFull }

  // Card click / Schedule → the pro's full profile page; the calendar is started from there
  const openPro = (proId) => navigate(`/dashboard/contractor/trade-profile/${proId}`, {
    state: {
      schedule: {
        siteName:     directSearch ? '' : siteName,
        siteAddress:  directSearch ? '' : siteAddress,
        siteId:       directSearch ? null : siteId,
        requiredDate: directSearch ? null : requiredDate,
        tradeName:    trade,
        workersNo:    tradeEntry.workers_no ?? 0,
        mySiteNames,
      },
    },
  });

  // Fetch remaining worker slots for this trade+date (one call for the whole results page)
  useEffect(() => {
    if (directSearch || !siteId || !trade || !requiredDate) return;
    getWorkersLeft(siteId, trade, requiredDate)
      .then(setSlotsInfo)
      .catch(() => {});
  }, [directSearch, siteId, trade, requiredDate]);

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
                typicalRate={typicalRate}
                slotsLeft={slotsInfo?.workersLeft ?? null}
                isFull={slotsInfo?.isFull ?? false}
                onOpenCalendar={openPro}
                onOpenProfile={() => openPro(pro._id)}
              />
            ))}
          </div>
        )}
      </main>

    </div>
  );
}
