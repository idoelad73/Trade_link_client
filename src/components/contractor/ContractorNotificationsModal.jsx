import { useState, useEffect } from 'react';
import { getNotifications, markNotificationsRead } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';

const content = {
  en: {
    title:    'Availability Confirmed',
    subtitle: (n) => `${n} trade pro${n !== 1 ? 's' : ''} confirmed availability`,
    empty:    'No new availability confirmations.',
    markRead: 'Mark all as read',
    on:       'on',
    for:      'for',
    close:    'Close',
  },
  es: {
    title:    'Disponibilidad Confirmada',
    subtitle: (n) => `${n} profesional${n !== 1 ? 'es' : ''} confirmó disponibilidad`,
    empty:    'Sin nuevas confirmaciones de disponibilidad.',
    markRead: 'Marcar todo como leído',
    on:       'el',
    for:      'para',
    close:    'Cerrar',
  },
};

function fmtDate(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${m}/${d}/${y}`;
}

export default function ContractorNotificationsModal({ onClose, onRead }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [marking,       setMarking]       = useState(false);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    getNotifications()
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async () => {
    setMarking(true);
    try {
      await markNotificationsRead();
      onRead?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-400 to-amber-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg">🔔</span>
              <h2 className="text-base font-extrabold text-slate-800">{t.title}</h2>
            </div>
            {!loading && (
              <p className="text-xs text-slate-400">{t.subtitle(notifications.length)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >×</button>
        </div>

        {/* Body */}
        <div className="flex flex-col overflow-y-auto max-h-80">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-10 px-6">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm text-slate-400">{t.empty}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50 px-2 py-2">
              {notifications.map((n) => (
                <li key={n._id} className="flex items-start gap-3 px-3 py-3 rounded-2xl hover:bg-orange-50/60 transition">
                  {/* Pro avatar */}
                  {n.tradePro?.photo ? (
                    <img
                      src={n.tradePro.photo}
                      alt={n.tradePro.fullName}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-100 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-lg flex-shrink-0 mt-0.5">
                      🔧
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {n.tradePro?.fullName ?? '—'}
                    </p>
                    <p className="text-xs text-orange-600 font-semibold">
                      {n.tradePro?.professionality ?? ''}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ✅ {t.for} <span className="font-semibold text-slate-700">{n.site?.name ?? '—'}</span>
                      {n.requestedDate && (
                        <> · <span className="text-sky-600 font-semibold">📅 {fmtDate(n.requestedDate)}</span></>
                      )}
                    </p>
                  </div>

                  {/* Orange dot */}
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-2">
          {notifications.length > 0 && (
            <button
              onClick={handleMarkRead}
              disabled={marking}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-2xl shadow shadow-orange-200 transition-all active:scale-[0.99]"
            >
              {marking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                </span>
              ) : t.markRead}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
