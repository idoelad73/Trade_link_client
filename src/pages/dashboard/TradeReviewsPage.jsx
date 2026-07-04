import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getTradeReviews } from '../../api/contractor.js';

const GRADE = {
  1: { label: 'Poor',      emoji: '😞', from: '#fee2e2', to: '#fecaca', text: '#dc2626', border: '#fca5a5' },
  2: { label: 'Fair',      emoji: '😐', from: '#fff7ed', to: '#fed7aa', text: '#ea580c', border: '#fdba74' },
  3: { label: 'Good',      emoji: '🙂', from: '#fefce8', to: '#fef08a', text: '#ca8a04', border: '#fde047' },
  4: { label: 'Very Good', emoji: '😊', from: '#f0fdf4', to: '#bbf7d0', text: '#16a34a', border: '#86efac' },
  5: { label: 'Excellent', emoji: '🌟', from: '#eef2ff', to: '#c7d2fe', text: '#4f46e5', border: '#a5b4fc' },
};

function roundHalf(n) { return Math.round(n * 2) / 2; }

function Stars({ avg, size = 14 }) {
  const r = roundHalf(avg);
  return (
    <div className="flex items-center gap-px">
      {[1,2,3,4,5].map(n => {
        const f = r >= n ? 'full' : r >= n - 0.5 ? 'half' : 'empty';
        if (f === 'full')  return <span key={n} className="text-amber-400 leading-none" style={{fontSize:size}}>★</span>;
        if (f === 'empty') return <span key={n} className="text-slate-200 leading-none" style={{fontSize:size}}>★</span>;
        return (
          <span key={n} className="relative inline-block leading-none" style={{fontSize:size}}>
            <span className="text-slate-200">★</span>
            <span className="absolute inset-0 overflow-hidden text-amber-400" style={{width:'50%'}}>★</span>
          </span>
        );
      })}
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
}

function ReviewCard({ r }) {
  const g = GRADE[r.trade_grade] ?? GRADE[3];
  const [lightbox, setLightbox] = useState(null);

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden transition-all hover:shadow-md"
      style={{ borderColor: g.border }}>

      {/* Gradient accent bar */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(to right, ${g.from}, ${g.to})` }} />

      <div className="p-5">
        {/* Top row: grade badge + date */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            {/* Grade pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{ background: g.from, color: g.text, border: `1px solid ${g.border}` }}>
              <span className="text-base leading-none">{g.emoji}</span>
              <span>{g.label}</span>
            </div>
            <Stars avg={r.trade_grade} size={15} />
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0 mt-1 font-medium">
            {formatDate(r.createdAt || r.date)}
          </span>
        </div>

        {/* Contractor + site */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-sky-100 flex items-center justify-center text-sm flex-shrink-0">
            🏗️
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">{r.contractorName ?? '—'}</p>
            {r.siteName && (
              <p className="text-[11px] text-slate-400 truncate">📍 {r.siteName}</p>
            )}
          </div>
        </div>

        {/* Review text */}
        {r.review_text ? (
          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 mb-3">
            "{r.review_text}"
          </p>
        ) : (
          <p className="text-xs text-slate-300 italic mb-3">No written review.</p>
        )}

        {/* Photos */}
        {r.photos?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {r.photos.map((url, idx) => (
              <button key={idx} type="button" onClick={() => setLightbox(idx)}
                className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 hover:border-amber-300 hover:shadow-sm transition-all active:scale-95 flex-shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Per-card lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold transition">×</button>

          {r.photos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox((lightbox - 1 + r.photos.length) % r.photos.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-2xl font-bold transition select-none">‹</button>
              <button onClick={e => { e.stopPropagation(); setLightbox((lightbox + 1) % r.photos.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-2xl font-bold transition select-none">›</button>
            </>
          )}

          <img src={r.photos[lightbox]} alt="" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
            onClick={e => e.stopPropagation()} />

          {r.photos.length > 1 && (
            <div className="absolute bottom-4 flex gap-1.5">
              {r.photos.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setLightbox(i); }}
                  className={`w-2 h-2 rounded-full transition ${i === lightbox ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TradeReviewsPage() {
  const { tradeId }           = useParams();
  const navigate              = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getTradeReviews(tradeId)
      .then(setData)
      .catch(() => setError('Could not load reviews.'))
      .finally(() => setLoading(false));
  }, [tradeId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50">
      <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50">
      <p className="text-slate-500">{error || 'Not found.'}</p>
      <button onClick={() => navigate(-1)} className="text-sm text-amber-600 hover:underline">← Go back</button>
    </div>
  );

  const { pro, reviews } = data;
  const topGrade = pro.avgGrade ? GRADE[Math.round(pro.avgGrade)] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 pb-16 font-sans">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-amber-600 hover:text-amber-500 font-semibold text-sm transition">
          ← Back
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-base font-bold text-sky-600 tracking-tight hidden sm:block">TradeLink</span>
        </div>
        <span className="ml-auto text-xs text-slate-400 hidden sm:block font-medium truncate">
          Reviews — {pro.fullName}
        </span>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-8 space-y-6">

        {/* ── Trade pro hero ──────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="h-16 bg-gradient-to-r from-sky-400 via-amber-300 to-orange-400" />
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-8 mb-3">
              <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center flex-shrink-0">
                {pro.photo
                  ? <img src={pro.photo} alt={pro.fullName} className="w-full h-full object-cover" />
                  : <span className="text-2xl">🔧</span>}
              </div>
              {topGrade && (
                <span className="mb-1 text-3xl" title={topGrade.label}>{topGrade.emoji}</span>
              )}
            </div>
            <p className="font-extrabold text-slate-800 text-lg leading-tight">{pro.fullName}</p>
            <p className="text-sm font-semibold text-sky-600 mb-2">{pro.professionality}</p>
            {pro.avgGrade ? (
              <div className="flex items-center gap-2">
                <Stars avg={pro.avgGrade} size={17} />
                <span className="text-base font-extrabold text-amber-500">{pro.avgGrade.toFixed(1)}</span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                  {pro.gradeCount} review{pro.gradeCount !== 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No reviews yet</p>
            )}
          </div>
        </div>

        {/* ── Reviews list ────────────────────────────────────────────── */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-16 text-center text-slate-400">
            <p className="text-5xl mb-3">⭐</p>
            <p className="font-bold text-slate-600 text-base">No reviews yet</p>
            <p className="text-sm mt-1">Be the first to leave a review!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => <ReviewCard key={r._id} r={r} />)}
          </div>
        )}

      </div>
    </div>
  );
}
