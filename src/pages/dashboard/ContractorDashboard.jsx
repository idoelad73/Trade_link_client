import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { getSites, findTradesForSite, updateSite, getApplications, getPaymentApprovalsCount, getGradableTrades, getSiteDepositSummary } from '../../api/contractor.js';
import ContractorInfoModal from '../../components/contractor/ContractorInfoModal.jsx';
import AddSiteModal from '../../components/contractor/AddSiteModal.jsx';
import ManageTradesModal from '../../components/contractor/ManageTradesModal.jsx';
import UpdateSitePhotoModal from '../../components/contractor/UpdateSitePhotoModal.jsx';
import ContractorApplicationsModal from '../../components/contractor/ContractorApplicationsModal.jsx';
import DepositSummaryModal from '../../components/contractor/DepositSummaryModal.jsx';
import TradeGradesListModal from '../../components/contractor/TradeGradesListModal.jsx';

const content = {
  en: {
    tabs: {
      info:     'Contractor Info',
      addSite:  'Add Project',
      allSites: 'All Projects',
      receipts: 'Receipts',
    },
    role:   'Contractor',
    logOut: 'Log Out',
    allSites: {
      title:    'All Projects',
      subtitle: (n) => `${n} project${n !== 1 ? 's' : ''} registered`,
      addBtn:   'Add Project',
      empty:    { title: 'No projects yet', desc: 'Add your first construction project to get started.', btn: 'Add Your First Project' },
    },
    status:   { active: 'active', completed: 'completed', on_hold: 'on hold' },
    findTrade: {
      tradesLabel: 'Trades Needed',
      findBtn:     'Find',
      within:      'within',
      radius:      { title: 'Search Radius', desc: 'Maximum distance from your projects' },
    },
    results: {
      title:      (trade, site) => `${trade} professionals near project "${site}"`,
      found:      (n) => `${n} professional${n !== 1 ? 's' : ''} found`,
      none:       'No professionals found in this area.',
      noLocation: 'Site location could not be determined from its address.',
      error:      'Search failed. Please try again.',
      distance:    'away',
      busy:        'Busy today',
      available:   'Available',
      scheduled:   'Scheduled',
      openCal:     'Schedule',
      close:       'Close Results',
    },
  },
  es: {
    tabs: {
      info:     'Info del Contratista',
      addSite:  'Agregar Proyecto',
      allSites: 'Todos los Proyectos',
      receipts: 'Recibos',
    },
    role:   'Contratista',
    logOut: 'Cerrar Sesión',
    allSites: {
      title:    'Todos los Proyectos',
      subtitle: (n) => `${n} proyecto${n !== 1 ? 's' : ''} registrado${n !== 1 ? 's' : ''}`,
      addBtn:   'Agregar Proyecto',
      empty:    { title: 'Sin proyectos aún', desc: 'Agrega tu primer proyecto de construcción para comenzar.', btn: 'Agregar Primer Proyecto' },
    },
    status:   { active: 'activo', completed: 'completado', on_hold: 'en pausa' },
    findTrade: {
      tradesLabel: 'Oficios Necesarios',
      findBtn:     'Buscar',
      within:      'en',
      radius:      { title: 'Radio de Búsqueda', desc: 'Distancia máxima desde tus proyectos' },
    },
    results: {
      title:      (trade, site) => `Profesionales de ${trade} cerca del proyecto "${site}"`,
      found:      (n) => `${n} profesional${n !== 1 ? 'es' : ''} encontrado${n !== 1 ? 's' : ''}`,
      none:       'No se encontraron profesionales en esta área.',
      noLocation: 'No se pudo determinar la ubicación de la obra.',
      error:      'Error en la búsqueda. Inténtalo de nuevo.',
      distance:    'de distancia',
      busy:        'Ocupado hoy',
      available:   'Disponible',
      scheduled:   'Programado',
      openCal:     'Agendar',
      close:       'Cerrar Resultados',
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDistance(meters, unit) {
  if (unit === 'km') return `${(meters / 1000).toFixed(1)} km`;
  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function isBusyToday(busyDays = []) {
  const today = new Date();
  const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return busyDays.includes(key);
}

// ── Professional result card ─────────────────────────────────────────────────
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
    <div className={`bg-white rounded-2xl border shadow-sm px-4 py-3 transition-all ${borderClass}`}>

      {/* Row 1: avatar + name + status + distance */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {pro.photo
            ? <img src={pro.photo} alt={pro.fullName} className="w-10 h-10 rounded-xl object-cover object-top border border-slate-100" />
            : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-lg">🔧</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{pro.fullName}</p>
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

      {/* Row 2: rate + estimated cost + action button */}
      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
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
            className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-xl transition active:scale-95"
          >
            📅 {t.openCal}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtDate(dateKey) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split('-');
  return `${m}/${d}/${y}`;
}

// ── Site card with per-site trade picker ─────────────────────────────────────
function SiteCard({ site, t, displayDist, selectedTrade, onSelectTrade, onFind, onManageTrades, onUpdatePhoto, onWorkPlan, searchState }) {
  const statusLabel   = t.status[site.status] ?? site.status;
  const isSearching   = searchState?.loading;
  const hasNoTrades   = !site.tradesNeeded?.length;
  const hasAssigned   = site.tradesNeeded?.some((tr) => tr.assigned);

  return (
    <div className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col ${
      hasNoTrades
        ? 'border-2 border-red-300 ring-2 ring-red-200'
        : 'border border-amber-100'
    }`}>
      {/* Photo / placeholder */}
      <div className="relative">
        {site.photo
          ? <img src={site.photo} alt={site.name} className="w-full h-36 object-cover" />
          : (
            <div className="w-full h-36 bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center text-4xl">
              {site.type === 'residential' ? '🏠' : '🏢'}
            </div>
          )}
        {/* Manage trades button — top-right corner */}
        <button
          type="button"
          onClick={() => onManageTrades(site)}
          title="Manage Trades"
          className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 hover:bg-white border border-slate-200 text-slate-600 hover:text-amber-600 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-sm transition-all active:scale-95"
        >
          ✏️ Trades
        </button>
        {/* Work Plan button — top-left corner, shown when at least one trade is assigned */}
        {hasAssigned && (
          <button
            type="button"
            onClick={() => onWorkPlan(site._id)}
            title="Work Plan"
            className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold px-2.5 py-1 rounded-xl shadow-sm transition-all active:scale-95"
          >
            📋 Work Plan
          </button>
        )}
        {/* Update photo button — bottom-left corner */}
        <button
          type="button"
          onClick={() => onUpdatePhoto(site)}
          title="Update Photo"
          className="absolute bottom-2 left-2 flex items-center gap-1 bg-white/90 hover:bg-white border border-slate-200 text-slate-600 hover:text-sky-600 text-xs font-semibold px-2.5 py-1 rounded-xl shadow-sm transition-all active:scale-95"
        >
          📷 Photo
        </button>
        {/* No-trades badge */}
        {hasNoTrades && (
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow">
            ⚠️ No trades
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-800 text-sm leading-tight">{site.name}</h3>
          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
            site.type === 'residential' ? 'bg-sky-50 text-sky-600 border-sky-200' : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            {site.type}
          </span>
        </div>

        {hasAssigned && <p className="text-xs text-slate-500 mb-3 leading-relaxed">📍 {site.address}</p>}

        {/* Per-site trade picker */}
        {!hasNoTrades && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {t.findTrade.tradesLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {site.tradesNeeded.map((tr) => {
                console.log(`[trade-card] site="${site.name}" trade="${tr.name}" requiredDate="${tr.requiredDate}" workers_no=${tr.workers_no}`);
                const isSelected    = selectedTrade === tr.name;
                const isAssigned    = tr.assigned;
                const hasWorkers    = tr.workers_no !== null && tr.workers_no !== undefined;
                const isFull        = hasWorkers ? tr.workers_no <= 0 : isAssigned;
                const isDepositHeld = tr.depositHeld === true;
                const dateLabel     = fmtDate(tr.requiredDate);
                return (
                  <button
                    key={tr.name}
                    type="button"
                    onClick={() => {
                      if (isDepositHeld) return; // deposit done, no action
                      if (isFull) {
                        console.log('[deposit-click] trade card clicked, siteId=', site._id);
                        getSiteDepositSummary(site._id)
                          .then((summary) => {
                            console.log('[deposit-click] summary:', summary);
                            if (summary.total > 0) setDepositData({ siteId: site._id, ...summary });
                          })
                          .catch((err) => console.error('[deposit-click] error:', err));
                      } else {
                        onSelectTrade(site._id, isSelected ? null : tr.name);
                      }
                    }}
                    className={`flex flex-col items-start gap-1 px-2.5 py-2 rounded-xl border-2 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                      isDepositHeld
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow shadow-emerald-100 cursor-default'
                        : isFull
                          ? 'bg-orange-400 border-orange-400 text-white shadow shadow-orange-100 hover:bg-orange-500 cursor-pointer'
                          : isSelected
                            ? 'bg-orange-500 border-orange-500 text-white shadow shadow-orange-200'
                            : isAssigned
                              ? 'bg-amber-50 border-amber-300 text-amber-800 hover:border-amber-400 hover:bg-amber-100'
                              : 'bg-white border-amber-200 text-amber-700 hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    {/* Row 1: name */}
                    <span className="flex items-center gap-1 leading-none">
                      {isDepositHeld && <span className="text-[10px]">✅</span>}
                      {!isDepositHeld && isFull     && <span className="text-[10px]">🔒</span>}
                      {!isDepositHeld && isAssigned && !isFull && <span className="text-[10px]">⚡</span>}
                      {tr.name}
                    </span>
                    {isDepositHeld && (
                      <span className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-bold text-white/90 bg-white/20 px-1.5 py-0.5 rounded-md leading-none">
                          Deposit held
                        </span>
                        {tr.depositAmount != null && (
                          <span className="text-[10px] font-extrabold text-white bg-white/25 px-1.5 py-0.5 rounded-md leading-none">
                            ${tr.depositAmount}
                          </span>
                        )}
                      </span>
                    )}
                    {/* Row 2: budget + date + workers badges */}
                    <span className="flex items-center gap-1 flex-wrap">
                        {tr.budgetType === 'amount' && tr.maxAmount && (
                          <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] leading-none ${isFull || isSelected ? 'bg-white/25 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                            💰 ${tr.maxAmount}
                          </span>
                        )}
                        {tr.budgetType === 'hours' && tr.totalHours && (
                          <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] leading-none ${isFull || isSelected ? 'bg-white/25 text-white' : 'bg-violet-50 text-violet-600 border border-violet-200'}`}>
                            ⏱ {tr.totalHours}h
                          </span>
                        )}
                        {tr.budgetType === 'hours' && tr.totalWorkingHrs != null && tr.workers_no > 0 && (
                          <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] leading-none ${isFull || isSelected ? 'bg-white/25 text-white' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
                            🕐 {tr.totalWorkingHrs}h total
                          </span>
                        )}
                        {dateLabel ? (
                          <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] leading-none ${isFull || isSelected ? 'bg-white/25 text-white' : 'bg-sky-50 text-sky-600 border border-sky-200'}`}>
                            📅 {dateLabel}
                          </span>
                        ) : (
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] leading-none ${isFull || isSelected ? 'text-white/50' : 'text-slate-300 border border-dashed border-slate-200'}`}>
                            📅 –
                          </span>
                        )}
                        {hasWorkers && (
                          <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] leading-none ${
                            isFull || isSelected
                              ? 'bg-white/25 text-white'
                              : tr.workers_no === 0
                                ? 'bg-orange-50 text-orange-600 border border-orange-200'
                                : tr.workers_no <= 1
                                  ? 'bg-amber-50 text-amber-600 border border-amber-300'
                                  : 'bg-blue-50 text-blue-600 border border-blue-200'
                          }`}>
                            👷 {tr.workers_no}
                          </span>
                        )}
                      </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              hasNoTrades            ? 'bg-red-100 text-red-600'    :
              site.status === 'active'    ? 'bg-green-100 text-green-600' :
              site.status === 'completed' ? 'bg-blue-100 text-blue-600'  :
                                            'bg-yellow-100 text-yellow-600'
            }`}>
              {hasNoTrades ? 'inactive' : statusLabel}
            </span>
            <span className="text-xs text-slate-400">{new Date(site.createdAt).toLocaleDateString()}</span>
          </div>

          {selectedTrade && (
            <button
              onClick={() => onFind(site, selectedTrade)}
              disabled={isSearching}
              className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow shadow-orange-200 transition-all active:scale-95"
            >
              {isSearching ? (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : '🔍'}
              {t.findTrade.findBtn}
              <span className="font-normal opacity-80 hidden sm:inline">{t.findTrade.within} {displayDist}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const MAX_RATE = 300;

// ── Shared filters panel ─────────────────────────────────────────────────────
function DistancePanel({ unit, setUnit, distance, setDistance, maxRate, setMaxRate, minRating, setMinRating, t }) {
  const kmValue     = Math.round(distance * 1.609);
  const displayDist = unit === 'mi' ? `${distance} mi` : `${kmValue} km`;
  const rateLabel   = maxRate >= MAX_RATE ? 'Any rate' : `Up to $${maxRate}/hr`;
  const rateActive  = maxRate < MAX_RATE;
  const ratePct     = (maxRate / MAX_RATE) * 100;
  const ratingPct   = (minRating / 5) * 100;

  return (
    <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-orange-100 shadow-md px-6 py-5 space-y-6">

      {/* Distance */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">{t.radius.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t.radius.desc}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold text-orange-500">{displayDist}</span>
            <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
              {['mi', 'km'].map((u) => (
                <button key={u} onClick={() => setUnit(u)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                    unit === u ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
        <input
          type="range" min={5} max={200} step={5} value={distance}
          onChange={(e) => setDistance(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #f97316 0%, #f97316 ${((distance - 5) / 195) * 100}%, #fed7aa ${((distance - 5) / 195) * 100}%, #fed7aa 100%)` }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
          <span>5 {unit}</span><span>200 {unit}</span>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Max trade rate */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">💰 Trade Rate</h3>
            <p className="text-xs text-slate-400 mt-0.5">Maximum hourly rate to show</p>
          </div>
          <span className={`text-lg font-extrabold ${rateActive ? 'text-emerald-500' : 'text-slate-400'}`}>
            {rateLabel}
          </span>
        </div>
        <input
          type="range" min={0} max={MAX_RATE} step={5} value={maxRate}
          onChange={(e) => setMaxRate(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #10b981 0%, #10b981 ${ratePct}%, #d1fae5 ${ratePct}%, #d1fae5 100%)` }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
          <span>$0/hr</span><span>Any</span>
        </div>
      </div>

      <div className="border-t border-slate-100" />

      {/* Min rating */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">⭐ Trade Rating</h3>
            <p className="text-xs text-slate-400 mt-0.5">Minimum grade to show</p>
          </div>
          <span className={`text-lg font-extrabold ${minRating > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
            {minRating > 0 ? `${minRating}★ & up` : 'Any'}
          </span>
        </div>
        <input
          type="range" min={0} max={5} step={1} value={minRating}
          onChange={(e) => setMinRating(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${ratingPct}%, #fde68a ${ratingPct}%, #fde68a 100%)` }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
          <span>Any</span>
          <div className="flex gap-3.5 text-slate-300">
            {[1,2,3,4,5].map(n => <span key={n}>{n}</span>)}
          </div>
          <span>⭐ 5</span>
        </div>
      </div>

    </div>
  );
}


// ── Dashboard ────────────────────────────────────────────────────────────────
export default function ContractorDashboard() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const lang = useUIStore((s) => s.lang);
  const t = content[lang];

  const NAV_ITEMS = [
    { id: 'info',     label: t.tabs.info,     icon: '👤', modal: true  },
    { id: 'addSite',  label: t.tabs.addSite,  icon: '➕', modal: true  },
    { id: 'allSites', label: t.tabs.allSites, icon: '🏗️', modal: false },
    { id: 'receipts', label: t.tabs.receipts, icon: '🧾', modal: false, route: '/dashboard/contractor/receipts' },
  ];

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [activeView,   setActiveView]   = useState('allSites');
  const [openModal,    setOpenModal]    = useState(null);
  const [sites,        setSites]        = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [unit,         setUnit]         = useState('mi');
  const [distance,     setDistance]     = useState(25);
  const [maxRate,      setMaxRate]      = useState(MAX_RATE);
  const [minRating,    setMinRating]    = useState(0);
  const [findingFor,   setFindingFor]   = useState(null); // { siteId, trade } while search is in-flight
  const [manageSite,   setManageSite]   = useState(null);
  const [photoSite,    setPhotoSite]    = useState(null);
  const [selection,            setSelection]            = useState(null);
  const [applicationsOpen,     setApplicationsOpen]     = useState(false);
  const [applicationsCount,    setApplicationsCount]    = useState(0);
  const [depositData,          setDepositData]          = useState(null); // { siteId, siteName, rows, total }
  const [pendingPayments,      setPendingPayments]      = useState(0);
  const [gradableTrades,       setGradableTrades]       = useState(null); // null = modal closed
  const [gradableTradesCount,  setGradableTradesCount]  = useState(0);    // for badge
  const [gradeLoading,         setGradeLoading]         = useState(false);

  const refreshApplicationCount = () =>
    getApplications()
      .then(({ applications = [], reschedules = [], workerOffers = [] }) =>
        setApplicationsCount(
          applications.filter(a => a.status === 'pending').length +
          reschedules.length +
          workerOffers.length
        )
      ).catch(() => {});

  const refreshPaymentCount = () =>
    getPaymentApprovalsCount()
      .then((n) => setPendingPayments(n))
      .catch(() => {});

  const checkAndShowDeposit = (normalized) => {
    console.log('[deposit-check] checking', normalized.length, 'sites for workers_no===0');
    // Only trigger if no trade on this site has a deposit already held
    const site = normalized.find((s) =>
      s.tradesNeeded?.some((t) => t.workers_no === 0 && !t.depositHeld)
    );
    console.log('[deposit-check] site needing deposit:', site?._id, site?.name ?? 'none');
    if (!site) return;
    getSiteDepositSummary(site._id)
      .then((summary) => {
        console.log('[deposit-check] summary:', JSON.stringify(summary));
        if (summary.total > 0) {
          console.log('[deposit-check] ✅ showing modal, total=$' + summary.total);
          setDepositData({ siteId: site._id, ...summary });
        } else {
          console.log('[deposit-check] ❌ total=0 or alreadyPaid, modal skipped');
        }
      })
      .catch((err) => console.error('[deposit-check] error:', err));
  };

  const refreshSites = () =>
    getSites().then((loaded) => {
      const normalized = loaded.map((s) => ({
        ...s,
        tradesNeeded: (s.tradesNeeded || []).map((t) =>
          typeof t === 'string' ? { name: t, assigned: false } : t
        ),
      }));
      console.log('[refreshSites] sites after reload:',
        normalized.map(s => ({
          name: s.name,
          trades: s.tradesNeeded.map(t => ({ name: t.name, requiredDate: t.requiredDate, workers_no: t.workers_no })),
        }))
      );
      setSites(normalized);
      checkAndShowDeposit(normalized);
    }).catch(console.error);

  const handleSelectTrade = (siteId, trade) => {
    setSelection(trade ? { siteId, trade } : null);
  };

  const kmValue     = Math.round(distance * 1.609);
  const displayDist = unit === 'mi' ? `${distance} mi` : `${kmValue} km`;

  useEffect(() => {
    refreshApplicationCount();
    refreshPaymentCount();
    // Fetch gradable trades once on login — show modal and badge if any need reviewing
    getGradableTrades()
      .then(trades => {
        const count = trades?.length ?? 0;
        setGradableTradesCount(count);
        if (count) setGradableTrades(trades);
      })
      .catch(() => {});
  }, []);

  async function handleOpenGradeModal() {
    if (gradableTrades !== null) return; // modal already open
    setGradeLoading(true);
    try {
      const trades = await getGradableTrades();
      const count = trades?.length ?? 0;
      setGradableTradesCount(count);
      if (count) setGradableTrades(trades);
      // count === 0: do nothing — don't open an empty modal
    } catch {
      // keep existing count; don't open modal
    } finally {
      setGradeLoading(false);
    }
  }

  useEffect(() => {
    if (activeView === 'allSites') {
      setSitesLoading(true);
      getSites()
        .then((loaded) => {
          const normalized = loaded.map((s) => ({
            ...s,
            tradesNeeded: (s.tradesNeeded || []).map((t) =>
              typeof t === 'string' ? { name: t, assigned: false } : t
            ),
          }));
          setSites(normalized);

          checkAndShowDeposit(normalized);
        })
        .catch(console.error)
        .finally(() => setSitesLoading(false));
    }
  }, [activeView]);

  const handleNavClick = (item) => {
    if (item.route) { navigate(item.route); }
    else if (item.modal) { setOpenModal(item.id); }
    else { setActiveView(item.id); setOpenModal(null); }
  };

  const handleSiteCreated = (site) => {
    setSites((prev) => [site, ...prev]);
    setActiveView('allSites');
  };

  const handleTradesUpdated = (updatedSite) => {
    setSites((prev) => prev.map((s) => s._id === updatedSite._id ? updatedSite : s));
  };

  const handleFind = async (site, trade) => {
    setSelection(null);
    const tradeEntry = site.tradesNeeded.find((t) => t.name === trade) || {};
    setFindingFor({ siteId: site._id, trade });
    try {
      const data = await findTradesForSite(site._id, trade, distance, unit, maxRate < MAX_RATE ? maxRate : null, minRating > 0 ? minRating : null);
      navigate('/dashboard/contractor/trade-search', {
        state: {
          results:      data.results,
          siteName:     site.name,
          siteAddress:  site.address,
          siteId:       site._id,
          trade,
          tradeEntry,
          requiredDate: data.requiredDate ?? null,
          unit,
          mySiteNames:  sites.map((s) => s.name),
        },
      });
    } catch (err) {
      const noLocation = err?.response?.status === 422;
      alert(noLocation
        ? (lang === 'es' ? 'No se pudo determinar la ubicación de la obra.' : 'Site location could not be determined from its address.')
        : (lang === 'es' ? 'Error en la búsqueda. Inténtalo de nuevo.' : 'Search failed. Please try again.')
      );
    } finally {
      setFindingFor(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800">

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="sm:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-base font-bold text-sky-600 tracking-tight">TradeLink</span>
        </div>
        <div className="flex items-center gap-2">
          {(pendingPayments > 0 || applicationsCount > 0 || gradableTradesCount > 0) && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 text-amber-700 active:bg-amber-100 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile sidebar ────────────────────────────────────────────────── */}
      <div className={`fixed inset-0 z-50 sm:hidden transition-opacity duration-200 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className={`absolute left-0 top-0 h-full w-72 max-w-[82vw] bg-white flex flex-col shadow-2xl transform transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-lg font-bold text-sky-600 tracking-tight">TradeLink</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 transition font-bold text-sm">✕</button>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-sky-100 flex items-center justify-center text-xl flex-shrink-0">🏗️</div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{user?.companyName}</p>
              <p className="text-xs text-slate-400">{t.role}</p>
            </div>
          </div>

          {/* Nav + actions */}
          <nav className="flex flex-col px-3 py-3 gap-1 flex-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = !item.modal && activeView === item.id;
              return (
                <button key={item.id} onClick={() => { handleNavClick(item); setSidebarOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left w-full ${
                    isActive ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="my-2 border-t border-slate-100" />

            <button onClick={() => { navigate('/dashboard/contractor/payment-approvals'); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
              <span className="text-base">💵</span>
              <span>Payment Approvals</span>
              {pendingPayments > 0 && (
                <span className="ml-auto text-xs font-extrabold text-emerald-500">{pendingPayments}</span>
              )}
            </button>

            <button onClick={() => { handleOpenGradeModal(); setSidebarOpen(false); }}
              disabled={gradeLoading}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all text-left w-full disabled:opacity-60">
              <span className="text-base">{gradeLoading ? '⏳' : '⭐'}</span>
              <span>Grade Trades</span>
              {gradableTradesCount > 0 && (
                <span className="ml-auto text-xs font-extrabold text-amber-500">{gradableTradesCount}</span>
              )}
            </button>

            <button onClick={() => { setApplicationsOpen(true); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
              <span className="text-base">📋</span>
              <span>Job Applications</span>
              {applicationsCount > 0 && (
                <span className="ml-auto text-xs font-extrabold text-orange-500">{applicationsCount}</span>
              )}
            </button>
          </nav>

          {/* Logout */}
          <div className="px-3 pb-5 pt-2 border-t border-slate-100">
            <button onClick={() => { clearAuth(); navigate('/'); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all">
              🚪 <span>{t.logOut}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop nav (hidden on mobile) ───────────────────────────────── */}
      <nav className="hidden sm:block sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center">

          <div className="flex items-center gap-2 py-3 sm:py-4 pr-4 sm:pr-8 border-r border-slate-100 mr-2 sm:mr-4 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
              <span className="text-white font-bold text-xs sm:text-sm">T</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-sky-600 tracking-tight hidden sm:block">TradeLink</span>
          </div>

          <div className="flex items-center flex-1 overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map((item) => {
              const isActive = !item.modal && activeView === item.id;
              return (
                <button key={item.id} onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-150 flex-shrink-0 ${
                    isActive ? 'border-amber-400 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                  }`}>
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-slate-100 flex-shrink-0">

            {/* 💲 Payment approvals icon */}
            <button
              onClick={() => navigate('/dashboard/contractor/payment-approvals')}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition active:scale-95"
              title="Payment Approvals"
            >
              <span className="text-xl leading-none select-none">💵</span>
              {pendingPayments > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow border-2 border-white leading-none">
                  {pendingPayments > 99 ? '99+' : pendingPayments}
                </span>
              )}
            </button>

            {/* ⭐ Grade your trades icon */}
            <button
              onClick={() => {
                if (gradableTrades !== null) return; // modal already visible
                handleOpenGradeModal();
              }}
              disabled={gradeLoading}
              title="Grade your trades"
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 transition active:scale-95 disabled:opacity-60 disabled:cursor-wait"
            >
              {gradeLoading ? (
                <span className="block w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              ) : (
                <span className="text-xl leading-none select-none">⭐</span>
              )}
              {gradableTradesCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow border-2 border-white leading-none">
                  {gradableTradesCount > 99 ? '99+' : gradableTradesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setApplicationsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl hover:bg-amber-50 px-1.5 sm:px-2 py-1 transition group"
              title="Job Applications"
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-100 to-sky-100 flex items-center justify-center text-sm sm:text-base">🏗️</div>
                {applicationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow border-2 border-white leading-none animate-pulse">
                    {applicationsCount > 99 ? '99+' : applicationsCount}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-700 leading-none">{user?.companyName}</p>
                {applicationsCount > 0
                  ? <p className="text-xs font-extrabold text-amber-500 mt-0.5">{applicationsCount} app{applicationsCount !== 1 ? 's' : ''}</p>
                  : <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
                }
              </div>
            </button>
            <button onClick={() => { clearAuth(); navigate('/'); }}
              className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-3 py-2 rounded-xl transition">
              🚪<span className="hidden sm:inline"> {t.logOut}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10">

        {activeView === 'allSites' && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800">{t.allSites.title}</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{t.allSites.subtitle(sites.length)}</p>
              </div>
              <button onClick={() => setOpenModal('addSite')}
                className="flex-shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-sky-400 hover:from-amber-400 text-white text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl shadow shadow-amber-200 transition-all active:scale-[0.99]">
                ➕ <span className="hidden xs:inline sm:inline">{t.allSites.addBtn}</span><span className="sm:hidden">Add</span>
              </button>
            </div>

            {sitesLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">{t.allSites.empty.title}</h3>
                <p className="text-slate-400 text-sm mb-6">{t.allSites.empty.desc}</p>
                <button onClick={() => setOpenModal('addSite')}
                  className="bg-gradient-to-r from-amber-500 to-sky-400 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow shadow-amber-200 transition hover:from-amber-400">
                  ➕ {t.allSites.empty.btn}
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sites.map((site) => (
                    <SiteCard
                      key={site._id}
                      site={site}
                      t={t}
                      displayDist={displayDist}
                      selectedTrade={selection?.siteId === site._id ? selection.trade : null}
                      onSelectTrade={handleSelectTrade}
                      onFind={handleFind}
                      onManageTrades={setManageSite}
                      onUpdatePhoto={setPhotoSite}
                      onWorkPlan={(siteId) => navigate(`/dashboard/contractor/work-plan/${siteId}`)}
                      searchState={findingFor?.siteId === site._id ? { loading: true } : null}
                    />
                  ))}
                </div>

                <DistancePanel
                  unit={unit} setUnit={setUnit}
                  distance={distance} setDistance={setDistance}
                  maxRate={maxRate} setMaxRate={setMaxRate}
                  minRating={minRating} setMinRating={setMinRating}
                  t={t.findTrade}
                />

              </>
            )}
          </div>
        )}

      </main>

      {openModal === 'info'    && <ContractorInfoModal onClose={() => setOpenModal(null)} />}
      {openModal === 'addSite' && <AddSiteModal onClose={() => setOpenModal(null)} onCreated={handleSiteCreated} />}
      {manageSite && (
        <ManageTradesModal
          site={manageSite}
          onClose={() => setManageSite(null)}
          onUpdated={handleTradesUpdated}
        />
      )}
      {photoSite && (
        <UpdateSitePhotoModal
          site={photoSite}
          onClose={() => setPhotoSite(null)}
          onUpdated={handleTradesUpdated}
        />
      )}
      {applicationsOpen && (
        <ContractorApplicationsModal
          onClose={() => setApplicationsOpen(false)}
          onApproved={() => { refreshApplicationCount(); refreshSites(); }}
        />
      )}

      {depositData && (
        <DepositSummaryModal
          siteId={depositData.siteId}
          siteName={depositData.siteName}
          rows={depositData.rows}
          total={depositData.total}
          onClose={() => { console.log('[deposit-modal] closed (cancel)'); setDepositData(null); }}
          onSuccess={() => {
            console.log('[deposit-modal] onSuccess fired — clearing modal and refreshing sites');
            setDepositData(null);
            refreshSites().then(() => console.log('[deposit-modal] refreshSites done — trade card should now be green'));
          }}
        />
      )}

      {/* Trade Grading — pops up automatically when ungraded trades exist */}
      {gradableTrades && (
        <TradeGradesListModal
          trades={gradableTrades}
          onClose={() => {
            setGradableTrades(null);
            // Re-fetch so badge reflects any grades just submitted
            getGradableTrades()
              .then(t => setGradableTradesCount(t?.length ?? 0))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
