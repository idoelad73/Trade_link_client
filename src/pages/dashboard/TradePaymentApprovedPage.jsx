import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/uiStore.js';
import { getPaymentApproved } from '../../api/trade.js';
import UpdateOrderModal from '../../components/trade/UpdateOrderModal.jsx';

// ── i18n ──────────────────────────────────────────────────────────────────────
const content = {
  en: {
    back:       '← Back to Schedule',
    title:      'Payment Notices',
    subtitle:   (a, r, p) => `${a} approved · ${r} rejected · ${p} pending`,
    tabs:       { all: 'All', approved: 'Approved', rejected: 'Rejected', pending: 'Pending' },
    col:        { contractor: 'Contractor', site: 'Site', date: 'Date', hours: 'Hours', total: 'Total Earned' },
    empty:      'No payment notices yet.',
    loading:    'Loading…',
    error:      'Failed to load. Please try again.',
    hourSuffix: 'hr',
    noRate:     'No rate set',
    approved:     'Approved',
    rejected:     'Rejected',
    pending:      'Pending',
    updateOrder:  'Update Order',
    totalHours:   'Total Hours',
    totalEarned:  'Total Earned',
  },
  es: {
    back:       '← Volver al Calendario',
    title:      'Avisos de Pago',
    subtitle:   (a, r, p) => `${a} aprobado${a !== 1 ? 's' : ''} · ${r} rechazado${r !== 1 ? 's' : ''} · ${p} pendiente${p !== 1 ? 's' : ''}`,
    tabs:       { all: 'Todos', approved: 'Aprobados', rejected: 'Rechazados', pending: 'Pendientes' },
    col:        { contractor: 'Contratista', site: 'Obra', date: 'Fecha', hours: 'Horas', total: 'Total Ganado' },
    empty:      'Aún no hay avisos de pago.',
    loading:    'Cargando…',
    error:      'Error al cargar. Inténtalo de nuevo.',
    hourSuffix: 'hr',
    noRate:     'Sin tarifa',
    approved:     'Aprobado',
    rejected:     'Rechazado',
    pending:      'Pendiente',
    updateOrder:  'Actualizar Orden',
    totalHours:   'Total Horas',
    totalEarned:  'Total Ganado',
  },
};

