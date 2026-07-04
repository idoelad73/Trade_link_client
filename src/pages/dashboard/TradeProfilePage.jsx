import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTradeProProfile } from '../../api/contractor.js';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_FULL = {
  monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday',
  thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday',
};

function roundHalf(n) { return Math.round(n * 2) / 2; }

function Stars({ avg, size = 16 }) {
  const rounded = roundHalf(avg ?? 0);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => {
        const fill = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'empty';
        if (fill === 'full')  return <span key={n} className="text-amber-400" style={{fontSize:size}}>★</span>;
        if (fill === 'empty') return <span key={n} className="text-slate-200" style={{fontSize:size}}>★</span>;
        return (
          <span key={n} className="relative inline-block" style={{fontSize:size}}>
            <span className="text-slate-200">★</span>
            <span className="absolute inset-0 overflow-hidden text-amber-400" style={{width:'50%'}}>★</span>
          </span>
        );
      })}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-slate-800 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

export default function TradeProfilePage() {
  const { tradeId } = useParams();
  const navigate    = useNavigate();

  const [pro,      setPro]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    getTradeProProfile(tradeId).then(setPro).finally(() => setLoading(false));
  }, [tradeId]);

  const wh      = pro?.workingHours ?? {};
  const photos  = pro?.portfolioPhotos ?? [];
  const hasHours  = DAYS.some(d => wh[d]?.active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-yellow-50 to-amber-50 font-sans text-slate-800">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-yellow-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-amber-600 hover:text-amber-500 font-semibold text-sm transition"
        >
          ← Back
        </button>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
            <span className="text-white font-bold text-xs">T</span>
          </div>
          <span className="text-base font-bold text-sky-600 tracking-tight hidden sm:block">TradeLink</span>
        </div>
        {!loading && pro && (
          <span className="ml-auto text-xs font-semibold text-slate-400 hidden sm:block truncate">
            {pro.professionality} · {pro.fullName}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : !pro ? (
        <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-sm">
          Profile not found.
        </div>
      ) : (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

          {/* ── Hero card ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-sm border border-amber-100 overflow-hidden">
            {/* Gradient banner */}
            <div className="h-24 bg-gradient-to-r from-sky-400 via-amber-300 to-orange-400" />

            <div className="px-6 pb-6">
              {/* Avatar — overlaps banner */}
              <div className="flex items-end justify-between -mt-12 mb-4">
                <div className="w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center flex-shrink-0">
                  {pro.photo
                    ? <img src={pro.photo} alt={pro.fullName} className="w-full h-full object-cover" />
                    : <span className="text-4xl">🔧</span>
                  }
                </div>
                <span className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  🔧 {pro.professionality}
                </span>
              </div>

              {/* Name + rating */}
              <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">{pro.fullName}</h1>

              {pro.avgGrade ? (
                <button
                  type="button"
                  onClick={() => navigate(`/dashboard/contractor/trade-reviews/${tradeId}`)}
                  className="flex items-center gap-2 mt-2 group w-fit"
                  title="View all reviews"
                >
                  <Stars avg={pro.avgGrade} size={18} />
                  <span className="text-base font-extrabold text-amber-500">{roundHalf(pro.avgGrade).toFixed(1)}</span>
                  {pro.gradeCount > 0 && (
                    <span className="text-xs text-slate-400 group-hover:text-sky-500 group-hover:underline transition">
                      {pro.gradeCount} review{pro.gradeCount !== 1 ? 's' : ''} →
                    </span>
                  )}
                </button>
              ) : (
                <p className="text-xs text-slate-400 mt-2 italic">No reviews yet</p>
              )}

              {/* Hourly rate pill */}
              {pro.hourlyRate != null && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-sm font-bold">
                  💰 ${pro.hourlyRate}<span className="font-normal text-emerald-500">/hr</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Contact & details ─────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-2">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide pt-4 pb-2">Contact & Details</h2>
            <InfoRow icon="📞" label="Phone"        value={pro.phone} />
            <InfoRow icon="✉️" label="Email"        value={pro.email} />
            <InfoRow icon="📍" label="Address"      value={pro.address} />
            <InfoRow icon="📅" label="Member Since" value={pro.createdAt ? new Date(pro.createdAt).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' }) : null} />

            {/* Documents */}
            <div className="py-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Documents</p>
              <div className="flex flex-wrap gap-2">
                {[['📄 License', pro.licenseDoc], ['🛡️ Insurance', pro.insuranceDoc], ['📋 CV', pro.cv]].map(([label, url]) => (
                  url
                    ? <a key={label} href={url} target="_blank" rel="noreferrer"
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition">
                        ✓ {label}
                      </a>
                    : <span key={label} className="text-xs font-medium px-3 py-1.5 rounded-xl bg-slate-50 text-slate-400 border border-slate-100">
                        — {label}
                      </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Working Hours ──────────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-5">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">🕐 Working Hours</h2>
            {!hasHours ? (
              <p className="text-sm text-slate-400 italic text-center py-4">Working hours not set yet.</p>
            ) : (
              <div className="space-y-2">
                {DAYS.map(day => {
                  const entry  = wh[day] ?? {};
                  const active = entry.active ?? false;
                  return (
                    <div key={day} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${active ? 'bg-sky-50 border border-sky-100' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-sky-400' : 'bg-slate-200'}`} />
                      <span className={`w-28 text-sm font-semibold ${active ? 'text-sky-700' : 'text-slate-400'}`}>{DAY_FULL[day]}</span>
                      {active
                        ? <span className="ml-auto text-xs font-bold text-sky-600 bg-sky-100 px-3 py-1 rounded-lg">{entry.start} – {entry.end}</span>
                        : <span className="ml-auto text-xs text-slate-300 italic">Unavailable</span>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Portfolio Photos ───────────────────────────────────────── */}
          {photos.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-5">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
                📸 Portfolio — {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((url, idx) => (
                  <button key={idx} type="button" onClick={() => setLightbox(url)}
                    className="rounded-2xl overflow-hidden border-2 border-slate-100 aspect-square hover:border-amber-300 hover:shadow-md transition-all active:scale-95">
                    <img src={url} alt={`Work ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

        </main>
      )}

      {/* ── Lightbox ─────────────────────────────────────────────────────── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-2xl font-bold transition">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
