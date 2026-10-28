import { useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/uiStore.js';
import ContractorApplicationsModal from '../../components/contractor/ContractorApplicationsModal.jsx';

// Full-page view of the contractor's Trade Applications (was a modal on the dashboard)
export default function ContractorApplicationsPage() {
  const navigate = useNavigate();
  const lang     = useUIStore((s) => s.lang);
  const back     = () => navigate('/dashboard/contractor');

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800">
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
        <button onClick={back} className="flex items-center gap-2 text-amber-600 hover:text-amber-500 font-semibold text-sm transition">
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
        <ContractorApplicationsModal asPage onClose={back} />
      </main>
    </div>
  );
}
