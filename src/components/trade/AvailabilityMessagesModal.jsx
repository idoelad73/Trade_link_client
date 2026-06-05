import { useState, useEffect } from 'react';
import { getMessages, approveMessage } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';
import { toast } from '../../utils/toast.js';

const content = {
  en: {
    badge:       '📬 Availability Messages',
    title:       'Messages',
    empty:       'No messages yet.',
    loading:     'Loading messages…',
    from:        'From',
    date:        'Requested Date',
    approvedDate:'Start Date',
    status:      { pending: 'Pending', approved: 'Approved ✓' },
    approve:     'Approve',
    approving:   '…',
    close:       'Close',
    approvalBadge:   '🎉 Job Approved',
    approvalTitle:   'Your application was approved!',
    approvalBy:      'Approved by',
    appliedBadge:    '📋 Your Application',
    appliedTo:       'Applied to',
    appliedDate:     'Requested Start',
    approveToast:    (company) => `✅ Availability confirmed — message sent back to ${company}`,
    alreadyScheduled: 'Already scheduled for that day',
  },
  es: {
    badge:       '📬 Mensajes de Disponibilidad',
    title:       'Mensajes',
    empty:       'No hay mensajes aún.',
    loading:     'Cargando mensajes…',
    from:        'De',
    date:        'Fecha Solicitada',
    approvedDate:'Fecha de Inicio',
    status:      { pending: 'Pendiente', approved: 'Aprobado ✓' },
    approve:     'Aprobar',
    approving:   '…',
    close:       'Cerrar',
    approvalBadge:   '🎉 Trabajo Aprobado',
    approvalTitle:   '¡Tu solicitud fue aprobada!',
    approvalBy:      'Aprobado por',
    appliedBadge:    '📋 Tu Solicitud',
    appliedTo:       'Solicitado a',
    appliedDate:     'Inicio Solicitado',
    approveToast:    (company) => `✅ Disponibilidad confirmada — mensaje enviado a ${company}`,
    alreadyScheduled: 'Ya tienes trabajo ese día',
  },
};

function formatDate(dateKey) {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function AvailabilityMessagesModal({ onClose, onApproved }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [approving,  setApproving]  = useState(null); // message _id being approved

  // Dates already confirmed — used to disable other pending messages for the same date
  const approvedDates = new Set(
    messages
      .filter((m) => m.status === 'approved' && m.type !== 'approval' && m.senderType !== 'trade')
      .map((m) => m.requestedDate)
      .filter(Boolean)
  );

  useEffect(() => {
    getMessages()
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (msg) => {
    if (approving) return;
    setApproving(msg._id);
    try {
      await approveMessage(msg._id);
      setMessages((prev) =>
        prev.map((m) => m._id === msg._id ? { ...m, status: 'approved' } : m)
      );
      toast.success(t.approveToast(msg.contractor?.companyName || 'contractor'), { duration: 5000 });
      onApproved?.(msg.requestedDate);
    } catch (err) {
      console.error(err);
    } finally {
      setApproving(null);
    }
  };

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
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95dvh] sm:max-h-[90vh] flex flex-col mx-2 sm:mx-0">

        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-sky-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mb-2">
              {t.badge}
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-slate-400">{t.empty}</div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isApproval   = msg.type === 'approval';
                const isMyApply    = msg.senderType === 'trade';
                return (
                <div key={msg._id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow ${isApproval ? 'border-emerald-200' : isMyApply ? 'border-amber-200' : 'border-slate-100'}`}>

                  {/* Top accent bar */}
                  {isApproval && <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-400" />}
                  {isMyApply  && <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />}

                  {/* Site photo + name bar */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-50">
                    {msg.site?.photo ? (
                      <img src={msg.site.photo} alt={msg.site.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        isApproval ? 'bg-gradient-to-br from-emerald-50 to-teal-50'
                        : isMyApply ? 'bg-gradient-to-br from-amber-50 to-orange-50'
                        : 'bg-gradient-to-br from-amber-50 to-sky-50'}`}>
                        {msg.site?.type === 'residential' ? '🏠' : '🏢'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {isApproval && <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">{t.approvalBadge}</p>}
                      {isMyApply  && <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-0.5">{t.appliedBadge}</p>}
                      <p className="font-extrabold text-slate-800 text-sm truncate">{msg.site?.name}</p>
                      <p className="text-xs text-slate-400 truncate">📍 {msg.site?.address}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                      isApproval ? 'bg-green-100 text-green-600 border-green-200'
                      : msg.status === 'approved' ? 'bg-green-100 text-green-600 border-green-200'
                      : 'bg-amber-100 text-amber-600 border-amber-200'
                    }`}>
                      {isApproval ? '✅ Approved' : t.status[msg.status]}
                    </span>
                  </div>

                  {/* My application card body */}
                  {isMyApply ? (
                    <div className="px-4 py-3 space-y-2">
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-0.5">{t.appliedTo}</p>
                        <p className="text-xs font-bold text-amber-700 truncate">🏗️ {msg.contractor?.companyName || '—'}</p>
                      </div>
                      {msg.requestedDate && (
                        <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide mb-0.5">{t.appliedDate}</p>
                          <p className="text-xs font-bold text-sky-700">📅 {formatDate(msg.requestedDate)}</p>
                        </div>
                      )}
                    </div>
                  ) : isApproval ? (
                    <div className="px-4 py-3 space-y-2">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mb-0.5">{t.approvalBy}</p>
                        <p className="text-xs font-bold text-emerald-700 truncate">🏗️ {msg.contractor?.companyName || '—'}</p>
                      </div>
                      {msg.requestedDate && (
                        <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide mb-0.5">{t.approvedDate}</p>
                          <p className="text-xs font-bold text-sky-700">📅 {formatDate(msg.requestedDate)}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Availability request card body */
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide mb-0.5">{t.date}</p>
                        <p className="text-xs font-bold text-sky-700">📅 {msg.requestedDate ? formatDate(msg.requestedDate) : '—'}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t.from}</p>
                        <p className="text-xs font-bold text-slate-700 truncate">🏗️ {msg.contractor?.companyName || '—'}</p>
                      </div>
                      {msg.site?.tradesNeeded?.length > 0 && (
                        <div className="col-span-2">
                          <div className="flex flex-wrap gap-1.5">
                            {msg.site.tradesNeeded.map((tr) => (
                              <span key={tr.name} className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${tr.assigned ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-sky-50 text-sky-600 border-sky-200'}`}>
                                {tr.assigned && '✓ '}{tr.name}
                                {tr.budgetType === 'amount' && tr.maxAmount && <span className="ml-1 text-emerald-600">${tr.maxAmount}</span>}
                                {tr.budgetType === 'hours' && tr.totalHours && <span className="ml-1 text-violet-600">{tr.totalHours}h</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!isApproval && !isMyApply && msg.status === 'pending' && (() => {
                    const dateConflict = msg.requestedDate && approvedDates.has(msg.requestedDate);
                    return (
                      <div className="px-4 pb-4">
                        {dateConflict ? (
                          <div className="w-full py-2 rounded-xl text-xs font-bold text-center text-slate-400 bg-slate-100 border border-slate-200">
                            📅 {t.alreadyScheduled}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleApprove(msg)}
                            disabled={!!approving}
                            className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
                          >
                            {approving === msg._id ? t.approving : t.approve}
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  <p className="px-4 pb-3 text-[10px] text-slate-300">
                    {new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-slate-100 flex-shrink-0">
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
