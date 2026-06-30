import { useRef, useState } from 'react';
import { uploadGradePhoto } from '../../api/contractor.js';
import { toast } from '../../utils/toast.js';

const GRADE_LABELS = {
  1: { label: 'Poor',      emoji: '😞', color: '#ef4444' },
  2: { label: 'Fair',      emoji: '😐', color: '#f97316' },
  3: { label: 'Good',      emoji: '🙂', color: '#eab308' },
  4: { label: 'Very Good', emoji: '😊', color: '#22c55e' },
  5: { label: 'Excellent', emoji: '🌟', color: '#6366f1' },
};

const MAX_PHOTOS = parseInt(import.meta.env.VITE_MAX_GRADE_PHOTOS ?? '5', 10);

export default function TradeGradeModal({ trade, onSubmit, onClose }) {
  const [hover,       setHover]       = useState(0);
  const [selected,    setSelected]    = useState(0);
  const [reviewText,  setReviewText]  = useState('');
  const [photos,      setPhotos]      = useState([]);   // [{ url, uploading }]
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const fileInputRef = useRef(null);

  const active = hover || selected;
  const info   = GRADE_LABELS[active];

  async function handlePhotoAdd(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed per review.`, { duration: 3000 });
      return;
    }

    const tmpId = Date.now();
    setPhotos(prev => [...prev, { tmpId, url: null, uploading: true }]);

    try {
      const url = await uploadGradePhoto(file);
      setPhotos(prev => prev.map(p => p.tmpId === tmpId ? { tmpId, url, uploading: false } : p));
    } catch {
      setPhotos(prev => prev.filter(p => p.tmpId !== tmpId));
      toast.error('Photo upload failed. Please try again.', { duration: 3000 });
    }
  }

  function handlePhotoRemove(tmpId) {
    setPhotos(prev => prev.filter(p => p.tmpId !== tmpId));
  }

  async function handleSubmit() {
    if (!selected) return setError('Please select a rating before submitting.');
    if (photos.some(p => p.uploading)) return setError('Please wait for photos to finish uploading.');
    setLoading(true); setError('');
    try {
      const urls = photos.map(p => p.url).filter(Boolean);
      await onSubmit(trade.trade_id, trade.site_id, trade.order_id, selected, reviewText.trim(), urls);
      onClose();
    } catch {
      setError('Failed to submit grade. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const uploadingCount = photos.filter(p => p.uploading).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* Top accent bar */}
        <div className="h-1.5 w-full flex-shrink-0"
          style={{ background: info ? `linear-gradient(90deg,${info.color},#818cf8)` : 'linear-gradient(90deg,#e2e8f0,#e2e8f0)' }} />

        <div className="px-7 pt-6 pb-7 overflow-y-auto">

          {/* Trade info */}
          <div className="flex items-center gap-4 mb-5">
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
                key={n} type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setSelected(n)}
                className="transition-transform duration-100 hover:scale-125 focus:outline-none"
                style={{ fontSize: 36, lineHeight: 1 }}
                aria-label={`${n} star${n !== 1 ? 's' : ''}`}
              >
                <span style={{ filter: n <= active ? 'none' : 'grayscale(1) opacity(0.3)', transition: 'filter 0.15s' }}>⭐</span>
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

          {/* Review text */}
          <div className="mb-4">
            <textarea
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="Share your experience (optional)…"
              maxLength={500}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
            />
            <p className="text-right text-[10px] text-slate-400 mt-1">{reviewText.length}/500</p>
          </div>

          {/* Photo upload */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500">📸 Photos</span>
              <span className="text-[10px] text-slate-400">{photos.length}/{MAX_PHOTOS}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {photos.map(p => (
                <div key={p.tmpId} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                  {p.uploading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handlePhotoRemove(p.tmpId)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-bold hover:bg-red-600"
                        aria-label="Remove photo"
                      >✕</button>
                    </>
                  )}
                </div>
              ))}

              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 transition flex-shrink-0"
                  aria-label="Add photo"
                >
                  <span className="text-xl leading-none">📷</span>
                  <span className="text-[9px] mt-0.5 font-semibold">Add</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoAdd}
            />
          </div>

          {/* Error */}
          {error && <p className="text-xs text-red-500 text-center mb-4">{error}</p>}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !selected || uploadingCount > 0}
              className="flex-1 py-3 rounded-2xl text-sm font-bold text-white shadow transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: selected ? `linear-gradient(135deg,${GRADE_LABELS[selected].color},#818cf8)` : '#94a3b8' }}
            >
              {loading ? 'Submitting…' : uploadingCount > 0 ? `Uploading ${uploadingCount}…` : '✓ Submit Grade'}
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
