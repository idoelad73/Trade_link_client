/**
 * TradeGradeModal
 * Star-picker (1–5) for grading a single trade professional.
 * Props: trade { trade_id, trade_name, professionality, photo, site_id, site_name }
 *        onSubmit(trade_id, site_id, grade)  – async, called on confirm
 *        onClose()
 */
import { useState } from 'react';

const GRADE_LABELS = {
  1: { label: 'Poor',      emoji: '😞', color: '#ef4444' },
  2: { label: 'Fair',      emoji: '😐', color: '#f97316' },
  3: { label: 'Good',      emoji: '🙂', color: '#eab308' },
  4: { label: 'Very Good', emoji: '😊', color: '#22c55e' },
  5: { label: 'Excellent', emoji: '🌟', color: '#6366f1' },
};

export default function TradeGradeModal({ trade, onSubmit, onClose }) {
  const [hover,    setHover]    = useState(0);
  const [selected, setSelected] = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const active = hover || selected;
  const info   = GRADE_LABELS[active];

  async function handleSubmit() {
    if (!selected) return setError('Please select a rating before submitting.');
    setLoading(true); setError('');
    try {
      await onSubmit(trade.trade_id, trade.site_id, trade.order_id, selected);
      onClose();
    } catch {
      setError('Failed to submit grade. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1.5 w-full" style={{ background: info ? `linear-gradient(90deg, ${info.color}, #818cf8)` : 'linear-gradient(90deg,#e2e8f0,#e2e8f0)' }} />

        <div className="px-7 pt-6 pb-7">

          {/* Trade info */}
          <div className="flex items-center gap-4 mb-6">
            {trade.photo
              ? <img src={trade.photo} alt={trade.trade_name} className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-sm flex-shrink-0" />
              : <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-2xl flex-shrink-0">👤</div>
            }
            <div className="min-w-0">
              <p className="font-extrabold text-slate-800 text-base truncate">{trade.trade_name}</p>
              <p className="text-xs font-semibold text-sky-600 mt-0.5">{trade.professionality}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">📍 {trade.site_name}</p>
            </div>
          </div>

          {/* Heading */}
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">Rate this trade professional</p>

          {/* Stars */}
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setSelected(n)}
                className="transition-transform duration-100 hover:scale-125 focus:outline-none"
                style={{ fontSize: 36, lineHeight: 1 }}
                aria-label={`${n} star${n !== 1 ? 's' : ''}`}
              >
                <span style={{ filter: n <= active ? 'none' : 'grayscale(1) opacity(0.3)', transition: 'filter 0.15s' }}>
                  ⭐
                </span>
              </button>
            ))}
          </div>

          {/* Grade label */}
          <div className="text-center h-8 mb-5">
            {info ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: info.color + '18', color: info.color }}>
                {info.emoji} {info.label}
              </span>
            ) : (
              <span className="text-sm text-slate-400">Select a rating</span>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 text-center mb-4">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selected}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white shadow transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: selected ? `linear-gradient(135deg,${GRADE_LABELS[selected].color},#818cf8)` : '#94a3b8' }}
            >
              {loading ? 'Submitting…' : '✓ Submit Grade'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-sm transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
