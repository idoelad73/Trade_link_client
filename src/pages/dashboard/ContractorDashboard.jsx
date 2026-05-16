import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import { getSites } from '../../api/contractor.js';
import ContractorInfoModal from '../../components/contractor/ContractorInfoModal.jsx';
import AddSiteModal from '../../components/contractor/AddSiteModal.jsx';

const NAV_ITEMS = [
  { id: 'info',     label: 'Contractor Info', icon: '👤', modal: true },
  { id: 'addSite',  label: 'Add Site',        icon: '➕', modal: true },
  { id: 'allSites', label: 'All Sites',       icon: '🏗️', modal: false },
  { id: 'schedule', label: 'Sites Schedule',  icon: '📅', modal: false },
];

function SiteCard({ site }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {site.photo && (
        <img src={site.photo} alt={site.name} className="w-full h-36 object-cover" />
      )}
      {!site.photo && (
        <div className="w-full h-36 bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center text-4xl">
          {site.type === 'residential' ? '🏠' : '🏢'}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-800 text-sm leading-tight">{site.name}</h3>
          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
            site.type === 'residential'
              ? 'bg-sky-50 text-sky-600 border-sky-200'
              : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            {site.type}
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">📍 {site.address}</p>
        {site.tradesNeeded?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {site.tradesNeeded.slice(0, 3).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-medium">
                {t}
              </span>
            ))}
            {site.tradesNeeded.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500">
                +{site.tradesNeeded.length - 3} more
              </span>
            )}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            site.status === 'active'
              ? 'bg-green-100 text-green-600'
              : site.status === 'completed'
                ? 'bg-blue-100 text-blue-600'
                : 'bg-yellow-100 text-yellow-600'
          }`}>
            {site.status?.replace('_', ' ')}
          </span>
          <span className="text-xs text-slate-400">
            {new Date(site.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ContractorDashboard() {
  const navigate  = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const [activeView, setActiveView] = useState('allSites');
  const [openModal, setOpenModal]   = useState(null); // 'info' | 'addSite' | null
  const [sites, setSites]           = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);

  useEffect(() => {
    if (activeView === 'allSites') {
      setSitesLoading(true);
      getSites()
        .then(setSites)
        .catch(console.error)
        .finally(() => setSitesLoading(false));
    }
  }, [activeView]);

  const handleNavClick = (item) => {
    if (item.id === 'logOut') {
      clearAuth();
      navigate('/');
      return;
    }
    if (item.modal) {
      setOpenModal(item.id);
    } else {
      setActiveView(item.id);
      setOpenModal(null);
    }
  };

  const handleSiteCreated = (site) => {
    setSites((prev) => [site, ...prev]);
    setActiveView('allSites');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800">

      {/* Top navigation bar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-0">

          {/* Logo */}
          <div className="flex items-center gap-2 py-4 pr-8 border-r border-slate-100 mr-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-lg font-bold text-sky-600 tracking-tight">TradeLink</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 flex-1">
            {NAV_ITEMS.map((item) => {
              const isActive = !item.modal && activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? 'border-amber-400 text-amber-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* User info + logout */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700 leading-none">{user?.companyName}</p>
              <p className="text-xs text-slate-400 mt-0.5">Contractor</p>
            </div>
            <button
              onClick={() => { clearAuth(); navigate('/'); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition"
            >
              🚪 Log Out
            </button>
          </div>

        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-10">

        {/* All Sites view */}
        {activeView === 'allSites' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800">All Sites</h1>
                <p className="text-slate-500 text-sm mt-0.5">{sites.length} site{sites.length !== 1 ? 's' : ''} registered</p>
              </div>
              <button
                onClick={() => setOpenModal('addSite')}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-sky-400 hover:from-amber-400 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl shadow shadow-amber-200 transition-all duration-200 active:scale-[0.99]"
              >
                ➕ Add Site
              </button>
            </div>

            {sitesLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-amber-300 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🏗️</div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">No sites yet</h3>
                <p className="text-slate-400 text-sm mb-6">Add your first construction site to get started.</p>
                <button
                  onClick={() => setOpenModal('addSite')}
                  className="bg-gradient-to-r from-amber-500 to-sky-400 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow shadow-amber-200 transition hover:from-amber-400"
                >
                  ➕ Add Your First Site
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {sites.map((site) => <SiteCard key={site._id} site={site} />)}
              </div>
            )}
          </div>
        )}

        {/* Schedule placeholder */}
        {activeView === 'schedule' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Sites Schedule</h3>
            <p className="text-slate-400 text-sm">Schedule management coming soon.</p>
          </div>
        )}

      </main>

      {/* Modals */}
      {openModal === 'info' && (
        <ContractorInfoModal onClose={() => setOpenModal(null)} />
      )}
      {openModal === 'addSite' && (
        <AddSiteModal
          onClose={() => setOpenModal(null)}
          onCreated={handleSiteCreated}
        />
      )}
    </div>
  );
}
