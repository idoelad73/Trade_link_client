import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import useUIStore from '../../stores/uiStore';
import { getPublicSites } from '../../api/public.js';

// 6 cards = two full rows of 3 (or three rows of 2) — a symmetric grid at every width.
// We fetch extra so projects with no open trade slot can be skipped without
// leaving the grid short.
const LIMIT = 6;
const FETCH = 18;

function fmtDate(dateKey) {
  if (!dateKey) return null;
  const [y, m, d] = dateKey.split('-');
  return `${m}/${d}/${y}`;
}

// Same layout and styling as SiteCard on the contractor dashboard
// (pages/dashboard/ContractorDashboard.jsx), read-only — keep the two in step.
// Budget/hours badges are left out: the public API deliberately exposes only
// the trade name, filled status, date and worker count.
function ProjectPreviewCard({ p, t, onClick }) {
  return (
    <div
      onClick={onClick}
      className="w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col border border-amber-100 cursor-pointer"
    >
      <img src={p.photo} alt={p.name} className="w-full h-36 object-cover" />

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-slate-800 text-sm leading-tight">{p.name}</h3>
          <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
            p.type === 'residential' ? 'bg-sky-50 text-sky-600 border-sky-200' : 'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            {t.types[p.type] ?? p.type}
          </span>
        </div>

        {p.openTrades.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{t.tradesLabel}</p>
            <div className="flex flex-wrap gap-2">
              {p.openTrades.map((tr, i) => {
                const dateLabel = fmtDate(tr.requiredDate);
                return (
                  <div key={`${tr.name}-${i}`} className="flex flex-col items-start gap-1 px-2.5 py-2 rounded-xl border-2 text-xs font-semibold bg-white border-amber-200 text-amber-700">
                    <span className="leading-none">{tr.name}</span>
                    <span className="flex items-center gap-1 flex-wrap">
                      {dateLabel ? (
                        <span className="font-bold px-1.5 py-0.5 rounded-md text-[10px] leading-none bg-sky-50 text-sky-600 border border-sky-200">📅 {dateLabel}</span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] leading-none text-slate-300 border border-dashed border-slate-200">📅 –</span>
                      )}
                      {tr.workers_no != null && (
                        <span className={`font-bold px-1.5 py-0.5 rounded-md text-[10px] leading-none ${
                          tr.workers_no <= 1 ? 'bg-amber-50 text-amber-600 border border-amber-300' : 'bg-blue-50 text-blue-600 border border-blue-200'
                        }`}>
                          👷 {tr.workers_no}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-600">{t.active}</span>
            {p.createdAt && <span className="text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow shadow-orange-200 transition-all active:scale-95"
          >
            {t.apply} →
          </button>
        </div>
      </div>
    </div>
  );
}

const content = {
  en: {
    badge:    '🔧 Professional Trade Area',
    title:    'Find Your Next Job',
    subtitle: 'Contractors near you are looking for skilled pros right now. Pick a project to get started.',
    sample:   'Open projects on TradeLink',
    empty:    'New projects are posted every week — register to be first in line.',
    types:    { residential: 'Residential', commercial: 'Commercial' },
    tradesLabel: 'Trades needed',
    active:   'active',
    apply:    'Register to apply',
    skip:     'Register as a trade professional',
    back:     '← Back',
    perks:    ['📍 Jobs within your radius', '📅 You set your schedule', '💸 Fast Stripe payouts'],
    footer:   '© 2026 TradeLink. All rights reserved.',
  },
  es: {
    badge:    '🔧 Área de Profesionales',
    title:    'Encuentra tu Próximo Trabajo',
    subtitle: 'Contratistas cerca de ti buscan profesionales ahora mismo. Elige un proyecto para empezar.',
    sample:   'Proyectos abiertos en TradeLink',
    empty:    'Se publican proyectos nuevos cada semana — regístrate para ser el primero.',
    types:    { residential: 'Residencial', commercial: 'Comercial' },
    tradesLabel: 'Oficios necesarios',
    active:   'activo',
    apply:    'Regístrate para aplicar',
    skip:     'Registrarme como profesional',
    back:     '← Volver',
    perks:    ['📍 Trabajos dentro de tu radio', '📅 Tú defines tu horario', '💸 Pagos rápidos con Stripe'],
    footer:   '© 2026 TradeLink. Todos los derechos reservados.',
  },
};

export default function TradeAreaPreview() {
  const navigate = useNavigate();
  const { lang } = useUIStore();
  const t = content[lang];
  const register = () => navigate('/register/trade');

  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getPublicSites({ limit: FETCH, active: 1, withPhoto: 1 })
      .then((sites) => setProjects(sites.map((s) => ({
        ...s,
        openTrades: (s.tradesNeeded || [])
          .map((tr) => (typeof tr === 'string' ? { name: tr, assigned: false } : tr))
          .filter((tr) => !tr.assigned),
      }))
        // A showcase card with no open trade looks empty — skip those
        .filter((s) => s.openTrades.length > 0)
        .slice(0, LIMIT)))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden">
      <Navbar showLogin />

      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-200/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl -z-10" />

        <button onClick={() => navigate('/register')} className="text-sm font-semibold text-amber-600 hover:text-amber-500 transition mb-6">
          {t.back}
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-amber-200">
            {t.badge}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-3">
            <span className="bg-gradient-to-br from-amber-500 via-amber-400 to-sky-400 bg-clip-text text-transparent">{t.title}</span>
          </h1>
          <p className="text-slate-500 max-w-xl mx-auto leading-relaxed">{t.subtitle}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {t.perks.map((p) => (
              <span key={p} className="text-xs font-semibold text-slate-600 bg-white/80 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">{p}</span>
            ))}
          </div>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 text-center">{t.sample}</p>

        {/* Cards — latest active projects from the server */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <p className="text-center py-16 text-slate-400">{t.empty}</p>
        ) : (
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6">
          {/* Centred flex-wrap: rows are equal height, and an incomplete last row
              (fewer than 6 projects) sits in the middle instead of hugging the left. */}
          {projects.map((p) => (
            <div key={p._id} className="flex w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]">
              <ProjectPreviewCard p={p} t={t} onClick={register} />
            </div>
          ))}
        </div>
        )}

        <div className="text-center mt-12">
          <button onClick={register}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400 text-white font-extrabold px-8 py-3.5 rounded-2xl shadow-lg shadow-amber-200 hover:shadow-xl active:scale-95 transition">
            {t.skip} →
          </button>
        </div>
      </section>

      <footer className="text-center py-8 text-slate-400 text-sm border-t border-yellow-100">{t.footer}</footer>
    </div>
  );
}
