import { useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import useUIStore from './stores/uiStore';

const content = {
  en: {
    tagline: "Bridge the gap between ideas and results.",
    subtitle:
      "TradeLink helps you connect, collaborate, and deliver — all in one clean, powerful workspace.",
    cta: "Let's start work",
    videoLabel: "TradeLink commercial",
    footerText: "© 2026 TradeLink. All rights reserved.",
  },
  es: {
    tagline: "Conecta ideas con resultados.",
    subtitle:
      "TradeLink te ayuda a conectar, colaborar y entregar — todo en un espacio de trabajo limpio y poderoso.",
    cta: "Empecemos a trabajar",
    videoLabel: "Comercial de TradeLink",
    footerText: "© 2026 TradeLink. Todos los derechos reservados.",
  },
};

export default function PonsLanding() {
  const { lang } = useUIStore();
  const navigate = useNavigate();
  const t = content[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden relative">

      <Navbar showLogin />

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-16 pb-28 overflow-x-hidden">

        {/* Decorative blobs */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-yellow-200/40 rounded-full blur-3xl -z-10" />

        {/* Giant background letters */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none -z-10"
          aria-hidden="true"
        >
          <span
            className="font-extrabold uppercase tracking-widest text-amber-400/10"
            style={{ fontSize: "clamp(4rem, 18vw, 14rem)", lineHeight: 1 }}
          >
            TRADELINK
          </span>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-yellow-100 text-amber-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-yellow-200">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          New — Now available
        </div>

        {/* Big title */}
        <h1 className="text-7xl sm:text-8xl font-extrabold tracking-tight leading-none mb-4">
          <span className="bg-gradient-to-br from-sky-500 via-sky-400 to-amber-400 bg-clip-text text-transparent">
            TradeLink
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-xl sm:text-2xl font-semibold text-slate-700 max-w-xl mb-4 leading-snug">
          {t.tagline}
        </p>

        {/* Subtitle */}
        <p className="text-base text-slate-500 max-w-lg mb-10 leading-relaxed">
          {t.subtitle}
        </p>

        {/* CTA */}
        <button
          onClick={() => navigate('/register')}
          className="bg-gradient-to-r from-sky-500 to-amber-400 hover:from-sky-400 hover:to-amber-300 text-white font-semibold text-base px-8 py-4 rounded-2xl shadow-lg shadow-sky-200 hover:shadow-amber-200 transition-all duration-200 active:scale-95"
        >
          {t.cta} →
        </button>
      </section>

      {/* Commercial video */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="relative rounded-3xl p-1.5 bg-gradient-to-br from-sky-400 via-sky-300 to-amber-400 shadow-2xl shadow-sky-200/60">
          <video
            className="w-full aspect-video rounded-[1.25rem] bg-slate-900 object-cover"
            src="/videos/tradelink-commercial.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls
            preload="metadata"
            aria-label={t.videoLabel}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-slate-400 text-sm border-t border-yellow-100">
        {t.footerText}
      </footer>
    </div>
  );
}
