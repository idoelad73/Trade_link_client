import { useEffect, useRef, useState } from 'react';
import { confirmDeposit } from '../../api/contractor.js';

export default function StripePaymentModal({
  clientSecret,
  amount,
  tradeName,
  orderId,
  messageId = null,   // set for direct/quick-search deposits; null for site-based
  onClose,
  onSuccess,
  isDeposit = false,
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

    const returnUrl = isDeposit
      ? `${window.location.origin}/dashboard/contractor?deposit=${orderId}&status=held`
      : `${window.location.origin}/dashboard/contractor/payments?order=${orderId}&status=paid`;

    console.log(`[stripe-modal] confirmPayment — isDeposit=${isDeposit} orderId=${orderId} amount=${amount}`);

    const { error, paymentIntent } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    if (error) {
      console.error('[stripe-modal] confirmPayment error:', error.type, error.message);
      setErrorMsg(error.message ?? 'Payment failed. Please try again.');
      setSubmitting(false);
    } else {
      console.log('[stripe-modal] confirmPayment success — PI status:', paymentIntent?.status, 'id:', paymentIntent?.id);
      if (isDeposit && paymentIntent?.id) {
        try {
          console.log('[stripe-modal] calling confirmDeposit — orderId:', orderId, 'messageId:', messageId, 'piId:', paymentIntent.id);
          const result = await confirmDeposit(orderId, paymentIntent.id, messageId);
          console.log('[stripe-modal] ✅ confirmDeposit OK — messageId:', result.messageId);
        } catch (err) {
          console.error('[stripe-modal] ❌ confirmDeposit error:', err?.response?.data ?? err.message);
        }
      }
      console.log('[stripe-modal] calling onSuccess — dashboard should refresh and turn trade card green');
      onSuccess?.(paymentIntent);
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
              className={`w-full py-2.5 rounded-xl disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 ${
                isDeposit
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 shadow-violet-200'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-emerald-200'
              }`}
            >
              {submitting
                ? <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
                : isDeposit
                  ? `🔒 Authorize Hold $${amount?.toFixed(2)}`
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
