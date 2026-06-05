import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Navbar from '../components/Navbar';
import useUIStore from '../stores/uiStore';
import { getPublicTradePros } from '../api/public.js';

const content = {
  en: {
    badge:    '🔧 Our Professionals',
    title:    'Skilled Trade Professionals',
    subtitle: 'Tap any professional to register and start hiring.',
    loading:  'Loading professionals…',
    empty:    'No trade professionals available right now.',
    rate:     '/hr',
    noRate:   'Rate on request',
    cta:      'Register to hire →',
    popup: {
      title:   'No account yet',
      text:    'Create a free Contractor account to hire trade professionals and manage your projects.',
      confirm: 'Register now →',
      cancel:  'Maybe later',
    },
  },
  es: {
    badge:    '🔧 Nuestros Profesionales',
    title:    'Profesionales de Oficios',
    subtitle: 'Toca cualquier profesional para registrarte y comenzar a contratar.',
    loading:  'Cargando profesionales…',
    empty:    'No hay profesionales disponibles en este momento.',
    rate:     '/hr',
    noRate:   'Tarifa a consultar',
    cta:      'Regístrate para contratar →',
    popup: {
      title:   'Aún no tienes cuenta',
      text:    'Crea una cuenta gratuita de Contratista para contratar profesionales y gestionar tus proyectos.',
      confirm: 'Registrarme →',
      cancel:  'Quizás luego',
    },
  },
};

export default function TradesShowcase() {
  const navigate = useNavigate();
  const { lang } = useUIStore();
  const t = content[lang];

  const handleProClick = async () => {
    const result = await Swal.fire({
      icon: 'info',
      title: t.popup.title,
      text:  t.popup.text,
      confirmButtonText: t.popup.confirm,
      showCancelButton:  true,
      cancelButtonText:  t.popup.cancel,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor:  '#94a3b8',
      background: '#ffffff',
      customClass: {
        popup:         'rounded-3xl shadow-2xl',
        title:         'text-slate-800 font-extrabold',
        htmlContainer: 'text-slate-500',
        confirmButton: 'rounded-xl font-bold px-6',
        cancelButton:  'rounded-xl font-semibold px-6',
      },
      buttonsStyling: true,
    });
    if (result.isConfirmed) navigate('/register/contractor');
  };

  const [pros,    setPros]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicTradePros()
      .then(setPros)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden">
      <Navbar showLogin />

      <section className="max-w-5xl mx-auto px-6 py-14">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-sky-200">
            {t.badge}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-br from-sky-500 via-sky-400 to-amber-400 bg-clip-text text-transparent">
              {t.title}
            </span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">{t.subtitle}</p>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
          </div>
        ) : pros.length === 0 ? (
          <div className="text-center py-24 text-slate-400">{t.empty}</div>
        ) : (
          <div className="flex flex-col gap-3 max-w-2xl mx-auto">
            {pros.map((pro, i) => (
              <div
                key={pro._id}
                onClick={handleProClick}
                className="group bg-white/80 backdrop-blur-sm rounded-2xl border border-sky-100 shadow-sm hover:shadow-md hover:border-sky-300 transition-all duration-200 cursor-pointer flex items-center gap-4 px-4 py-3"
              >
                {/* Index */}
                <span className="flex-shrink-0 w-6 text-center text-xs font-bold text-slate-300">
                  {i + 1}
                </span>

                {/* Avatar */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-sky-100 bg-sky-50">
                  {pro.photo
                    ? <img src={pro.photo} alt={pro.fullName} className="w-full h-full object-cover object-top" />
                    : <div className="w-full h-full flex items-center justify-center text-xl">🔧</div>
                  }
                </div>

                {/* Name + trade + address */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm leading-tight group-hover:text-sky-600 transition-colors truncate">
                    {pro.fullName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                      {pro.professionality}
                    </span>
                    {pro.address && (
                      <span className="text-xs text-slate-400 truncate">📍 {pro.address}</span>
                    )}
                  </div>
                </div>

                {/* Hourly rate */}
                <div className="flex-shrink-0 text-right">
                  {pro.hourlyRate ? (
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-xs text-amber-400 font-medium">$</span>
                      <span className="text-lg font-extrabold text-amber-500">{pro.hourlyRate}</span>
                      <span className="text-xs text-slate-400 font-medium">{t.rate}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 italic">{t.noRate}</span>
                  )}
                </div>

                {/* Arrow */}
                <span className="flex-shrink-0 text-slate-300 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all text-base">›</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="text-center py-8 text-slate-400 text-sm border-t border-yellow-100">
        © 2026 TradeLink. All rights reserved.
      </footer>
    </div>
  );
}
