import { useState, useEffect } from 'react';
import { getMessages, approveMessage } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';

const content = {
  en: {
    badge:    '📬 Availability Messages',
    title:    'Availability Requests',
    empty:    'No availability requests yet.',
    loading:  'Loading messages…',
    from:     'From',
    date:     'Requested Date',
    status:   { pending: 'Pending', approved: 'Approved ✓' },
    approve:  'Approve',
    approving:'…',
    close:    'Close',
  },
  es: {
    badge:    '📬 Mensajes de Disponibilidad',
    title:    'Solicitudes de Disponibilidad',
    empty:    'No hay solicitudes de disponibilidad aún.',
    loading:  'Cargando mensajes…',
    from:     'De',
    date:     'Fecha Solicitada',
    status:   { pending: 'Pendiente', approved: 'Aprobado ✓' },
    approve:  'Aprobar',
    approving:'…',
    close:    'Cerrar',
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
      onApproved?.();
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
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-sky-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
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
        <div className="overflow-y-auto px-8 py-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-slate-400">{t.empty}</div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                  {/* Site photo + name bar */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-50">
                    {msg.site?.photo ? (
                      <img src={msg.site.photo} alt={msg.site.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center text-2xl flex-shrink-0">
                        {msg.site?.type === 'residential' ? '🏠' : '🏢'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 text-sm truncate">{msg.site?.name}</p>
                      <p className="text-xs text-slate-400 truncate">📍 {msg.site?.address}</p>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                      msg.status === 'approved'
                        ? 'bg-green-100 text-green-600 border border-green-200'
                        : 'bg-amber-100 text-amber-600 border border-amber-200'
                    }`}>
                      {t.status[msg.status]}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-3">

                    {/* Requested date */}
                    <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide mb-0.5">{t.date}</p>
                      <p className="text-xs font-bold text-sky-700">📅 {msg.requestedDate ? formatDate(msg.requestedDate) : '—'}</p>
                    </div>

                    {/* Contractor */}
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t.from}</p>
                      <p className="text-xs font-bold text-slate-700 truncate">🏗️ {msg.contractor?.companyName || '—'}</p>
                    </div>

                    {/* Trade chips needed */}
                    {msg.site?.tradesNeeded?.length > 0 && (
                      <div className="col-span-2">
                        <div className="flex flex-wrap gap-1.5">
                          {msg.site.tradesNeeded.map((tr) => (
                            <span
                              key={tr.name}
                              className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${
                                tr.assigned
                                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                                  : 'bg-sky-50 text-sky-600 border-sky-200'
                              }`}
                            >
                              {tr.assigned && '✓ '}{tr.name}
                              {tr.budgetType === 'amount' && tr.maxAmount && <span className="ml-1 text-emerald-600">${tr.maxAmount}</span>}
                              {tr.budgetType === 'hours' && tr.totalHours && <span className="ml-1 text-violet-600">{tr.totalHours}h</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.status === 'pending' && (
                    <div className="px-4 pb-4">
                      <button
                        onClick={() => handleApprove(msg)}
                        disabled={!!approving}
                        className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
                      >
                        {approving === msg._id ? t.approving : t.approve}
                      </button>
                    </div>
                  )}

                  <p className="px-4 pb-3 text-[10px] text-slate-300">
                    Received {new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-slate-100 flex-shrink-0">
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
