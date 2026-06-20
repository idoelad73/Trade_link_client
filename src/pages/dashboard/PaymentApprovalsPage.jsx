import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import useUIStore from '../../stores/uiStore.js';
import { getPaymentApprovals, updatePaymentApproval } from '../../api/contractor.js';
import { createPaymentIntent } from '../../api/stripe.js';
import StripePaymentModal from '../../components/contractor/StripePaymentModal.jsx';
import { toast } from '../../utils/toast.js';

// ── i18n ──────────────────────────────────────────────────────────────────────
const content = {
  en: {
    back:       '← Back to Projects',
    title:      'Payment Approvals',
    subtitle:   (n) => `${n} work log${n !== 1 ? 's' : ''} submitted`,
    tabs:       { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
    col:        { trade: 'Trade Professional', profession: 'Trade', date: 'Date', hours: 'Actual Hours', sum: 'Order Total', status: 'Status', actions: 'Action' },
    status:     { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
    btn:        { approve: 'Approve', reject: 'Reject' },
    empty:      'No payment orders found.',
    loading:    'Loading…',
    error:      'Failed to load. Please try again.',
    hourSuffix: 'hr',
    noRate:     'No rate set',
    pending0:   'No pending approvals',
    // SweetAlert2 confirm modal
    confirmTitle:  (name, profession) => `Approve order for ${name}?`,
    confirmText:   (profession, sum) => `${profession} · Total: $${sum}`,
    confirmYes:    '✅ Yes, Approve & Pay',
    confirmNo:     'Cancel',
    piError:       'Could not start payment. Please try again.',
    paySuccess:    'Payment completed successfully! 🎉',
  },
  es: {
    back:       '← Volver a Proyectos',
    title:      'Aprobaciones de Pago',
    subtitle:   (n) => `${n} registro${n !== 1 ? 's' : ''} enviado${n !== 1 ? 's' : ''}`,
    tabs:       { all: 'Todos', pending: 'Pendientes', approved: 'Aprobados', rejected: 'Rechazados' },
    col:        { trade: 'Profesional', profession: 'Oficio', date: 'Fecha', hours: 'Horas Reales', sum: 'Total', status: 'Estado', actions: 'Acción' },
    status:     { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' },
    btn:        { approve: 'Aprobar', reject: 'Rechazar' },
    empty:      'No hay órdenes de pago.',
    loading:    'Cargando…',
    error:      'Error al cargar. Inténtalo de nuevo.',
    hourSuffix: 'hr',
    noRate:     'Sin tarifa',
    pending0:   'Sin aprobaciones pendientes',
    confirmTitle:  (name) => `¿Aprobar orden para ${name}?`,
    confirmText:   (profession, sum) => `${profession} · Total: $${sum}`,
    confirmYes:    '✅ Sí, Aprobar y Pagar',
    confirmNo:     'Cancelar',
    piError:       'No se pudo iniciar el pago. Inténtalo de nuevo.',
    paySuccess:    '¡Pago completado con éxito! 🎉',
  },
};

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, t }) {
  const cfg = {
    pending:  'bg-amber-100  text-amber-700  border-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    rejected: 'bg-red-100   text-red-700    border-red-300',
  };
  const icon = { pending: '🕐', approved: '✅', rejected: '❌' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg[status] ?? cfg.pending}`}>
      {icon[status]} {t.status[status] ?? status}
    </span>
  );
}

// ── Single order row ──────────────────────────────────────────────────────────
function OrderRow({ order, t, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onReject(order._id);
    } finally {
      setLoading(false);
    }
  };

  const pro    = order.trade_id;
  const site   = order.site_id;
  const canAct = order.status === 'pending';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 sm:px-6 py-4 transition hover:shadow-md
      flex flex-col gap-3
      sm:grid sm:items-center sm:gap-4"
      style={{ gridTemplateColumns: '1fr 100px 130px 170px auto' }}
    >

      {/* Trade professional info */}
      <div className="flex items-center gap-3 min-w-0">
        {pro?.photo
          ? <img src={pro.photo} alt={pro?.fullName} className="w-10 h-10 rounded-xl object-cover object-top border border-slate-100 flex-shrink-0" />
          : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-sky-100 flex items-center justify-center text-lg flex-shrink-0">🔧</div>
        }
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-800 truncate">{pro?.fullName ?? '—'}</p>
          <p className="text-xs text-slate-500 truncate">{pro?.professionality ?? '—'}</p>
          {site?.name && <p className="text-[11px] text-slate-400 truncate">🏗️ {site.name}</p>}
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{t.col.date}</span>
        <span className="text-xs font-semibold text-slate-700">{order.date}</span>
      </div>

      {/* Actual hours */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{t.col.hours}</span>
        <span className="text-sm font-extrabold text-violet-600">
          {order.actual_hours}
          <span className="text-xs font-normal text-slate-400 ml-0.5">{t.hourSuffix}</span>
        </span>
        {/* Show original submitted hours when min was enforced */}
        {order.min_hours > 0 && order.submitted_hours != null && order.submitted_hours < order.min_hours && (
          <span className="text-[10px] text-amber-500 font-semibold mt-0.5 leading-tight text-center">
            ⚠️ min {order.min_hours}h enforced
          </span>
        )}
      </div>

      {/* Order sum */}
      <div className="flex flex-col items-center text-center">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{t.col.sum}</span>
        {order.order_sum > 0 ? (
          <>
            <span className="text-sm font-extrabold text-emerald-600">${order.order_sum.toFixed(2)}</span>
            {order.hourly_rate > 0 && (
              <span className="text-[12px] text-slate-400 mt-0.5 text-center leading-tight">
                {(order.workers_no ?? 1) > 1
                  ? `${order.workers_no}w × ${order.actual_hours}h × $${order.hourly_rate}/hr`
                  : `${order.actual_hours}h × $${order.hourly_rate}/hr`}
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-slate-400">{t.noRate}</span>
        )}
      </div>

      {/* Status + action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={order.status} t={t} />

        {canAct ? (
          <>
            {/* Approve → SweetAlert2 → Stripe modal */}
            <button
              onClick={() => onApprove(order)}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-bold shadow shadow-emerald-200 transition-all active:scale-95"
            >
              ✅ {t.btn.approve}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-xs font-bold shadow shadow-red-200 transition-all active:scale-95"
            >
              {loading
                ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : '❌'}
              {t.btn.reject}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentApprovalsPage() {
  const navigate = useNavigate();
  const lang     = useUIStore((s) => s.lang);
  const t        = content[lang];

  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [tab,       setTab]       = useState('all');

  // ── Stripe modal state ────────────────────────────────────────────────────
  const [stripeModal, setStripeModal] = useState(null);
  // stripeModal = { clientSecret, amount, tradeName, orderId } | null

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPaymentApprovals();
      setOrders(data ?? []);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Reject (no SweetAlert2 — quick action) ────────────────────────────────
  const handleReject = async (orderId) => {
    await updatePaymentApproval(orderId, 'rejected');
    setOrders((prev) => prev.filter((o) => o._id !== orderId));
  };

  // ── Approve → SweetAlert2 confirm → createPaymentIntent → StripeModal ─────
  const handleApprove = async (order) => {
    const pro = order.trade_id;

    const workers   = order.workers_no ?? 1;
    const breakdownLine = order.hourly_rate > 0
      ? (workers > 1
          ? `${workers} workers × ${order.actual_hours}h × $${order.hourly_rate}/hr`
          : `${order.actual_hours}h × $${order.hourly_rate}/hr`)
      : `${order.actual_hours} hrs`;

    const { isConfirmed } = await Swal.fire({
      title:              t.confirmTitle(pro?.fullName ?? ''),
      html: `
        <p style="font-size:14px;color:#475569;margin-top:4px;">
          ${pro?.professionality ?? ''}
        </p>
        <p style="font-size:22px;font-weight:800;color:#10b981;margin-top:12px;">
          $${order.order_sum?.toFixed(2) ?? '0.00'}
        </p>
        <p style="font-size:11px;color:#64748b;margin-top:4px;font-weight:600;">
          ${breakdownLine}
        </p>
        <p style="font-size:11px;color:#94a3b8;margin-top:2px;">
          ${order.date}
        </p>
      `,
      icon:               'question',
      showCancelButton:   true,
      confirmButtonText:  t.confirmYes,
      cancelButtonText:   t.confirmNo,
      confirmButtonColor: '#10b981',
      cancelButtonColor:  '#94a3b8',
      reverseButtons:     true,
      customClass: {
        popup:   'rounded-3xl',
        title:   'text-base font-extrabold text-slate-800',
        actions: 'gap-2',
      },
    });

    if (!isConfirmed) return;

    // First: approve the order in our DB — this creates the WorkHoursOrder
    // and returns { deleted, _id (message), order: WorkHoursOrder }
    let approveResult;
    try {
      approveResult = await updatePaymentApproval(order._id, 'approved');
    } catch (err) {
      toast.error(t.piError);
      return;
    }

    // Remove from list optimistically (it's no longer pending)
    setOrders((prev) => prev.filter((o) => o._id !== order._id));

    // WorkHoursOrder._id is what createPaymentIntent queries
    const workHoursOrderId = approveResult?.order?._id;
    if (!workHoursOrderId) {
      toast.error(t.piError);
      return;
    }

    // Then: create Stripe PaymentIntent server-side
    let piData;
    try {
      piData = await createPaymentIntent(workHoursOrderId);
    } catch (err) {
      // Order is approved in DB — payment can be retried from history
      toast.error(t.piError);
      return;
    }

    // Open Stripe modal
    setStripeModal({
      clientSecret: piData.clientSecret,
      amount:       piData.amount,
      tradeName:    piData.tradeName,
      orderId:      workHoursOrderId,
    });
  };

  // ── Payment success callback ──────────────────────────────────────────────
  const handlePaySuccess = () => {
    toast.success(t.paySuccess, { duration: 5000 });
    setStripeModal(null);
  };

  // ── Filter tabs ───────────────────────────────────────────────────────────
  const filtered = tab === 'all' ? orders : orders.filter((o) => o.status === tab);

  const counts = {
    all:     orders.length,
    pending: orders.length,
  };

  const TAB_KEYS = ['all', 'pending'];
  const TAB_COLORS = {
    all:     'text-slate-600 border-slate-400',
    pending: 'text-amber-600 border-amber-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-emerald-50 font-sans text-slate-800">

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard/contractor')}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition flex-shrink-0"
          >
            {t.back}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-800 leading-none flex items-center gap-2">
              <span className="text-emerald-500 text-xl">💲</span>
              {t.title}
              {counts.pending > 0 && (
                <span className="ml-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm">
                  {counts.pending > 99 ? '99+' : counts.pending}
                </span>
              )}
            </h1>
            {!loading && <p className="text-[11px] text-slate-400 mt-0.5">{t.subtitle(orders.length)}</p>}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-0 flex items-center gap-1 overflow-x-auto scrollbar-none">
          {TAB_KEYS.map((key) => (
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
              {counts[key] > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  key === 'pending'  ? 'bg-amber-100   text-amber-600'   :
                  key === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                  key === 'rejected' ? 'bg-red-100     text-red-600'     :
                  'bg-slate-100 text-slate-500'
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
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
            <div className="text-5xl mb-4">💲</div>
            <p className="text-slate-500 text-sm font-medium">{tab === 'pending' ? t.pending0 : t.empty}</p>
          </div>
        )}

        {!loading && !error && filtered.map((order) => (
          <OrderRow
            key={order._id}
            order={order}
            t={t}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}

      </main>

      {/* Stripe payment modal — rendered outside the list so it doesn't re-mount */}
      {stripeModal && (
        <StripePaymentModal
          clientSecret={stripeModal.clientSecret}
          amount={stripeModal.amount}
          tradeName={stripeModal.tradeName}
          orderId={stripeModal.orderId}
          onClose={() => setStripeModal(null)}
          onSuccess={handlePaySuccess}
        />
      )}
    </div>
  );
}
