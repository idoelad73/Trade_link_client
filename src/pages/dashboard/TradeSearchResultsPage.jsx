import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/uiStore.js';
import TradeCalendarModal from '../../components/contractor/TradeCalendarModal.jsx';
import { getWorkersLeft } from '../../api/contractor.js';

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

// Round to nearest 0.5  (e.g. 3.1→3.0, 3.26→3.5, 3.75→4.0)
function roundHalf(n) {
  return Math.round(n * 2) / 2;
}

// Single star — full / half / empty
function StarIcon({ fill }) {
  if (fill === 'full')  return <span className="text-amber-400 leading-none" style={{ fontSize: 13 }}>★</span>;
  if (fill === 'empty') return <span className="text-slate-200 leading-none" style={{ fontSize: 13 }}>★</span>;
  // half — clip a filled star to 50 % width over an empty base
  return (
    <span className="relative inline-block leading-none" style={{ fontSize: 13 }}>
      <span className="text-slate-200">★</span>
      <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: '50%' }}>★</span>
    </span>
  );
}

// Grade badge — clickable to open TradeFullInfoModal
function GradeBadge({ avg, count, onOpen }) {
  if (!avg) return null;
  const rounded = roundHalf(avg);

  const COLOR =
    rounded >= 4.5 ? { bg: '#eef9f0', border: '#86efac', text: '#16a34a' } :
    rounded >= 3.5 ? { bg: '#fefce8', border: '#fde047', text: '#ca8a04' } :
    rounded >= 2.5 ? { bg: '#fff7ed', border: '#fdba74', text: '#ea580c' } :
                     { bg: '#fff1f2', border: '#fca5a5', text: '#dc2626' };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
      style={{ background: COLOR.bg, borderColor: COLOR.border }}
      title="View trade profile"
    >
      <div className="flex items-center gap-px">
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'empty';
          return <StarIcon key={n} fill={fill} />;
        })}
      </div>
      <span className="text-xs font-extrabold leading-none" style={{ color: COLOR.text }}>
        {rounded.toFixed(1)}
      </span>
      {count > 0 && (
        <span className="text-[10px] font-medium text-slate-400 leading-none">({count})</span>
      )}
    </button>
  );
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
function ProCard({ pro, unit, t, siteName, tradeEntry = {}, slotsLeft, isFull, onOpenCalendar, onOpenProfile }) {
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
          {pro.avgGrade
            ? <div className="mt-0.5 mb-0.5"><GradeBadge avg={pro.avgGrade} count={pro.gradeCount ?? 0} onOpen={onOpenProfile} /></div>
            : <button type="button" onClick={onOpenProfile} className="text-[10px] text-slate-300 italic mt-0.5 hover:text-sky-400 transition">View profile</button>
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
              onClick={() => onOpenCalendar(pro._id)}
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

  const [calendarPro, setCalendarPro] = useState(null);
  const [slotsInfo,   setSlotsInfo]   = useState(null); // { workersLeft, isFull }

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
                slotsLeft={slotsInfo?.workersLeft ?? null}
                isFull={slotsInfo?.isFull ?? false}
                onOpenCalendar={(proId) =>
                  setCalendarPro({
                    proId,
                    siteName:     directSearch ? '' : siteName,
                    siteAddress:  directSearch ? '' : siteAddress,
                    siteId:       directSearch ? null : siteId,
                    requiredDate: directSearch ? null : requiredDate,
                    tradeName:    trade,
                    workersNo:    tradeEntry.workers_no ?? 0,
                  })
                }
                onOpenProfile={() => navigate(`/dashboard/contractor/trade-profile/${pro._id}`)}
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
          tradeName={calendarPro.tradeName ?? ''}
          workersNo={calendarPro.workersNo ?? 0}
          mySiteNames={mySiteNames}
          onClose={() => { setCalendarPro(null); if (requiredDate) getWorkersLeft(siteId, trade, requiredDate).then(setSlotsInfo).catch(() => {}); }}
        />
      )}
    </div>
  );
}
