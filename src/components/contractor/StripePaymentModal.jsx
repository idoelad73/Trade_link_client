import { useEffect, useRef, useState } from 'react';

export default function StripePaymentModal({
  clientSecret,
  amount,
  tradeName,
  orderId,
  onClose,
  onSuccess,
}) {
  const mountRef    = useRef(null);
  const stripeRef   = useRef(null);
  const elementsRef = useRef(null);

  const [ready,      setReady]      = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');

  useEffect(() => {
    if (!clientSecret) return;
    const stripe   = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
    stripeRef.current = stripe;

    const elements = stripe.elements({
      clientSecret,
      locale: 'en',
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary:  '#10b981',
          borderRadius:  '8px',
          fontFamily:    'ui-sans-serif, system-ui, sans-serif',
          fontSizeBase:  '13px',   // ↓ font drives ~25% height reduction
          spacingUnit:   '2px',    // tightest gap between fields
        },
      },
    });
    elementsRef.current = elements;

    const pe = elements.create('payment', {
      layout: 'tabs',   // shows Apple Pay / Google Pay buttons at the top
    });
    pe.on('ready', () => setReady(true));
    pe.mount(mountRef.current);
    return () => { try { pe.unmount(); } catch (_) {} };
  }, [clientSecret]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current || submitting) return;
    setSubmitting(true);
    setErrorMsg('');

    const { error } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/contractor/payments?order=${orderId}&status=paid`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMsg(error.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
    } else {
      onSuccess?.();
      onClose?.();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* Sheet slides up on mobile, centered modal on sm+ */}
      <div className="relative bg-white w-full sm:max-w-sm sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">

        {/* Header — compact */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white text-base">💳</span>
            <div className="min-w-0">
              <p className="text-white font-extrabold text-sm leading-none truncate">{tradeName}</p>
              <p className="text-emerald-100 text-xs mt-0.5 font-semibold">${amount?.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition flex-shrink-0"
            aria-label="Close"
          >✕</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">

          {/* Spinner while Stripe loads */}
          {!ready && (
            <div className="flex justify-center py-6">
              <div className="w-7 h-7 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {/* Stripe PaymentElement */}
          <div ref={mountRef} className={ready ? '' : 'hidden'} />

          {/* Error */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Pay button */}
          {ready && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {submitting
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
                : `Pay $${amount?.toFixed(2)}`}
            </button>
          )}

          <p className="text-center text-[10px] text-slate-400 pb-1">
            🔒 Secured by <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline">Stripe</a>
          </p>
        </form>
      </div>
    </div>
  );
}