// ── Single row ────────────────────────────────────────────────────────────────
function OrderRow({ order, t, onUpdateOrder }) {
  const contractor = order.contractor_id;
  const site       = order.site_id;
  const isRejected = order._isRejected === true;
  const isPending  = order._isPending  === true;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition ${
      isRejected ? 'border-red-100' : isPending ? 'border-amber-100' : 'border-slate-100'
    }`}>

      {/* Contractor + site */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
          isRejected ? 'bg-gradient-to-br from-red-100 to-rose-100'
          : isPending ? 'bg-gradient-to-br from-amber-100 to-yellow-100'
          : 'bg-gradient-to-br from-emerald-100 to-sky-100'
        }`}>
          🏗️
        </div>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-800 truncate">
            {contractor?.companyName ?? '—'}
          </p>
          {site?.name && (
            <p className="text-xs text-slate-500 truncate">📍 {site.name}</p>
          )}
          {site?.address && (
            <p className="text-[11px] text-slate-400 truncate">{site.address}</p>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0 text-center">
        {/* Date */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{t.col.date}</span>
          <span className="text-xs font-semibold text-slate-700">{order.date}</span>
        </div>
        {/* Hours */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{t.col.hours}</span>
          <span className={`text-sm font-extrabold ${isRejected ? 'text-red-400 line-through' : 'text-violet-600'}`}>
            {order.actual_hours}
            <span className="text-xs font-normal text-slate-400 ml-0.5 no-underline">{t.hourSuffix}</span>
          </span>
        </div>
        {/* Total */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{t.col.total}</span>
          {order.order_sum > 0 ? (
            <span className={`text-sm font-extrabold ${isRejected ? 'text-red-400 line-through' : 'text-emerald-600'}`}>
              ${order.order_sum.toFixed(2)}
            </span>
          ) : (
            <span className="text-xs text-slate-400">{t.noRate}</span>
          )}
          {order.hourly_rate > 0 && (
            <span className="text-[10px] text-slate-400 mt-0.5">${order.hourly_rate}/hr</span>
          )}
        </div>
      </div>

      {/* Status badge + Update Order button */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isRejected ? (
          <>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-300">
              ❌ {t.rejected}
            </span>
            <button
              onClick={() => onUpdateOrder(order)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white text-xs font-bold shadow shadow-violet-200 transition-all active:scale-95"
            >
              🔄 {t.updateOrder}
            </button>
          </>
        ) : isPending ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-100 text-amber-700 border-amber-300">
            🕐 {t.pending}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-emerald-100 text-emerald-700 border-emerald-300">
            ✅ {t.approved}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TradePaymentApprovedPage() {
  const navigate = useNavigate();
  const lang     = useUIStore((s) => s.lang);
  const t        = content[lang];

  const [approved,       setApproved]       = useState([]);
  const [rejected,       setRejected]       = useState([]);
  const [pending,        setPending]        = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState('');
  const [tab,            setTab]            = useState('all');
  const [updateTarget,   setUpdateTarget]   = useState(null); // rejected order being resubmitted

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPaymentApproved();
      setApproved(data.orders   ?? []);
      setRejected(data.rejected ?? []);
      setPending(data.pending   ?? []);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Merge + sort newest first for the "All" tab
  const allRows = [...approved, ...rejected, ...pending].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const filtered =
    tab === 'approved' ? approved :
    tab === 'rejected' ? rejected :
    tab === 'pending'  ? pending  :
    allRows;

  // Summary (approved only)
  const totalHours  = approved.reduce((s, o) => s + (o.actual_hours ?? 0), 0);
  const totalEarned = approved.reduce((s, o) => s + (o.order_sum    ?? 0), 0);

  const TAB_COLORS = {
    all:      'text-slate-600   border-slate-400',
    approved: 'text-emerald-600 border-emerald-400',
    rejected: 'text-red-600     border-red-400',
    pending:  'text-amber-600   border-amber-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-emerald-50 font-sans text-slate-800">

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/trade')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition flex-shrink-0"
          >
            {t.back}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-800 leading-none flex items-center gap-2">
              <span className="text-xl">💵</span>
              {t.title}
              {allRows.length > 0 && (
                <span className="ml-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm">
                  {allRows.length > 99 ? '99+' : allRows.length}
                </span>
              )}
            </h1>
            {!loading && (
              <p className="text-[11px] text-slate-400 mt-0.5">{t.subtitle(approved.length, rejected.length, pending.length)}</p>
            )}
          </div>
        </div>

        {/* Totals strip — approved earnings summary */}
        {!loading && approved.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2 flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.totalHours}</span>
              <span className="text-sm font-extrabold text-violet-600">{totalHours.toFixed(2)}hr</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t.totalEarned}</span>
              <span className="text-sm font-extrabold text-emerald-600">${totalEarned.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-0 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {['all', 'pending', 'approved', 'rejected'].map((key) => {
            const count = key === 'all' ? allRows.length : key === 'approved' ? approved.length : key === 'rejected' ? rejected.length : pending.length;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all flex-shrink-0 capitalize ${
                  tab === key
                    ? `${TAB_COLORS[key]} bg-transparent`
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.tabs[key]}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    key === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                    key === 'rejected' ? 'bg-red-100    text-red-600'     :
                    key === 'pending'  ? 'bg-amber-100  text-amber-600'   :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-3">

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-600 font-medium text-center">
            {error}
            <button onClick={load} className="ml-3 text-red-500 underline hover:text-red-700 text-xs font-bold">Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">💵</div>
            <p className="text-slate-500 text-sm font-medium">{t.empty}</p>
          </div>
        )}

        {!loading && !error && filtered.map((order) => (
          <OrderRow
            key={order._id}
            order={order}
            t={t}
            onUpdateOrder={(o) => setUpdateTarget(o)}
          />
        ))}

      </main>

      {/* Update Order Modal — opens when trade clicks 🔄 on a rejected row */}
      {updateTarget && (
        <UpdateOrderModal
          siteId      ={updateTarget.site_id?._id ?? updateTarget.site_id}
          siteName    ={updateTarget.site_id?.name    ?? ''}
          siteAddress ={updateTarget.site_id?.address ?? ''}
          date        ={updateTarget.date}
          hourlyRate  ={updateTarget.hourly_rate}
          onClose     ={() => setUpdateTarget(null)}
          onSent      ={() => {
            // Remove the resubmitted rejected notice from local state;
            // the new pending order will appear on the contractor's approvals page.
            setRejected((prev) => prev.filter((o) => o._id !== updateTarget._id));
            setUpdateTarget(null);
          }}
        />
      )}
    </div>
  );
}
