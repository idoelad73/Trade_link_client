import { useState, useEffect } from 'react';
import { getTradeProProfile } from '../../api/contractor.js';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_FULL = { monday:'Monday', tuesday:'Tuesday', wednesday:'Wednesday', thursday:'Thursday', friday:'Friday', saturday:'Saturday', sunday:'Sunday' };

function roundHalf(n) { return Math.round(n * 2) / 2; }

function StarRow({ avg }) {
  if (!avg) return null;
  const rounded = roundHalf(avg);
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => {
        const fill = rounded >= n ? 'full' : rounded >= n - 0.5 ? 'half' : 'empty';
        if (fill === 'full')  return <span key={n} className="text-amber-400" style={{fontSize:15}}>★</span>;
        if (fill === 'empty') return <span key={n} className="text-slate-200" style={{fontSize:15}}>★</span>;
        return (
          <span key={n} className="relative inline-block" style={{fontSize:15}}>
            <span className="text-slate-200">★</span>
            <span className="absolute inset-0 overflow-hidden text-amber-400" style={{width:'50%'}}>★</span>
          </span>
        );
      })}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  );
}

// ── Tab 1: Trade Info ─────────────────────────────────────────────────────────
function InfoTab({ pro }) {
  return (
    <div className="space-y-4">
      {pro.photo && (
        <div className="flex justify-center mb-1">
          <img src={pro.photo} alt={pro.fullName} className="w-20 h-20 rounded-2xl object-cover border-2 border-sky-100 shadow" />
        </div>
      )}

      {/* Rating */}
      {pro.avgGrade && (
        <div className="flex items-center gap-2 justify-center">
          <StarRow avg={pro.avgGrade} />
          <span className="text-sm font-extrabold text-amber-500">{roundHalf(pro.avgGrade).toFixed(1)}</span>
          {pro.gradeCount > 0 && <span className="text-xs text-slate-400">({pro.gradeCount} review{pro.gradeCount !== 1 ? 's' : ''})</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Full Name"   value={pro.fullName} />
        <Field label="Trade"       value={pro.professionality} />
        <Field label="Phone"       value={pro.phone} />
        <Field label="Email"       value={pro.email} />
      </div>
      <Field label="Address" value={pro.address} />

      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Hourly Rate</p>
        {pro.hourlyRate != null
          ? <p className="text-sm font-extrabold text-emerald-600">${pro.hourlyRate}<span className="text-xs font-normal text-slate-400 ml-0.5">/hr</span></p>
          : <p className="text-sm text-slate-400">—</p>}
      </div>

      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Documents</p>
        <div className="flex gap-2 flex-wrap">
          {[['License', pro.licenseDoc], ['Insurance', pro.insuranceDoc], ['CV', pro.cv]].map(([label, url]) => (
            <span key={label} className={`text-xs font-medium px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${url ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
              {url ? '✓' : '—'} {label}
            </span>
          ))}
        </div>
      </div>

      {pro.createdAt && (
        <Field label="Member Since" value={new Date(pro.createdAt).toLocaleDateString()} />
      )}
    </div>
  );
}

// ── Tab 2: Working Hours ──────────────────────────────────────────────────────
function HoursTab({ pro }) {
  const wh = pro.workingHours ?? {};
  const hasAny = DAYS.some(d => wh[d]?.active);

  if (!hasAny) return (
    <div className="py-10 text-center text-slate-400 text-sm">
      <p className="text-3xl mb-3">🕐</p>
      This trade pro hasn't set their working hours yet.
    </div>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-4">Regular weekly availability for this trade professional.</p>
      {DAYS.map(day => {
        const entry  = wh[day] ?? {};
        const active = entry.active ?? false;
        return (
          <div key={day} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 ${active ? 'border-sky-200 bg-sky-50/40' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? 'bg-sky-400' : 'bg-slate-200'}`} />
            <span className={`w-24 text-sm font-semibold ${active ? 'text-sky-700' : 'text-slate-400'}`}>{DAY_FULL[day]}</span>
            {active
              ? <span className="ml-auto text-xs font-bold text-sky-600 bg-sky-100 px-2.5 py-1 rounded-lg">{entry.start} – {entry.end}</span>
              : <span className="ml-auto text-xs text-slate-300 italic">Unavailable</span>
            }
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 3: Portfolio Photos ───────────────────────────────────────────────────
function PhotosTab({ pro }) {
  const photos = pro.portfolioPhotos ?? [];
  const [lightbox, setLightbox] = useState(null);

  if (photos.length === 0) return (
    <div className="py-10 text-center text-slate-400 text-sm">
      <p className="text-3xl mb-3">📸</p>
      No portfolio photos yet.
    </div>
  );

  return (
    <>
      <p className="text-xs text-slate-400 mb-4">Work portfolio — {photos.length} photo{photos.length !== 1 ? 's' : ''}.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((url, idx) => (
          <button key={idx} type="button" onClick={() => setLightbox(url)}
            className="rounded-2xl overflow-hidden border-2 border-slate-100 aspect-square hover:border-sky-300 transition">
            <img src={url} alt={`Work photo ${idx + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Full size" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold transition">×</button>
        </div>
      )}
    </>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function TradeFullInfoModal({ tradeId, onClose }) {
  const [pro,     setPro]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('info');

  useEffect(() => {
    getTradeProProfile(tradeId).then(setPro).finally(() => setLoading(false));
  }, [tradeId]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const TABS = [
    { id: 'info',   label: 'Trade Info',     icon: '👤' },
    { id: 'hours',  label: 'Working Hours',  icon: '🕐' },
    { id: 'photos', label: 'Photos',         icon: '📸' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-sky-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mb-1">
              🔧 Trade Professional
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {loading ? 'Loading…' : pro?.fullName ?? 'Profile'}
            </h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg">×</button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pb-3 flex-shrink-0 border-b border-slate-100">
          {TABS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === id
                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}>
              <span>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : !pro ? (
            <p className="text-center text-slate-400 py-12">Profile not found.</p>
          ) : (
            <>
              {tab === 'info'   && <InfoTab  pro={pro} />}
              {tab === 'hours'  && <HoursTab pro={pro} />}
              {tab === 'photos' && <PhotosTab pro={pro} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose}
            className="w-full px-6 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
