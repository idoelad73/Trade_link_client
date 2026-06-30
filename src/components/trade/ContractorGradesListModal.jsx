import { useState } from 'react';
import { submitContractorGrade } from '../../api/trade.js';
import ContractorGradeModal from './ContractorGradeModal.jsx';

const STARS = { 1:'⭐', 2:'⭐⭐', 3:'⭐⭐⭐', 4:'⭐⭐⭐⭐', 5:'⭐⭐⭐⭐⭐' };

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ContractorGradesListModal({ contractors: initialContractors, onClose }) {
  const [contractors, setContractors] = useState(initialContractors);
  const [grading,     setGrading]     = useState(null);
  const [graded,      setGraded]      = useState({});

  async function handleSubmit(contractor_id, site_id, order_id, grade, review_text, photos) {
    await submitContractorGrade(contractor_id, site_id, order_id, grade, review_text, photos);
    setGraded(prev => ({ ...prev, [order_id]: grade }));
    setContractors(prev => prev.filter(c => String(c.order_id) !== String(order_id)));
    setGrading(null);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-extrabold text-slate-800 text-base">⭐ Rate Contractors</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {contractors.length > 0
                ? `${contractors.length} contractor${contractors.length !== 1 ? 's' : ''} to rate`
                : 'All contractors rated — thank you!'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm transition">✕</button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {contractors.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-2">🎉</p>
              <p className="font-semibold text-slate-700">All done!</p>
              <p className="text-sm text-slate-400 mt-1">You've rated all your contractors.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {contractors.map(c => {
                const submittedGrade = graded[c.order_id];
                return (
                  <div key={c.order_id} className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center text-xl flex-shrink-0">🏢</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{c.contractor_name}</p>
                      {c.site_name && <p className="text-[11px] text-slate-400 truncate">📍 {c.site_name}</p>}
                      <p className="text-[11px] text-slate-400">{formatDate(c.date)}</p>
                    </div>
                    {submittedGrade ? (
                      <span className="text-sm">{STARS[submittedGrade]}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setGrading(c)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold border border-indigo-100 transition active:scale-95"
                      >
                        ⭐ Rate
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {grading && (
        <ContractorGradeModal
          contractor={grading}
          onSubmit={handleSubmit}
          onClose={() => setGrading(null)}
        />
      )}
    </div>
  );
}
