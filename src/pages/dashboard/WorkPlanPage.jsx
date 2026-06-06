import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWorkPlan, requestWorkPlanDate, deleteWorkPlanTrade, getChatHistory } from '../../api/contractor.js';
import Swal from 'sweetalert2';
import useUIStore from '../../stores/uiStore.js';
import useAuthStore from '../../stores/authStore.js';
import { toast } from '../../utils/toast.js';
import ChatPanel from '../../components/shared/ChatPanel.jsx';

const content = {
  en: {
    back:         '← Back to Projects',
    badge:        '📋 Work Plan',
    subtitle:     'Assigned trade professionals for this project',
    empty:        'No trades assigned yet.',
    loading:      'Loading work plan…',
    col: {
      num:    '#',
      trade:  'Trade',
      pro:    'Professional',
      date:   'Start Date',
      budget: 'Budget',
      chat:   'Chat',
      actions:'Actions',
    },
    updateTitle:  'Update Schedule',
    save:         'Save',
    cancel:       'Cancel',
    updateOk:     '✅ Schedule updated',
    deleteOk:     '✅ Trade removed from plan',
    deleteConfirm:(name) => `Remove ${name} from this work plan?`,
    chatTitle:    (name) => `Chat with ${name}`,
    chatComingSoon: 'Chat feature coming soon.',
  },
  es: {
    back:         '← Volver a Proyectos',
    badge:        '📋 Plan de Trabajo',
    subtitle:     'Profesionales asignados a este proyecto',
    empty:        'No hay oficios asignados aún.',
    loading:      'Cargando plan de trabajo…',
    col: {
      num:    '#',
      trade:  'Oficio',
      pro:    'Profesional',
      date:   'Fecha Inicio',
      budget: 'Presupuesto',
      chat:   'Chat',
      actions:'Acciones',
    },
    updateTitle:  'Actualizar Fecha',
    save:         'Guardar',
    cancel:       'Cancelar',
    updateOk:     '✅ Fecha actualizada',
    deleteOk:     '✅ Profesional eliminado del plan',
    deleteConfirm:(name) => `¿Eliminar a ${name} del plan?`,
    chatTitle:    (name) => `Chat con ${name}`,
    chatComingSoon: 'Chat próximamente.',
  },
};

