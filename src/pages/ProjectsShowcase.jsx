import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Navbar from '../components/Navbar';
import useUIStore from '../stores/uiStore';
import { getPublicSites } from '../api/public.js';

const content = {
  en: {
    badge:    '🏗️ Open Projects',
    title:    'Projects Looking for Trade Professionals',
    subtitle: 'Tap any project to register and get connected.',
    loading:  'Loading projects…',
    empty:    'No projects available right now.',
    types:    { residential: 'Residential', commercial: 'Commercial' },
    trades:   'Trades needed',
    assigned: 'Assigned',
    cta:      'Register to apply →',
    popup: {
      title:   'No account yet',
      text:    'Create a free Trade Professional account to apply for projects and connect with contractors.',
      confirm: 'Register now →',
      cancel:  'Maybe later',
      login:   'Log in',
    },
  },
  es: {
    badge:    '🏗️ Proyectos Abiertos',
    title:    'Proyectos que Buscan Profesionales',
    subtitle: 'Toca cualquier proyecto para registrarte y conectarte.',
    loading:  'Cargando proyectos…',
    empty:    'No hay proyectos disponibles en este momento.',
    types:    { residential: 'Residencial', commercial: 'Comercial' },
    trades:   'Oficios necesarios',
    assigned: 'Asignado',
    cta:      'Regístrate para aplicar →',
    popup: {
      title:   'Aún no tienes cuenta',
      text:    'Crea una cuenta gratuita de Profesional para postularte a proyectos y conectarte con contratistas.',
      confirm: 'Registrarme →',
      cancel:  'Quizás luego',
      login:   'Iniciar sesión',
    },
  },
};

export default function ProjectsShowcase() {
  const navigate = useNavigate();
  const { lang } = useUIStore();
  const t = content[lang];

  const handleProjectClick = async () => {
    const result = await Swal.fire({
      icon: 'info',
      title: t.popup.title,
      text:  t.popup.text,
      confirmButtonText:  t.popup.confirm,
      showCancelButton:   true,
      cancelButtonText:   t.popup.cancel,
      showDenyButton:     true,
      denyButtonText:     `🔑 ${t.popup.login}`,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor:  '#94a3b8',
      denyButtonColor:    '#7c3aed',
      background: '#ffffff',
      customClass: {
        popup:         'rounded-3xl shadow-2xl',
        title:         'text-slate-800 font-extrabold',
        htmlContainer: 'text-slate-500',
        confirmButton: 'rounded-xl font-bold px-6',
        cancelButton:  'rounded-xl font-semibold px-6',
        denyButton:    'rounded-xl font-bold px-6',
      },
      buttonsStyling: true,
    });
    if (result.isConfirmed) navigate('/register/trade');
    if (result.isDenied)    useUIStore.getState().openModal('loginTrade');
  };

  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getPublicSites()
      .then((sites) => {
        setProjects(sites.map((s) => ({
          ...s,
          tradesNeeded: (s.tradesNeeded || []).map((tr) =>
            typeof tr === 'string' ? { name: tr, assigned: false } : tr
          ),
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800 overflow-x-hidden">
      <Navbar showLogin />

      <section className="max-w-5xl mx-auto px-6 py-14">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 border border-amber-200">
            {t.badge}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">
            <span className="bg-gradient-to-br from-sky-500 via-sky-400 to-amber-400 bg-clip-text text-transparent">
              {t.title}
            </span>
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">{t.subtitle}</p>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24 text-slate-400">{t.empty}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const unassigned = project.tradesNeeded.filter((tr) => !tr.assigned);
              const assigned   = project.tradesNeeded.filter((tr) =>  tr.assigned);
              return (
                <div
                  key={project._id}
                  onClick={handleProjectClick}
                  className="group bg-white/80 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
                >
                  {/* Photo */}
                  <div className="relative h-44 flex-shrink-0">
                    {project.photo ? (
                      <img src={project.photo} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center text-5xl">
                        {project.type === 'residential' ? '🏠' : '🏢'}
                      </div>
                    )}
                    {/* Type badge */}
                    <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-xl border shadow-sm ${
                      project.type === 'residential'
                        ? 'bg-sky-50 text-sky-600 border-sky-200'
                        : 'bg-amber-50 text-amber-600 border-amber-200'
                    }`}>
                      {t.types[project.type] ?? project.type}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="p-5 flex flex-col flex-1 gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base leading-tight mb-1 group-hover:text-sky-600 transition-colors">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">📍 {project.address}</p>
                    </div>

                    {/* Trades */}
                    {project.tradesNeeded.length > 0 && (
                      <div className="space-y-2">
                        {unassigned.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{t.trades}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {unassigned.map((tr) => (
                                <span key={tr.name} className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
                                  {tr.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {assigned.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {assigned.map((tr) => (
                              <span key={tr.name} className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 flex items-center gap-1">
                                ✓ {tr.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* CTA */}
                    <div className="mt-auto pt-3 border-t border-slate-50">
                      <span className="text-xs font-bold text-amber-500 group-hover:text-amber-600 transition-colors">
                        {t.cta}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer className="text-center py-8 text-slate-400 text-sm border-t border-yellow-100">
        © 2026 TradeLink. All rights reserved.
      </footer>
    </div>
  );
}
