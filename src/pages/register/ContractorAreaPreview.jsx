import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import useUIStore from '../../stores/uiStore';
import { getPublicTradePros } from '../../api/public.js';
import GradeBadge from '../../components/shared/GradeBadge.jsx';
import useTradeRate from '../../hooks/useTradeRate.js';

const LIMIT = 5;

// Same layout and styling as ProCard on the contractor's trade search results
// (pages/dashboard/TradeSearchResultsPage.jsx) — keep the two in step.
function ProPreviewCard({ pro, t, onClick }) {
  const typicalRate = useTradeRate(pro.professionality);
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-4 py-4 transition-all cursor-pointer hover:shadow-md"
    >
      {/* Row 1: avatar + name + rating + trade */}
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
            ? <div className="mt-0.5 mb-0.5"><GradeBadge avg={pro.avgGrade} count={pro.gradeCount ?? 0} /></div>
            : <p className="text-[10px] text-slate-300 italic mt-0.5">{t.noReviews}</p>
          }
          <p className="text-xs text-slate-300 italic truncate">{t.addressHidden}</p>
        </div>
        <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-sky-50 text-sky-700 border border-sky-200">
          🔧 {pro.professionality}
        </span>
      </div>

      {/* Row 2: rate + typical rate + register button */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        {pro.hourlyRate ? (
          <span className="text-xs text-slate-500">
            💰 <span className="font-extrabold text-amber-500">${pro.hourlyRate}/hr</span>
          </span>
        ) : (
          <span className="text-xs text-slate-300 italic">{t.noRate}</span>
        )}
        {typicalRate && (
          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full whitespace-nowrap">
            📊 {t.typical} ${typicalRate.rateLow}–{typicalRate.rateHigh}/hr
          </span>
        )}
        <div className="ml-auto flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-4 py-2 rounded-xl transition active:scale-95"
          >
            📅 {t.hire}
          </button>
        </div>
      </div>
    </div>
  );
}

const content = {
  en: {
    badge:    '🏗️ Contractors Area',
    title:    'Hire Skilled Trade Pros',
    subtitle: 'Rated, licensed professionals ready for your next project. Pick one to get started.',
    sample:   'Pros on TradeLink',
    noReviews:'New on TradeLink',
    noRate:   'No rate',
    typical:  'Typical',
    addressHidden: 'Address visible after booking',
    empty:    'Our first pros are joining soon — register to be ready.',
    hire:     'Register to hire',
    skip:     'Register as a contractor',
    back:     '← Back',
    perks:    ['⭐ Verified ratings', '📄 License & insurance checked', '💳 Secure Stripe payments'],
    footer:   '© 2026 TradeLink. All rights reserved.',
  },
  es: {
    badge:    '🏗️ Área de Contratistas',
    title:    'Contrata Profesionales Calificados',
    subtitle: 'Profesionales calificados y con licencia listos para tu próximo proyecto. Elige uno para empezar.',
    sample:   'Profesionales en TradeLink',
    noReviews:'Nuevo en TradeLink',
    noRate:   'Sin tarifa',
    typical:  'Típica',
    addressHidden: 'Dirección visible tras reservar',
    empty:    'Nuestros primeros profesionales llegan pronto — regístrate para estar listo.',
    hire:     'Regístrate para contratar',
    skip:     'Registrarme como contratista',
    back:     '← Volver',
    perks:    ['⭐ Calificaciones verificadas', '📄 Licencia y seguro revisados', '💳 Pagos seguros con Stripe'],
    footer:   '© 2026 TradeLink. Todos los derechos reservados.',
  },
};

export default function ContractorAreaPreview() {
  const navigate = useNavigate();
  const { lang } = useUIStore();
  const t = content[lang];
  const register = () => navigate('/register/contractor');

  const [pros,    setPros]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicTradePros({ limit: LIMIT, featured: 1 })
      .then((list) => setPros(list.slice(0, LIMIT)))
      .catch(() => setPros([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden">
      <Navbar showLogin />

      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-yellow-200/40 rounded-full blur-3xl -z-10" />

        <button onClick={() => navigate('/register')} className="text-sm font-semibold text-sky-600 hover:text-sky-500 transition mb-6">
          {t.back}
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-sky-200">
            {t.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-3">
            <span className="bg-gradient-to-br from-sky-500 via-sky-400 to-amber-400 bg-clip-text text-transparent">{t.title}</span>
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto leading-relaxed">{t.subtitle}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {t.perks.map((p) => (
              <span key={p} className="text-xs font-semibold text-slate-600 bg-white/80 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">{p}</span>
            ))}
          </div>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">{t.sample}</p>

        {/* Cards — latest pros from the server */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : pros.length === 0 ? (
          <p className="text-center py-16 text-slate-400">{t.empty}</p>
        ) : (
        <div className="max-w-2xl mx-auto space-y-4">
          {pros.map((pro) => (
            <ProPreviewCard key={pro._id} pro={pro} t={t} onClick={register} />
          ))}
        </div>
        )}

        <div className="text-center mt-12">
          <button onClick={register}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 via-sky-400 to-amber-400 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg shadow-sky-200 hover:shadow-xl active:scale-95 transition">
            {t.skip} →
          </button>
        </div>
      </section>

      <footer className="text-center py-8 text-slate-400 text-sm border-t border-yellow-100">{t.footer}</footer>
    </div>
  );
}
