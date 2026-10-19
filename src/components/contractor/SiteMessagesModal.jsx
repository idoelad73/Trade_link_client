/**
 * SiteMessagesModal — every message tied to one project, in one place.
 *
 * Opened from the "Messages" button on a project card. Read-only on purpose:
 * approvals still happen in ContractorApplicationsModal, where the full
 * approve/reject flows (deposits, slot checks) live. This is the audit trail.
 */
import { useState, useEffect, useMemo } from 'react';
import { getSiteMessages } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';

const content = {
  en: {
    badge:    '📬 Messages Status',
    loading:  'Loading messages…',
    empty:    'No messages for this project yet.',
    close:    'Close',
    all:      'All',
    count:    (n) => `${n} message${n !== 1 ? 's' : ''}`,
    from:     'From',
    date:     'Requested date',
    workers:  'Workers',
    deposit:  'Deposit',
    hours:    'Hours',
    amount:   'Amount',
  },
  es: {
    badge:    '📬 Estado de Mensajes',
    loading:  'Cargando mensajes…',
    empty:    'Aún no hay mensajes para este proyecto.',
    close:    'Cerrar',
    all:      'Todos',
    count:    (n) => `${n} mensaje${n !== 1 ? 's' : ''}`,
    from:     'De',
    date:     'Fecha solicitada',
    workers:  'Trabajadores',
    deposit:  'Depósito',
    hours:    'Horas',
    amount:   'Monto',
  },
};

// Message.type → how it reads to a contractor.
const TYPE_META = {
  application:  { label: 'Job Application',   icon: '📝', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  availability: { label: 'Availability Ask',  icon: '📅', cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  approval:     { label: 'Approval Notice',   icon: '✅', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  reschedule:   { label: 'Reschedule',        icon: '🔄', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  worker_offer: { label: 'Worker Offer',      icon: '👷', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  payment:      { label: 'Payment',           icon: '💰', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

const STATUS_META = {
  pending:   { label: '⏳ Pending',   cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  approved:  { label: '✓ Approved',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  accepted:  { label: '✓ Accepted',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  rejected:  { label: '✕ Rejected',  cls: 'bg-red-100 text-red-600 border-red-200' },
  deposited: { label: '💳 Deposited', cls: 'bg-sky-100 text-sky-700 border-sky-200' },
};

const fmtWhen = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function SiteMessagesModal({ site, onClose }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang] ?? content.en;

  const [loading,  setLoading]  = useState(true);
  const [messages, setMessages] = useState([]);
  const [error,    setError]    = useState('');
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    let cancelled = false;
    getSiteMessages(site._id)
      .then((data) => { if (!cancelled) setMessages(data.messages ?? []); })
      .catch(() => { if (!cancelled) setError('Failed to load messages.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [site._id]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Only offer filters for types this project actually has.
  const types = useMemo(
    () => [...new Set(messages.map((m) => m.type))],
    [messages]
  );
  const visible = filter === 'all' ? messages : messages.filter((m) => m.type === filter);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

        <div className="h-1 w-full bg-gradient-to-r from-orange-400 via-amber-400 to-sky-400" />

        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-start justify-between gap-3 flex-shrink-0">
          <div className="min-w-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {t.badge}
            </span>
            <h3 className="text-sm font-extrabold text-slate-800 mt-1.5 truncate">🏗️ {site.name}</h3>
            {!loading && <p className="text-[11px] text-slate-400 mt-0.5">{t.count(messages.length)}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-base leading-none transition"
          >×</button>
        </div>

        {/* Type filter — only when there's more than one kind to filter by */}
        {!loading && types.length > 1 && (
          <div className="px-5 py-2.5 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
            <button
              onClick={() => setFilter('all')}
              className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                filter === 'all'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >{t.all} ({messages.length})</button>
            {types.map((ty) => {
              const meta = TYPE_META[ty] ?? { label: ty, icon: '•' };
              const n    = messages.filter((m) => m.type === ty).length;
              return (
                <button
                  key={ty}
                  onClick={() => setFilter(ty)}
                  className={`flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                    filter === ty
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >{meta.icon} {meta.label} ({n})</button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-xs text-slate-400">{t.loading}</p>
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-500 py-12">{error}</p>
          ) : visible.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm text-slate-400">{t.empty}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visible.map((m) => {
                const type   = TYPE_META[m.type]     ?? { label: m.type, icon: '•', cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                const status = STATUS_META[m.status] ?? { label: m.status, cls: 'bg-slate-100 text-slate-500 border-slate-200' };
                return (
                  <div key={m._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">

                    <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${type.cls}`}>
                        {type.icon} {type.label}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {m.tradePro?.photo
                        ? <img src={m.tradePro.photo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-slate-100" />
                        : <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm flex-shrink-0">👷</div>
                      }
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {m.tradePro?.fullName ?? '—'}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {m.tradeName ?? m.tradePro?.professionality ?? '—'}
                          {m.senderType ? ` · ${m.senderType === 'trade' ? 'from trade pro' : 'from you'}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{fmtWhen(m.createdAt)}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {m.requestedDate && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-600 border border-sky-200">
                          📅 {m.requestedDate}
                        </span>
                      )}
                      {m.workersOffered != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200">
                          👷 {m.workersOffered}
                        </span>
                      )}
                      {m.totalHours != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-600 border border-violet-200">
                          ⏱ {m.totalHours}h
                        </span>
                      )}
                      {m.min_deposit != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                          💳 ${m.min_deposit}
                        </span>
                      )}
                      {/* payment messages store their numbers as a JSON snapshot */}
                      {m.snapshot?.order_sum != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          💰 ${m.snapshot.order_sum}
                        </span>
                      )}
                      {m.snapshot?.actual_hours != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">
                          🕐 {m.snapshot.actual_hours}h logged
                        </span>
                      )}
                    </div>

                    {m.text && (
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed break-words">{m.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-xs transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
