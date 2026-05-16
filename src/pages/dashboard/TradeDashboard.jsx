import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import { getMe } from '../../api/trade.js';
import TradeInfoModal from '../../components/trade/TradeInfoModal.jsx';
import TradeSchedule from '../../components/trade/TradeSchedule.jsx';

const NAV_ITEMS = [
  { id: 'info',     label: 'Trade Info',      icon: '👤', modal: true  },
  { id: 'schedule', label: 'Trade Schedule',  icon: '📅', modal: false },
];

export default function TradeDashboard() {
  const navigate    = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const [activeView,  setActiveView]  = useState('schedule');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [tradeData,   setTradeData]   = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  // Load trade data once (for schedule initialBusyDays)
  useEffect(() => {
    getMe()
      .then(setTradeData)
      .catch(console.error)
      .finally(() => setDataLoading(false));
  }, []);

  const handleNavClick = (item) => {
    if (item.modal) {
      setModalOpen(true);
    } else {
      setActiveView(item.id);
      setModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 font-sans text-slate-800">

      {/* ── Top navigation ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 flex items-center gap-0">

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
                      ? 'border-sky-400 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* User chip + logout */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700 leading-none">{user?.fullName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user?.type === 'trade' ? 'Trade Professional' : ''}</p>
            </div>
            {tradeData?.photo && (
              <img
                src={tradeData.photo}
                alt={user?.fullName}
                className="w-8 h-8 rounded-xl object-cover border-2 border-sky-100 hidden sm:block"
              />
            )}
            <button
              onClick={() => { clearAuth(); navigate('/'); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition"
            >
              🚪 Log Out
            </button>
          </div>

        </div>
      </nav>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-6 py-10">

        {activeView === 'schedule' && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-slate-800">Trade Schedule</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Mark the days you're busy — all other days show as available to contractors.
              </p>
            </div>

            {dataLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              </div>
            ) : (
              <TradeSchedule initialBusyDays={tradeData?.busyDays || []} />
            )}
          </div>
        )}

      </main>

      {/* ── Trade Info Modal ───────────────────────────────────────── */}
      {modalOpen && (
        <TradeInfoModal onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
