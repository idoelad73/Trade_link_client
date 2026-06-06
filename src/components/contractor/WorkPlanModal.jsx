import { useState, useEffect } from 'react';
import { getWorkPlan, updateWorkPlanDate, deleteWorkPlanTrade } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';
import { toast } from '../../utils/toast.js';

const content = {
  en: {
    title:        'Work Plan',
    badge:        '📋 Assigned Trades',
    empty:        'No trades assigned yet.',
    loading:      'Loading…',
    close:        'Close',
    deleteConfirm: (name) => `Remove ${name} from work plan?`,
    updateOk:     'Schedule updated',
    deleteOk:     'Trade removed',
    save:         'Save',
    cancel:       'Cancel',
  },
  es: {
    title:        'Plan de Trabajo',
    badge:        '📋 Oficios Asignados',
    empty:        'No hay oficios asignados aún.',
    loading:      'Cargando…',
    close:        'Cerrar',
    deleteConfirm: (name) => `¿Eliminar ${name} del plan?`,
    updateOk:     'Fecha actualizada',
    deleteOk:     'Profesional eliminado',
    save:         'Guardar',
    cancel:       'Cancelar',
  },
};

export default function WorkPlanModal({ siteId, onClose }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [editIdx,   setEditIdx]   = useState(null);   // row index being edited
  const [editDate,  setEditDate]  = useState('');
  const [saving,    setSaving]    = useState(false);
  const [deletingIdx, setDeletingIdx] = useState(null);

  useEffect(() => {
    getWorkPlan(siteId).then(setData).catch(console.error).finally(() => setLoading(false));
  }, [siteId]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleEditOpen = (i, row) => {
    setEditIdx(i);
    setEditDate(row.date !== '—' ? row.date : '');
  };

  const handleEditSave = async (row) => {
    setSaving(true);
    try {
      await updateWorkPlanDate(siteId, row.professionality, editDate || null);
      setData((prev) => ({
        ...prev,
        rows: prev.rows.map((r, i) => i === editIdx ? { ...r, date: editDate || '—' } : r),
      }));
      setEditIdx(null);
      toast.success(t.updateOk);
    } catch { toast.error('Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (i, row) => {
    if (!window.confirm(t.deleteConfirm(row.tradeName))) return;
    setDeletingIdx(i);
    try {
      await deleteWorkPlanTrade(siteId, row.professionality);
      setData((prev) => ({ ...prev, rows: prev.rows.filter((_, ri) => ri !== i) }));
      toast.success(t.deleteOk);
    } catch { toast.error('Error'); }
    finally { setDeletingIdx(null); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">

        {/* Top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1.5">
              {t.badge}
            </div>
            <h2 className="text-base font-extrabold text-slate-800 leading-tight">
              {t.title}
              {data?.siteName && (
                <span className="ml-1.5 text-sm font-semibold text-slate-400">— {data.siteName}</span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-lg transition"
          >×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-3 sm:px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="w-7 h-7 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : !data?.rows?.length ? (
            <div className="text-center py-14 text-slate-400 text-sm">{t.empty}</div>
          ) : (
            <div className="space-y-2">
              {data.rows.map((row, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border px-3 py-2.5 transition-colors ${
                    editIdx === i ? 'border-sky-200 bg-sky-50/60' : 'border-slate-100 bg-white hover:bg-slate-50'
                  }`}
                >
                  {/* Single line: all data + action icons */}
                  <div className="flex items-center gap-1.5 min-w-0">

                    {/* Row number */}
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-600 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>

                    {/* Trade type */}
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 truncate max-w-[72px]">
                      🔧 {row.professionality}
                    </span>

                    {/* Pro name */}
                    <span className="flex-1 text-[11px] font-semibold text-slate-700 truncate min-w-0">
                      👤 {row.tradeName}
                    </span>

                    {/* Date */}
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                      row.date !== '—' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'text-slate-300 border-dashed border-slate-200'
                    }`}>
                      📅 {row.date !== '—' ? row.date.slice(5).split('-').reverse().join('/') : '—'}
                    </span>

                    {/* Budget */}
                    {row.budget !== '—' && (
                      <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        💰 {row.budget}
                      </span>
                    )}

                    {/* Update schedule icon */}
                    <button
                      onClick={() => editIdx === i ? setEditIdx(null) : handleEditOpen(i, row)}
                      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition ${
                        editIdx === i
                          ? 'bg-sky-100 text-sky-600'
                          : 'bg-slate-100 hover:bg-sky-100 text-slate-400 hover:text-sky-600'
                      }`}
                      title="Update schedule"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {/* Delete icon */}
                    <button
                      onClick={() => handleDelete(i, row)}
                      disabled={deletingIdx === i}
                      className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition disabled:opacity-40"
                      title="Remove trade"
                    >
                      {deletingIdx === i ? (
                        <span className="w-3 h-3 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Inline date editor — expands below the row when edit icon clicked */}
                  {editIdx === i && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-sky-100">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 text-xs border border-sky-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                      />
                      <button
                        onClick={() => handleEditSave(row)}
                        disabled={saving}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 transition"
                      >
                        {saving ? '…' : t.save}
                      </button>
                      <button
                        onClick={() => setEditIdx(null)}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
