import { useState } from 'react';
import { createDepositIntent } from '../../api/stripe.js';
import StripePaymentModal from './StripePaymentModal.jsx';

// messageId is set for direct/quick-search deposits (no siteId); siteId for regular flow.
export default function DepositSummaryModal({ siteId, messageId, siteName, rows, total, onClose, onSuccess }) {
  const [loading,      setLoading]      = useState(false);
  const [stripeData,   setStripeData]   = useState(null); // { clientSecret, amount }
  const [errorMsg,     setErrorMsg]     = useState('');

  const handleAuthorize = async () => {
    if (loading || total <= 0) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await createDepositIntent(siteId, total, messageId || null);
      setStripeData(data);
    } catch (err) {
      setErrorMsg(err?.response?.data?.message ?? 'Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  if (stripeData) {
    return (
      <StripePaymentModal
        clientSecret={stripeData.clientSecret}
        amount={stripeData.amount}
        tradeName={siteName}
        orderId={messageId || siteId}
        messageId={messageId || null}
        onClose={onClose}
        onSuccess={onSuccess}
        isDeposit
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="relative bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[95dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-indigo-500 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-white font-extrabold text-base leading-tight truncate">🔒 Security Deposit</p>
            <p className="text-violet-200 text-xs mt-0.5 truncate">{siteName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition flex-shrink-0 ml-3"
          >✕</button>
        </div>

        {/* Info banner */}
        <div className="bg-violet-50 border-b border-violet-100 px-5 py-3 flex-shrink-0">
          <p className="text-xs text-violet-700 font-medium leading-relaxed">
            All trade slots are now filled. A <strong>refundable deposit</strong> is required to secure your booking.
            Your card will be <strong>authorized but not charged</strong> — funds are held and can be released at any time.
          </p>
        </div>

        {/* Trade rows */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.messageId}
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3"
              >
                {/* Trade name + professionality */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-800 truncate">{row.tradeProName}</p>
                    <p className="text-xs text-slate-400 truncate">🔧 {row.professionality}</p>
                  </div>
                  <span className="text-sm font-extrabold text-violet-600 flex-shrink-0">
                    {row.min_deposit != null ? `$${row.min_deposit.toFixed(2)}` : '—'}
                  </span>
                </div>

                {/* Calculation breakdown */}
                {row.workers != null && row.hourlyRate != null && row.totalHours != null ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
                      👷 {row.workers} worker{row.workers !== 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-slate-300">×</span>
                    <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5">
                      ${row.hourlyRate}/hr
                    </span>
                    <span className="text-[10px] text-slate-300">×</span>
                    <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 border border-sky-100 rounded-lg px-2 py-0.5">
                      {row.totalHours}h
                    </span>
                    <span className="text-[10px] text-slate-300">=</span>
                    <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5">
                      ${(row.workers * row.hourlyRate * row.totalHours).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 italic">Rate or hours not available</p>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-200 rounded-xl px-5 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-violet-500 uppercase tracking-wide">Total Deposit</p>
              <p className="text-[10px] text-violet-400 mt-0.5">Hold on card · Refundable</p>
            </div>
            <p className="text-2xl font-extrabold text-violet-700">${total.toFixed(2)}</p>
          </div>

          {errorMsg && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-xs text-red-600 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex-shrink-0 space-y-2">
          <button
            onClick={handleAuthorize}
            disabled={loading || total <= 0}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-violet-500 hover:to-indigo-400 disabled:opacity-50 text-white font-extrabold text-sm shadow-md shadow-violet-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Processing…</>
              : `🔒 Authorize Deposit $${total.toFixed(2)}`}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            Cancel
          </button>
          <p className="text-center text-[10px] text-slate-400">
            🔒 Secured by <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline">Stripe</a>
            · Card held, not charged
          </p>
        </div>
      </div>
    </div>
  );
}