export default function WorkPlanPage() {
  const { siteId }   = useParams();
  const navigate     = useNavigate();
  const lang         = useUIStore((s) => s.lang);
  const t            = content[lang];

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [editIdx,      setEditIdx]      = useState(null);
  const [editDate,     setEditDate]     = useState('');
  const [saving,       setSaving]       = useState(false);
  const [deletingIdx,  setDeletingIdx]  = useState(null);
  const [chatRow,      setChatRow]      = useState(null);   // index of open chat
  const [chatMessages, setChatMessages] = useState([]);
  const contractorId = useAuthStore((s) => s.user?._id ?? s.user?.id ?? '');

  useEffect(() => {
    getWorkPlan(siteId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [siteId]);

  const handleEditOpen = (i, row) => {
    setEditIdx(i);
    setEditDate(row.date !== '—' ? row.date : '');
  };

  const handleEditSave = async (row) => {
    if (!editDate) return;
    setSaving(true);
    try {
      await requestWorkPlanDate(siteId, row.professionality, editDate, lang);
      setEditIdx(null);
      Swal.fire({
        icon:             'success',
        title:            lang === 'es' ? '¡Solicitud enviada!' : 'Request Sent!',
        text:             lang === 'es'
          ? `Se envió una solicitud de confirmación a ${row.tradeName} para el ${editDate}`
          : `An availability request was sent to ${row.tradeName} for ${editDate}. The schedule will update once they confirm.`,
        confirmButtonColor: '#8b5cf6',
        confirmButtonText:  'OK',
        borderRadius:       '1.5rem',
      });
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.notAvailable) {
        Swal.fire({
          icon:             'warning',
          title:            lang === 'es' ? 'No disponible' : 'Not Available',
          text:             lang === 'es'
            ? `${err.response.data.tradeName} no está disponible en esa fecha`
            : `${err.response.data.tradeName} is not available on that date`,
          confirmButtonColor: '#f59e0b',
          confirmButtonText:  'OK',
          borderRadius:       '1.5rem',
        });
      } else {
        toast.error('Error sending request');
      }
    } finally { setSaving(false); }
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
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 font-sans text-slate-800">

      {/* Top nav bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/contractor')}
          className="flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-500 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t.back}
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
            {t.badge}
          </span>
          {data?.siteName && (
            <span className="text-sm font-extrabold text-slate-800">{data.siteName}</span>
          )}
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-800">
            {data?.siteName ?? '…'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t.subtitle}</p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : !data?.rows?.length ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-8 py-20 text-center text-slate-400">
            {t.empty}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Table header */}
            <div className="grid grid-cols-[32px_1fr_1fr_110px_80px_44px_44px_44px] gap-3 items-center px-5 py-3 bg-gradient-to-r from-slate-50 to-sky-50 border-b border-slate-100">
              {[t.col.num, t.col.trade, t.col.pro, t.col.date, t.col.budget, t.col.chat, t.col.actions, ''].map((col, i) => (
                <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{col}</span>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-50">
              {data.rows.map((row, i) => (
                <div key={i}>
                  {/* Main row */}
                  <div className={`grid grid-cols-[32px_1fr_1fr_110px_80px_44px_44px_44px] gap-3 items-center px-5 py-3.5 transition-colors hover:bg-slate-50/60 ${editIdx === i ? 'bg-sky-50/40' : ''}`}>

                    {/* # */}
                    <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>

                    {/* Trade */}
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 truncate">
                      🔧 {row.professionality}
                    </span>

                    {/* Professional */}
                    <span className="text-sm font-semibold text-slate-700 truncate">
                      {row.tradeName}
                    </span>

                    {/* Date */}
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      row.date !== '—'
                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                        : 'text-slate-300 border-dashed border-slate-200'
                    }`}>
                      📅 {row.date !== '—' ? row.date : '—'}
                    </span>

                    {/* Budget */}
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${
                      row.budget !== '—'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'text-slate-300 border-dashed border-slate-200'
                    }`}>
                      {row.budget !== '—' ? `💰 ${row.budget}` : '—'}
                    </span>

                    {/* Chat icon */}
                    <button
                      onClick={async () => {
                        if (chatRow === i) { setChatRow(null); setChatMessages([]); return; }
                        try {
                          const chat = await getChatHistory(String(contractorId), row.tradeProId, siteId);
                          setChatMessages(chat?.messages ?? []);
                        } catch { setChatMessages([]); }
                        setChatRow(i);
                      }}
                      title={t.chatTitle(row.tradeName)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                        chatRow === i
                          ? 'bg-violet-500 text-white shadow-sm shadow-violet-200'
                          : 'bg-slate-100 hover:bg-violet-100 text-slate-400 hover:text-violet-600'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>

                    {/* Update schedule icon */}
                    <button
                      onClick={() => editIdx === i ? setEditIdx(null) : handleEditOpen(i, row)}
                      title={t.updateTitle}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                        editIdx === i
                          ? 'bg-sky-500 text-white shadow-sm shadow-sky-200'
                          : 'bg-slate-100 hover:bg-sky-100 text-slate-400 hover:text-sky-600'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>

                    {/* Delete icon */}
                    <button
                      onClick={() => handleDelete(i, row)}
                      disabled={deletingIdx === i}
                      title="Remove trade"
                      className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition disabled:opacity-40"
                    >
                      {deletingIdx === i ? (
                        <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Inline date editor */}
                  {editIdx === i && (
                    <div className="px-5 pb-4 flex items-center gap-3 bg-sky-50/40 border-t border-sky-100">
                      <span className="text-xs font-semibold text-sky-600">{t.updateTitle}:</span>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="text-sm border border-sky-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                      />
                      <button
                        onClick={() => handleEditSave(row)}
                        disabled={saving}
                        className="text-xs font-bold px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 transition shadow-sm"
                      >
                        {saving ? '…' : t.save}
                      </button>
                      <button
                        onClick={() => setEditIdx(null)}
                        className="text-xs font-bold px-4 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition"
                      >
                        {t.cancel}
                      </button>
                    </div>
                  )}

                  {/* Inline chat panel */}
                  {chatRow === i && (
                    <div className="px-4 pb-4 border-t border-violet-100 bg-violet-50/30">
                      <ChatPanel
                        contractorId={String(contractorId)}
                        tradeProId={row.tradeProId}
                        siteId={siteId}
                        siteName={data?.siteName ?? ''}
                        userType="contractor"
                        initialMessages={chatMessages}
                        onClose={() => { setChatRow(null); setChatMessages([]); }}
                        className="mt-3"
                        style={{ height: '280px' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
