import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import useUIStore from '../stores/uiStore';

const content = {
  en: {
    title: "Choose Your Area",
    subtitle: "How would you like to use TradeLink?",
    contractorLabel: "Contractors Area",
    contractorDesc: "Post jobs and find skilled tradespeople for your projects.",
    tradeLabel: "Professional Trade Area",
    tradeDesc: "Find work and connect with clients who need your skills.",
    footerText: "© 2026 TradeLink. All rights reserved.",
  },
  es: {
    title: "Elige Tu Área",
    subtitle: "¿Cómo quieres usar TradeLink?",
    contractorLabel: "Área de Contratistas",
    contractorDesc: "Publica trabajos y encuentra profesionales para tus proyectos.",
    tradeLabel: "Área de Profesionales",
    tradeDesc: "Encuentra trabajo y conecta con clientes que necesitan tus habilidades.",
    footerText: "© 2026 TradeLink. Todos los derechos reservados.",
  },
};

export default function RegistrationArea() {
  const { lang } = useUIStore();
  const navigate = useNavigate();
  const t = content[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden">

      <Navbar showLogin />

      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-32 overflow-x-hidden">

        {/* Decorative blobs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-yellow-200/40 rounded-full blur-3xl -z-10" />

        {/* Background watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -z-10" aria-hidden="true">
          <span className="font-extrabold uppercase tracking-widest text-amber-400/10"
            style={{ fontSize: "clamp(3rem, 14vw, 11rem)", lineHeight: 1 }}>
            TRADELINK
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-none mb-4">
          <span className="bg-gradient-to-br from-sky-500 via-sky-400 to-amber-400 bg-clip-text text-transparent">
            {t.title}
          </span>
        </h1>

        <p className="text-lg text-slate-500 max-w-md mb-14 leading-relaxed">{t.subtitle}</p>

        {/* Area buttons */}
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl">

          {/* Contractors */}
          <div
            onClick={() => navigate('/trades')}
            className="flex-1 group bg-white/80 backdrop-blur-sm border-2 border-sky-200 hover:border-sky-400 rounded-3xl p-8 text-left shadow-md hover:shadow-xl transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-300 flex items-center justify-center text-2xl mb-5 shadow group-hover:scale-110 transition-transform">
              🏗️
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{t.contractorLabel}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{t.contractorDesc}</p>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/register/contractor'); }}
              className="mt-5 inline-flex items-center gap-2 text-sky-500 font-semibold text-sm hover:text-sky-600 transition-colors"
            >
              Get started <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </button>
          </div>

          {/* Professional Trade */}
          <div
            onClick={() => navigate('/projects')}
            className="flex-1 group bg-white/80 backdrop-blur-sm border-2 border-amber-200 hover:border-amber-400 rounded-3xl p-8 text-left shadow-md hover:shadow-xl transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center text-2xl mb-5 shadow group-hover:scale-110 transition-transform">
              🔧
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{t.tradeLabel}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{t.tradeDesc}</p>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/register/trade'); }}
              className="mt-5 inline-flex items-center gap-2 text-amber-500 font-semibold text-sm hover:text-amber-600 transition-colors"
            >
              Get started <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
            </button>
          </div>

        </div>
      </section>

      <footer className="text-center py-8 text-slate-400 text-sm border-t border-yellow-100">
        {t.footerText}
      </footer>
    </div>
  );
}
