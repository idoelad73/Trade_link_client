import { useState, useEffect } from 'react';
import { getWorkPlan } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';

const content = {
  en: {
    title:          'Work Plan',
    badge:          '📋 Assigned Trades',
    empty:          'No trades assigned yet.',
    loading:        'Loading work plan…',
    col: {
      professionality: 'Trade',
      tradeName:       'Professional',
      date:            'Start Date',
      budget:          'Budget',
    },
    close: 'Close',
  },
  es: {
    title:          'Plan de Trabajo',
    badge:          '📋 Oficios Asignados',
    empty:          'No hay oficios asignados aún.',
    loading:        'Cargando plan de trabajo…',
    col: {
      professionality: 'Oficio',
      tradeName:       'Profesional',
      date:            'Fecha Inicio',
      budget:          'Presupuesto',
    },
    close: 'Cerrar',
  },
};

export default function WorkPlanModal({ siteId, onClose }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkPlan(siteId).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              {t.badge}
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {t.title}
              {data?.siteName && (
                <span className="ml-2 text-base font-semibold text-slate-400">— {data.siteName}</span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : !data?.rows?.length ? (
            <div className="text-center py-16 text-slate-400 text-sm">{t.empty}</div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-sky-50 border-b border-slate-100">
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">#</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.col.professionality}</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.col.tradeName}</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.col.date}</th>
                    <th className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-4 py-3">{t.col.budget}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-600 text-[11px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                          🔧 {row.professionality}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-700">👤 {row.tradeName}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {row.date && row.date !== '—' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                            📅 {row.date}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {row.budget && row.budget !== '—' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            💰 {row.budget}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
