import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { getSites, findTradesForSite, updateSite } from '../../api/contractor.js';
import ContractorInfoModal from '../../components/contractor/ContractorInfoModal.jsx';
import AddSiteModal from '../../components/contractor/AddSiteModal.jsx';
import ManageTradesModal from '../../components/contractor/ManageTradesModal.jsx';
import UpdateSitePhotoModal from '../../components/contractor/UpdateSitePhotoModal.jsx';
import TradeCalendarModal from '../../components/contractor/TradeCalendarModal.jsx';

const content = {
  en: {
    tabs: {
      info:     'Contractor Info',
      addSite:  'Add Project',
      allSites: 'All Projects',
      schedule: 'Projects Schedule',
    },
    role:   'Contractor',
    logOut: 'Log Out',
    allSites: {
      title:    'All Projects',
      subtitle: (n) => `${n} project${n !== 1 ? 's' : ''} registered`,
      addBtn:   'Add Project',
      empty:    { title: 'No projects yet', desc: 'Add your first construction project to get started.', btn: 'Add Your First Project' },
    },
    schedule: { title: 'Projects Schedule', desc: 'Schedule management coming soon.' },
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
      openCal:     'Open Trade Calendar',
      openChat:    'Open Chat',
      close:       'Close Results',
    },
  },
  es: {
    tabs: {
      info:     'Info del Contratista',
      addSite:  'Agregar Proyecto',
      allSites: 'Todos los Proyectos',
      schedule: 'Calendario de Proyectos',
    },
    role:   'Contratista',
    logOut: 'Cerrar Sesión',
    allSites: {
      title:    'Todos los Proyectos',
      subtitle: (n) => `${n} proyecto${n !== 1 ? 's' : ''} registrado${n !== 1 ? 's' : ''}`,
      addBtn:   'Agregar Proyecto',
      empty:    { title: 'Sin proyectos aún', desc: 'Agrega tu primer proyecto de construcción para comenzar.', btn: 'Agregar Primer Proyecto' },
    },
    schedule: { title: 'Calendario de Proyectos', desc: 'Gestión de calendario próximamente.' },
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
      openCal:     'Ver Calendario',
      openChat:    'Abrir Chat',
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
function ProCard({ pro, unit, t, siteName, onOpenCalendar }) {
  const busy = isBusyToday(pro.busyDays);
  const siteBooking = pro.bookings?.find((b) => b.siteName === siteName);

  const formatBookingDate = (dateKey) =>
    new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const borderClass = siteBooking
    ? 'border-sky-200 bg-sky-50/30'
    : busy
      ? 'border-red-100'
      : 'border-emerald-100';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 transition-all ${borderClass}`}>
      {/* Top row: avatar + info */}
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {pro.photo
            ? <img src={pro.photo} alt={pro.fullName} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
            : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-xl">🔧</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{pro.fullName}</p>
          <p className="text-xs text-slate-400 truncate">📍 {pro.address}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {siteBooking ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1 flex-wrap leading-snug">
                ✅ {t.scheduled} · {siteBooking.siteName} · {formatBookingDate(siteBooking.date)}
              </span>
            ) : (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${busy ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {busy ? t.busy : t.available}
              </span>
            )}
            <span className="text-xs text-slate-400">{formatDistance(pro.distance, unit)} {t.distance}</span>
          </div>
        </div>
      </div>

      {/* Action button row */}
      <div className="flex gap-2 pt-1 border-t border-slate-50">
        {siteBooking ? (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 px-3 py-2 rounded-xl opacity-90 cursor-not-allowed"
          >
            💬 {t.openChat}
          </button>
        ) : busy ? (
          <button
            onClick={() => onOpenCalendar(pro._id)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-xl transition active:scale-95"
          >
            📅 {t.openCal}
          </button>
        ) : (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl opacity-70 cursor-not-allowed"
          >
            💬 {t.openChat}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Site card with per-site trade picker ─────────────────────────────────────
function SiteCard({ site, t, displayDist, selectedTrade, onSelectTrade, onFind, onManageTrades, onUpdatePhoto, searchState }) {
  const statusLabel   = t.status[site.status] ?? site.status;
  const isSearching   = searchState?.loading;
  const hasNoTrades   = !site.tradesNeeded?.length;

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

        <p className="text-xs text-slate-500 mb-3 leading-relaxed">📍 {site.address}</p>

        {/* Per-site trade picker */}
        {!hasNoTrades && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              {t.findTrade.tradesLabel}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {site.tradesNeeded.map((tr) => {
                const isSelected  = selectedTrade === tr.name;
                const isAssigned  = tr.assigned;
                return (
                  <button
                    key={tr.name}
                    type="button"
                    disabled={isAssigned}
                    onClick={() => !isAssigned && onSelectTrade(site._id, isSelected ? null : tr.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition-all duration-150 active:scale-95 ${
                      isAssigned
                        ? 'bg-orange-400 border-orange-400 text-white shadow shadow-orange-100 cursor-not-allowed opacity-90'
                        : isSelected
                          ? 'bg-orange-500 border-orange-500 text-white shadow shadow-orange-200'
                          : 'bg-white border-amber-200 text-amber-700 hover:border-orange-300 hover:text-orange-600'
                    }`}
                  >
                    {isAssigned ? `✓ ${tr.name}` : tr.name}
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
              className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow shadow-orange-200 transition-all active:scale-95 whitespace-nowrap"
            >
              {isSearching ? (
                <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : '🔍'}
              {t.findTrade.findBtn}
              <span className="font-normal opacity-80">{t.findTrade.within} {displayDist}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared distance slider ───────────────────────────────────────────────────
function DistancePanel({ unit, setUnit, distance, setDistance, t }) {
  const kmValue     = Math.round(distance * 1.609);
  const displayDist = unit === 'mi' ? `${distance} mi` : `${kmValue} km`;

  return (
    <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-3xl border border-orange-100 shadow-md px-6 py-5">
      <div className="flex items-center justify-between mb-4">
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
        style={{
          background: `linear-gradient(to right, #f97316 0%, #f97316 ${((distance - 5) / 195) * 100}%, #fed7aa ${((distance - 5) / 195) * 100}%, #fed7aa 100%)`,
        }}
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
        <span>5 {unit}</span><span>200 {unit}</span>
      </div>
    </div>
  );
}

// ── Search results panel ─────────────────────────────────────────────────────
function SearchResults({ search, unit, t, onClose, onOpenCalendar }) {
  const tr = t.results;

  return (
    <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-3xl border border-orange-100 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-400">
        <div>
          <h3 className="text-white font-extrabold text-sm">{tr.title(search.trade, search.siteName)}</h3>
          {!search.loading && !search.error && !search.noLocation && (
            <p className="text-white/80 text-xs mt-0.5">{tr.found(search.results.length)}</p>
          )}
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition">
          ×
        </button>
      </div>

      <div className="px-6 py-5">
        {search.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
          </div>
        ) : search.noLocation ? (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">{tr.noLocation}</p>
        ) : search.error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{tr.error}</p>
        ) : search.results.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{tr.none}</p>
        ) : (
          <div className="space-y-3">
            {search.results.map((pro) => (
              <ProCard key={pro._id} pro={pro} unit={unit} t={tr}
                siteName={search.siteName}
                onOpenCalendar={(id) => onOpenCalendar(id, search.siteName, search.siteAddress)} />
            ))}
          </div>
        )}
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
    { id: 'schedule', label: t.tabs.schedule, icon: '📅', modal: false },
  ];

  const [activeView,   setActiveView]   = useState('allSites');
  const [openModal,    setOpenModal]    = useState(null);
  const [sites,        setSites]        = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [unit,         setUnit]         = useState('mi');
  const [distance,     setDistance]     = useState(25);
  const [search,       setSearch]       = useState(null);
  const [manageSite,   setManageSite]   = useState(null);
  const [photoSite,    setPhotoSite]    = useState(null);
  const [calendarPro, setCalendarPro] = useState(null); // { proId, siteName }
  // Single selection across all cards: { siteId, trade } | null
  const [selection, setSelection] = useState(null);

  const handleSelectTrade = (siteId, trade) => {
    setSelection(trade ? { siteId, trade } : null);
  };

  const kmValue     = Math.round(distance * 1.609);
  const displayDist = unit === 'mi' ? `${distance} mi` : `${kmValue} km`;

  useEffect(() => {
    if (activeView === 'allSites') {
      setSitesLoading(true);
      getSites()
        .then((loaded) => {
          // Normalize tradesNeeded — handle old string[] format from DB
          setSites(loaded.map((s) => ({
            ...s,
            tradesNeeded: (s.tradesNeeded || []).map((t) =>
              typeof t === 'string' ? { name: t, assigned: false } : t
            ),
          })));
        })
        .catch(console.error)
        .finally(() => setSitesLoading(false));
    }
  }, [activeView]);

  const handleNavClick = (item) => {
    if (item.modal) { setOpenModal(item.id); }
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
    setSearch({ siteName: site.name, siteAddress: site.address, trade, loading: true, results: [] });
    setTimeout(() => document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    try {
      const data = await findTradesForSite(site._id, trade, distance, unit);
      setSearch({ siteName: site.name, siteAddress: site.address, trade, loading: false, results: data.results });

      // If any result has a confirmed booking for this site, flip that trade's assigned → true
      const hasScheduled = data.results.some((pro) =>
        pro.bookings?.some((b) => b.siteName === site.name)
      );
      if (hasScheduled) {
        const alreadyMarked = site.tradesNeeded.find((t) => t.name === trade)?.assigned;
        if (!alreadyMarked) {
          const updatedTrades = site.tradesNeeded.map((t) =>
            t.name === trade ? { ...t, assigned: true } : t
          );
          // Optimistic local update
          setSites((prev) => prev.map((s) =>
            s._id === site._id ? { ...s, tradesNeeded: updatedTrades } : s
          ));
          // Persist to MongoDB
          updateSite(site._id, { tradesNeeded: updatedTrades }).catch(console.error);
        }
      }
    } catch (err) {
      const noLocation = err?.response?.status === 422;
      setSearch({ siteName: site.name, trade, loading: false, results: [], noLocation, error: !noLocation });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800">

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center">

          <div className="flex items-center gap-2 py-4 pr-8 border-r border-slate-100 mr-4 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-lg font-bold text-sky-600 tracking-tight">TradeLink</span>
          </div>

          <div className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = !item.modal && activeView === item.id;
              return (
                <button key={item.id} onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
                    isActive ? 'border-amber-400 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                  }`}>
                  <span>{item.icon}</span>{item.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-slate-100 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700 leading-none">{user?.companyName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
            </div>
            <button onClick={() => { clearAuth(); navigate('/'); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition">
              🚪 {t.logOut}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">

        {activeView === 'allSites' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800">{t.allSites.title}</h1>
                <p className="text-slate-500 text-sm mt-0.5">{t.allSites.subtitle(sites.length)}</p>
              </div>
              <button onClick={() => setOpenModal('addSite')}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-sky-400 hover:from-amber-400 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow shadow-amber-200 transition-all active:scale-[0.99]">
                ➕ {t.allSites.addBtn}
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
                      searchState={search?.loading ? search : null}
                    />
                  ))}
                </div>

                <DistancePanel
                  unit={unit} setUnit={setUnit}
                  distance={distance} setDistance={setDistance}
                  t={t.findTrade}
                />

                {search && (
                  <div id="search-results">
                    <SearchResults
                      search={search}
                      unit={unit}
                      t={t}
                      onClose={() => setSearch(null)}
                      onOpenCalendar={(proId, siteName, siteAddress) => setCalendarPro({ proId, siteName, siteAddress })}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeView === 'schedule' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">{t.schedule.title}</h3>
            <p className="text-slate-400 text-sm">{t.schedule.desc}</p>
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
      {calendarPro && (
        <TradeCalendarModal
          tradeId={calendarPro.proId}
          siteName={calendarPro.siteName}
          siteAddress={calendarPro.siteAddress}
          mySiteNames={sites.map((s) => s.name)}
          onClose={() => setCalendarPro(null)}
        />
      )}
    </div>
  );
}
