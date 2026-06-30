import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getContractorReviews } from '../../api/trade.js';

const GRADE_LABELS = {
  1: { label: 'Poor',      emoji: '😞', color: '#ef4444' },
  2: { label: 'Fair',      emoji: '😐', color: '#f97316' },
  3: { label: 'Good',      emoji: '🙂', color: '#eab308' },
  4: { label: 'Very Good', emoji: '😊', color: '#22c55e' },
  5: { label: 'Excellent', emoji: '🌟', color: '#6366f1' },
};

function roundHalf(n) { return Math.round(n * 2) / 2; }

function StarRow({ avg, size = 15 }) {
  const rounded = roundHalf(avg);
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map(n => {
        const fill = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'empty';
        if (fill === 'full')  return <span key={n} className="text-amber-400 leading-none" style={{ fontSize: size }}>★</span>;
        if (fill === 'empty') return <span key={n} className="text-slate-200 leading-none" style={{ fontSize: size }}>★</span>;
        return (
          <span key={n} className="relative inline-block leading-none" style={{ fontSize: size }}>
            <span className="text-slate-200">★</span>
            <span className="absolute inset-0 overflow-hidden text-amber-400" style={{ width: '50%' }}>★</span>
          </span>
        );
      })}
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ContractorReviewsPage() {
  const { contractorId }       = useParams();
  const navigate               = useNavigate();
  const [data,    setData]     = useState(null);
  const [loading, setLoading]  = useState(true);
  const [error,   setError]    = useState('');
  const [lightbox, setLightbox] = useState(null); // { photos, idx }

  useEffect(() => {
    getContractorReviews(contractorId)
      .then(setData)
      .catch(() => setError('Could not load reviews.'))
      .finally(() => setLoading(false));
  }, [contractorId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
      <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 to-emerald-50">
      <p className="text-slate-500">{error || 'Not found.'}</p>
      <button onClick={() => navigate(-1)} className="text-sm text-emerald-600 hover:underline">← Go back</button>
    </div>
  );

  const { contractor, reviews } = data;
  const gradeInfo = contractor.avgGrade ? GRADE_LABELS[Math.round(contractor.avgGrade)] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 pb-16">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 font-semibold text-sm transition"
        >
          ← Back
        </button>
        <span className="text-slate-300">|</span>
        <span className="font-bold text-slate-700 text-sm truncate">Reviews — {contractor.companyName}</span>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6">

        {/* Contractor hero card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-100 to-emerald-100 flex items-center justify-center text-3xl flex-shrink-0">🏢</div>
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-slate-800 text-lg truncate">{contractor.companyName}</p>
            {contractor.address && <p className="text-xs text-slate-400 truncate mt-0.5">📍 {contractor.address}</p>}
            {contractor.avgGrade ? (
              <div className="flex items-center gap-2 mt-1">
                <StarRow avg={contractor.avgGrade} size={16} />
                <span className="text-sm font-extrabold text-slate-700">{contractor.avgGrade.toFixed(1)}</span>
                <span className="text-xs text-slate-400">({contractor.gradeCount} review{contractor.gradeCount !== 1 ? 's' : ''})</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1 italic">No reviews yet</p>
            )}
          </div>
          {gradeInfo && (
            <div className="flex-shrink-0 text-3xl" title={gradeInfo.label}>{gradeInfo.emoji}</div>
          )}
        </div>

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-4xl mb-3">⭐</p>
            <p className="font-semibold">No reviews yet</p>
            <p className="text-sm mt-1">Be the first to leave a review!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map(r => {
              const info = GRADE_LABELS[r.trade_grade];
              return (
                <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <StarRow avg={r.trade_grade} size={14} />
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: info.color + '18', color: info.color }}
                        >
                          {info.emoji} {info.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {r.tradeName}
                        {r.tradeProfessionality && <span className="ml-1">· {r.tradeProfessionality}</span>}
                        {r.siteName && <span className="ml-1">· 📍 {r.siteName}</span>}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{formatDate(r.createdAt || r.date)}</span>
                  </div>

                  {/* Review text */}
                  {r.review_text && (
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">{r.review_text}</p>
                  )}

                  {/* Photos */}
                  {r.photos?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {r.photos.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightbox({ photos: r.photos, idx })}
                          className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 flex-shrink-0 hover:opacity-90 transition focus:outline-none focus:ring-2 focus:ring-emerald-300"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-slate-300"
            onClick={() => setLightbox(null)}
          >✕</button>

          {lightbox.photos.length > 1 && (
            <>
              <button
                className="absolute left-4 text-white text-3xl font-bold hover:text-slate-300 select-none"
                onClick={e => { e.stopPropagation(); setLightbox(prev => ({ ...prev, idx: (prev.idx - 1 + prev.photos.length) % prev.photos.length })); }}
              >‹</button>
              <button
                className="absolute right-4 text-white text-3xl font-bold hover:text-slate-300 select-none"
                onClick={e => { e.stopPropagation(); setLightbox(prev => ({ ...prev, idx: (prev.idx + 1) % prev.photos.length })); }}
              >›</button>
            </>
          )}

          <img
            src={lightbox.photos[lightbox.idx]}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />

          {lightbox.photos.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
              {lightbox.photos.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setLightbox(prev => ({ ...prev, idx: i })); }}
                  className={`w-2 h-2 rounded-full transition ${i === lightbox.idx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
