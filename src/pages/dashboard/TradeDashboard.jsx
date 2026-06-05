import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { getMe, updateLocation } from '../../api/trade.js';
import TradeInfoModal from '../../components/trade/TradeInfoModal.jsx';
import TradeSchedule from '../../components/trade/TradeSchedule.jsx';
import AvailabilityMessagesModal from '../../components/trade/AvailabilityMessagesModal.jsx';

const content = {
  en: {
    tabs: { info: 'Trade Info', schedule: 'Trade Schedule' },
    role:    'Trade Professional',
    logOut:  'Log Out',
    schedule: {
      title: 'Trade Schedule',
      desc:  "Mark the days you're busy — all other days show as available to contractors.",
    },
  },
  es: {
    tabs: { info: 'Info del Profesional', schedule: 'Calendario' },
    role:    'Profesional de Oficios',
    logOut:  'Cerrar Sesión',
    schedule: {
      title: 'Calendario de Disponibilidad',
      desc:  'Marca los días que estás ocupado — el resto aparecerán como disponibles para los contratistas.',
    },
  },
};

export default function TradeDashboard() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const lang = useUIStore((s) => s.lang);
  const t = content[lang];

  const NAV_ITEMS = [
    { id: 'info',     label: t.tabs.info,     icon: '👤', modal: true  },
    { id: 'schedule', label: t.tabs.schedule, icon: '📅', modal: false },
  ];

  const [activeView,    setActiveView]    = useState('schedule');
  const [modalOpen,     setModalOpen]     = useState(false);
  const [messagesOpen,  setMessagesOpen]  = useState(false);
  const [tradeData,     setTradeData]     = useState(null);
  const [dataLoading,   setDataLoading]   = useState(true);
  const [approvedDates, setApprovedDates] = useState([]);

  useEffect(() => {
    getMe().then(setTradeData).catch(console.error).finally(() => setDataLoading(false));
  }, []);

  // Live location updates — every 60 s, only when the trade pro has consented
  useEffect(() => {
    if (!tradeData?.locationConsent) return;
    if (!navigator.geolocation) return;

    const send = () => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => updateLocation(coords.latitude, coords.longitude).catch(() => {}),
        () => {}, // silently ignore denied / unavailable
        { enableHighAccuracy: false, timeout: 10000 }
      );
    };

    send(); // fire immediately on mount
    const id = setInterval(send, 60_000);
    return () => clearInterval(id);
  }, [tradeData?.locationConsent]);

  const handleNavClick = (item) => {
    if (item.modal) { setModalOpen(true); }
    else { setActiveView(item.id); setModalOpen(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 font-sans text-slate-800">

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 flex items-center gap-0">

          <div className="flex items-center gap-2 py-3 sm:py-4 pr-4 sm:pr-8 border-r border-slate-100 mr-2 sm:mr-4 flex-shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
              <span className="text-white font-bold text-xs sm:text-sm">T</span>
            </div>
            <span className="text-base sm:text-lg font-bold text-sky-600 tracking-tight hidden xs:block sm:block">TradeLink</span>
          </div>

          <div className="flex items-center flex-1 overflow-x-auto scrollbar-none">
            {NAV_ITEMS.map((item) => {
              const isActive = !item.modal && activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-150 flex-shrink-0 ${
                    isActive ? 'border-sky-400 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 pl-2 sm:pl-4 border-l border-slate-100 flex-shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-700 leading-none">{user?.fullName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{t.role}</p>
            </div>

            {/* Photo + availability messages badge */}
            <button
              onClick={() => setMessagesOpen(true)}
              className="flex items-center gap-1.5 rounded-xl hover:bg-amber-50 px-1.5 sm:px-2 py-1 transition group"
              title="Availability Messages"
            >
              <div className="relative">
                {tradeData?.photo
                  ? <img src={tradeData.photo} alt={user?.fullName} className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover object-top border-2 border-sky-100" />
                  : <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-sm sm:text-base">🔧</div>
                }
                {tradeData?.availabilityMessages > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow border-2 border-white leading-none">
                    {tradeData.availabilityMessages > 99 ? '99+' : tradeData.availabilityMessages}
                  </span>
                )}
              </div>
              {tradeData?.availabilityMessages > 0 && (
                <div className="hidden sm:flex flex-col leading-tight text-left">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Availability</span>
                  <span className="text-xs font-extrabold text-amber-500 group-hover:text-amber-600">{tradeData.availabilityMessages} msg{tradeData.availabilityMessages !== 1 ? 's' : ''}</span>
                </div>
              )}
            </button>

            <button
              onClick={() => { clearAuth(); navigate('/'); }}
              className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-2 sm:px-3 py-2 rounded-xl transition"
            >
              🚪<span className="hidden sm:inline"> {t.logOut}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {activeView === 'schedule' && (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-slate-800">{t.schedule.title}</h1>
              <p className="text-slate-500 text-sm mt-0.5">{t.schedule.desc}</p>
            </div>
            {dataLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              </div>
            ) : (
              <TradeSchedule
                initialBusyDays={tradeData?.busyDays || []}
                initialBookings={tradeData?.bookings || []}
                approvedDates={approvedDates}
              />
            )}
          </div>
        )}
      </main>

      {modalOpen      && <TradeInfoModal onClose={() => setModalOpen(false)} />}
      {messagesOpen   && (
        <AvailabilityMessagesModal
          onClose={() => setMessagesOpen(false)}
          onApproved={(date) => {
            getMe().then(setTradeData).catch(console.error);
            if (date) setApprovedDates((prev) => [...prev, date]);
          }}
        />
      )}
    </div>
  );
}
