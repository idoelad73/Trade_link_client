import { useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/uiStore.js';
import AvailabilityMessagesModal from '../../components/trade/AvailabilityMessagesModal.jsx';

// Full-page view of the trade pro's Availability Messages (was a modal on the dashboard).
// The dashboard re-fetches the pro (getMe) on mount, so bookings approved here
// show up on the calendar when the user goes back.
export default function TradeMessagesPage() {
  const navigate = useNavigate();
  const lang     = useUIStore((s) => s.lang);
  const back     = () => navigate('/dashboard/trade');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
        <button onClick={back} className="flex items-center gap-2 text-sky-600 hover:text-sky-500 font-semibold text-sm transition">
          {lang === 'es' ? '← Volver al Panel' : '← Back to Dashboard'}
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-base font-bold text-sky-600 tracking-tight hidden sm:block">TradeLink</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <AvailabilityMessagesModal asPage onClose={back} />
      </main>
    </div>
  );
}
