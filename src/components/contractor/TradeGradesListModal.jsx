/**
 * TradeGradesListModal
 * Shows all trade professionals with approved orders that haven't been graded yet.
 * Each row has a ⭐ grade icon that opens TradeGradeModal.
 */
import { useState } from 'react';
import { submitTradeGrade } from '../../api/contractor.js';
import TradeGradeModal from './TradeGradeModal.jsx';

export default function TradeGradesListModal({ trades: initialTrades, onClose }) {
  const [trades,   setTrades]   = useState(initialTrades);
  const [grading,  setGrading]  = useState(null);  // trade object being graded
  const [graded,   setGraded]   = useState({});     // { key: grade } submitted this session

  async function handleSubmit(trade_id, site_id, order_id, grade) {
    await submitTradeGrade(trade_id, site_id, order_id, grade);
    setGraded(prev => ({ ...prev, [order_id]: grade }));
    // Remove from the ungraded list
    setTrades(prev => prev.filter(t => String(t.order_id) !== String(order_id)));
    setGrading(null);
  }

  const STARS = { 1:'⭐', 2:'⭐⭐', 3:'⭐⭐⭐', 4:'⭐⭐⭐⭐', 5:'⭐⭐⭐⭐⭐' };

  // Format YYYY-MM-DD → "Jun 3, 2026"
  function fmtDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}>

        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

          {/* Accent bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-sky-400 to-indigo-400 flex-shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100 flex-shrink-0">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 mb-2">
                ⭐ Trade Reviews
              </div>
              <h2 className="text-xl font-extrabold text-slate-800">Rate Your Trade Pros</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {trades.length} professional{trades.length !== 1 ? 's' : ''} awaiting your review
              </p>
            </div>
            <button onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg flex-shrink-0">
              ×
            </button>
          </div>

          {/* Trade list */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
            {trades.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-bold text-slate-700">All caught up!</p>
                <p className="text-sm text-slate-400 mt-1">You've graded all your trade professionals.</p>
              </div>
            ) : trades.map(trade => {
              const key = String(trade.order_id);
              const submittedGrade = graded[key];
              return (
                <div key={key}
                  className="flex items-center gap-4 bg-slate-50 hover:bg-amber-50/50 rounded-2xl px-4 py-3.5 border border-slate-100 hover:border-amber-100 transition-colors group">

                  {/* Photo */}
                  {trade.photo
                    ? <img src={trade.photo} alt={trade.trade_name}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm flex-shrink-0" />
                    : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-xl flex-shrink-0">👤</div>
                  }

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{trade.trade_name}</p>
                    <p className="text-xs font-semibold text-sky-600">{trade.professionality}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">📍 {trade.site_name}</p>
                    {trade.order_date && (
                      <p className="text-[10px] text-slate-300 mt-0.5">🗓 {fmtDate(trade.order_date)}</p>
                    )}
                  </div>

                  {/* Grade button or submitted badge */}
                  {submittedGrade ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      {STARS[submittedGrade]}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setGrading(trade)}
                      title="Rate this trade professional"
                      className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 hover:bg-amber-400 text-amber-600 hover:text-white flex items-center justify-center text-lg transition-all duration-150 group-hover:scale-110 shadow-sm hover:shadow-amber-200 hover:shadow-md"
                    >
                      ⭐
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-7 py-4 border-t border-slate-100 flex-shrink-0 flex justify-between items-center">
            <p className="text-xs text-slate-400">Grades help improve the TradeLink community.</p>
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-sm transition">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Grade picker sub-modal */}
      {grading && (
        <TradeGradeModal
          trade={grading}
          onSubmit={handleSubmit}
          onClose={() => setGrading(null)}
        />
      )}
    </>
  );
}
