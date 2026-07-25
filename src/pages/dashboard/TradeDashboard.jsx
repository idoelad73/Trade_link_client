import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import Swal from 'sweetalert2';
import { getMe, updateLocation, getPaymentApprovedCount, getApprovedOrderDates, getDepositedRequests, getGradableContractors, getPayoutBlocked } from '../../api/trade.js';
import { completeOnboarding, startOnboarding } from '../../api/tradeStripe.js';
import { toast } from '../../utils/toast.js';
import TradeInfoModal from '../../components/trade/TradeInfoModal.jsx';
import TradeSchedule from '../../components/trade/TradeSchedule.jsx';
import AvailabilityMessagesModal from '../../components/trade/AvailabilityMessagesModal.jsx';
import ContractorGradesListModal from '../../components/trade/ContractorGradesListModal.jsx';

const content = {
  en: {
    tabs: { info: 'Trade Info', schedule: 'Schedule', receipts: 'Receipts' },
    role:    'Trade Professional',
    logOut:  'Log Out',
    schedule: {
      title: 'Trade Schedule',
      desc:  "Mark the days you're busy — all other days show as available to contractors.",
    },
  },
  es: {
    tabs: { info: 'Info del Profesional', schedule: 'Calendario', receipts: 'Recibos' },
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
    { id: 'receipts', label: t.tabs.receipts, icon: '🧾', modal: false, route: '/dashboard/trade/receipts' },
  ];

  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [activeView,      setActiveView]      = useState('schedule');
  const [modalOpen,       setModalOpen]       = useState(false);
  const [messagesOpen,    setMessagesOpen]    = useState(false);
  const [tradeData,       setTradeData]       = useState(null);
  const [dataLoading,     setDataLoading]     = useState(true);
  const [approvedDates,       setApprovedDates]       = useState([]);
  const [paymentCount,        setPaymentCount]        = useState(0);
  // approvedOrders: [{ date, siteId }] — used to colour calendar light-blue + disable clock
  const [approvedOrders, setApprovedOrders] = useState([]);
  // depositedRequests: [{ contractorId, date }] — direct-search bookings with a held deposit
  const [depositedRequests, setDepositedRequests] = useState([]);
  const [gradeOpen,       setGradeOpen]       = useState(false);
  const [gradableContractors, setGradableContractors] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    getMe().then(setTradeData).catch(console.error).finally(() => setDataLoading(false));
    getPaymentApprovedCount().then(setPaymentCount).catch(() => {});
    getApprovedOrderDates().then(setApprovedOrders).catch(() => {});
    getDepositedRequests().then(setDepositedRequests).catch(() => {});
    getGradableContractors().then(list => {
      setGradableContractors(list);
      if (list.length > 0) setGradeOpen(true); // auto-open on login if there are ungraded contractors
    }).catch(() => {});

    // Re-fetch bookings when the trade pro returns to this tab
    // (contractor may have approved while the tab was in the background)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        getMe().then(setTradeData).catch(console.error);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ── Payout blocked on bank details → prompt the trade pro to fix it ───────
  // Their work was approved and the money is owed, but Stripe can't pay them.
  // Without this the failure is invisible on their side.
  useEffect(() => {
    getPayoutBlocked()
      .then(async (info) => {
        if (!info?.blocked) return;

        const jobList = (info.jobs ?? [])
          .slice(0, 4)
          .map(j => `<li style="margin:2px 0">${j.site} · ${j.date} — <b>$${Number(j.amount).toFixed(2)}</b></li>`)
          .join('');

        const { isConfirmed } = await Swal.fire({
          icon:  'warning',
          title: 'Please check your bank account',
          html: `
            <p style="font-size:14px;color:#475569;line-height:1.6;margin-bottom:10px">
              ${info.reason ?? 'We could not send your payout.'}
            </p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:10px 14px;text-align:left">
              <p style="font-size:12px;font-weight:700;color:#b91c1c;margin-bottom:4px">
                ${info.count} approved job${info.count !== 1 ? 's' : ''} awaiting payout — $${Number(info.totalOwed).toFixed(2)} total
              </p>
              <ul style="font-size:12px;color:#7f1d1d;padding-left:18px;margin:0">${jobList}</ul>
            </div>
            <p style="font-size:12px;color:#94a3b8;margin-top:10px">
              Your money is safe and still owed to you. It will be released once your bank details are verified.
            </p>`,
          showCancelButton:   true,
          confirmButtonText:  '🏦 Fix bank details',
          cancelButtonText:   'Later',
          confirmButtonColor: '#0ea5e9',
          cancelButtonColor:  '#94a3b8',
          customClass: { popup: 'rounded-3xl' },
        });

        if (isConfirmed) {
          try {
            const { url } = await startOnboarding();
            if (url) window.location.href = url;
            else toast.error('Could not open bank verification. Please try again.');
          } catch {
            toast.error('Could not open bank verification. Please try again.');
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Handle Stripe onboarding return ──────────────────────────────────────
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (!stripeParam) return;

    // Clean the URL immediately
    setSearchParams({});

    if (stripeParam === 'return') {
      // Stripe redirected back — check if KYC + bank verification completed
      completeOnboarding()
        .then(({ onboarded }) => {
          if (onboarded) {
            toast.success('🏦 Bank account verified! You\'re ready to receive payments.', { duration: 6000 });
          } else {
            toast.warning('⏳ Stripe is still verifying your account. You\'ll be notified when ready.', { duration: 6000 });
          }
        })
        .catch(() => {});
    }

    if (stripeParam === 'refresh') {
      // Onboarding link expired — generate a new one and redirect again
      startOnboarding()
        .then(({ url }) => { if (url) window.location.href = url; })
        .catch(() => {
          toast.error('Could not restart bank verification. Please try again later.');
        });
    }
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
    if (item.route) { navigate(item.route); }
    else if (item.modal) { setModalOpen(true); }
    else { setActiveView(item.id); setModalOpen(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 font-sans text-slate-800">

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="sm:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-base font-bold text-sky-600 tracking-tight">TradeLink</span>
        </div>
        <div className="flex items-center gap-2">
          {(paymentCount > 0 || (tradeData?.availabilityMessages > 0) || gradableContractors.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-sky-50 text-sky-700 active:bg-sky-100 transition"
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
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
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
            {tradeData?.photo
              ? <img src={tradeData.photo} alt={user?.fullName} className="w-10 h-10 rounded-xl object-cover object-top border-2 border-sky-100 flex-shrink-0" />
              : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-xl flex-shrink-0">🔧</div>
            }
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{user?.fullName}</p>
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
                    isActive ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="my-2 border-t border-slate-100" />

            <button onClick={() => { setMessagesOpen(true); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
              <span className="text-base">📩</span>
              <span>Availability Messages</span>
              {tradeData?.availabilityMessages > 0 && (
                <span className="ml-auto text-xs font-extrabold text-amber-500">{tradeData.availabilityMessages}</span>
              )}
            </button>

            <button onClick={() => { navigate('/dashboard/trade/payment-approved'); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
              <span className="text-base">💵</span>
              <span>Approved Payments</span>
              {paymentCount > 0 && (
                <span className="ml-auto text-xs font-extrabold text-emerald-500">{paymentCount}</span>
              )}
            </button>

            <button onClick={async () => {
                const fresh = await getGradableContractors().catch(() => []);
                setGradableContractors(fresh);
                if (fresh.length > 0) { setGradeOpen(true); setSidebarOpen(false); }
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all text-left w-full">
              <span className="text-base">⭐</span>
              <span>Rate Contractors</span>
              {gradableContractors.length > 0 && (
                <span className="ml-auto text-xs font-extrabold text-amber-500">{gradableContractors.length}</span>
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
      <nav className="hidden sm:block sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm">
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

            {/* 💵 Payment approved icon */}
            <button
              onClick={() => navigate('/dashboard/trade/payment-approved')}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition active:scale-95 flex-shrink-0"
              title="Approved Payments"
            >
              <span className="text-xl leading-none select-none">💵</span>
              {paymentCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow border-2 border-white leading-none">
                  {paymentCount > 99 ? '99+' : paymentCount}
                </span>
              )}
            </button>

            {/* ⭐ Rate contractors button */}
            <button
              onClick={async () => {
                try {
                  const fresh = await getGradableContractors();
                  setGradableContractors(fresh);
                  if (fresh.length > 0) setGradeOpen(true);
                } catch {}
              }}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 transition active:scale-95 flex-shrink-0"
              title="Rate Contractors"
            >
              <span className="text-xl leading-none select-none">⭐</span>
              {gradableContractors.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow border-2 border-white leading-none">
                  {gradableContractors.length > 99 ? '99+' : gradableContractors.length}
                </span>
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
                approvedOrders={approvedOrders}
                depositedRequests={depositedRequests}
                professionality={tradeData?.professionality ?? ''}
                hourlyRate={tradeData?.hourlyRate ?? null}
              />
            )}
          </div>
        )}
      </main>

      {modalOpen      && <TradeInfoModal onClose={() => setModalOpen(false)} />}
      {gradeOpen && (
        <ContractorGradesListModal
          contractors={gradableContractors}
          onClose={() => {
            setGradeOpen(false);
            // Re-fetch so badge reflects any grades just submitted
            getGradableContractors()
              .then(setGradableContractors)
              .catch(() => {});
          }}
        />
      )}
      {messagesOpen   && (
        <AvailabilityMessagesModal
          onClose={() => {
            setMessagesOpen(false);
            // Always re-fetch after closing messages — booking may have been
            // created by the contractor directly (approveAvailabilityRequest)
            getMe().then(setTradeData).catch(console.error);
          }}
          onApproved={(date) => {
            getMe().then(setTradeData).catch(console.error);
            if (date) setApprovedDates((prev) => [...prev, date]);
          }}
        />
      )}
    </div>
  );
}
