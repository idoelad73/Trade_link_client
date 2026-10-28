import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyToJob } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';
import RateCommentModal from '../../components/shared/RateCommentModal.jsx';
import { toast } from '../../utils/toast.js';
import { getJobDateInfo, appliedJobIds } from '../../utils/jobDates.js';

const content = {
  en: {
    back:          '← Back to Jobs',
    notFound:      'Job not found — go back and search again.',
    types:         { residential: '🏠 Residential', commercial: '🏢 Commercial' },
    away:          'away',
    contractor:    'Contractor',
    noReviews:     'No reviews yet',
    reviews:       (n) => `${n} review${n !== 1 ? 's' : ''}`,
    yourTrade:     (trade) => `Your trade: ${trade}`,
    workers:       'Workers needed',
    budget:        'Budget',
    hours:         'Total hours',
    estimate:      'Your estimate',
    schedule:      'Schedule',
    startAdjusted: (d) => `Requested date is a non-working day — starts ${d}`,
    workingDays:   (n) => `${n} working day${n !== 1 ? 's' : ''}`,
    noDate:        'The contractor hasn\'t set a date yet — you can apply once they do.',
    deposit:       'Deposit held',
    rateComment:   'Rate comments from the contractor',
    allTrades:     'All trades on this project',
    filled:        'Filled',
    open:          'Open',
    apply:         'Apply for Job',
    applying:      'Sending…',
    applied:       '✓ Applied',
    applySuccess:  (site, date) => `✅ Application sent for "${site}" on ${date}`,
    applyDupe:     (site) => `⚠️ You already applied for "${site}"`,
    applyAssigned: (site) => `🔒 "${site}" has already been filled`,
    applyError:    'Failed to send. Please try again.',
  },
  es: {
    back:          '← Volver a Trabajos',
    notFound:      'Trabajo no encontrado — vuelve y busca de nuevo.',
    types:         { residential: '🏠 Residencial', commercial: '🏢 Comercial' },
    away:          'de distancia',
    contractor:    'Contratista',
    noReviews:     'Sin reseñas aún',
    reviews:       (n) => `${n} reseña${n !== 1 ? 's' : ''}`,
    yourTrade:     (trade) => `Tu oficio: ${trade}`,
    workers:       'Trabajadores',
    budget:        'Presupuesto',
    hours:         'Horas totales',
    estimate:      'Tu estimado',
    schedule:      'Fechas',
    startAdjusted: (d) => `La fecha pedida no es hábil — comienza el ${d}`,
    workingDays:   (n) => `${n} día${n !== 1 ? 's' : ''} hábil${n !== 1 ? 'es' : ''}`,
    noDate:        'El contratista aún no fijó una fecha — podrás postularte cuando lo haga.',
    deposit:       'Depósito retenido',
    rateComment:   'Comentarios de tarifa del contratista',
    allTrades:     'Todos los oficios del proyecto',
    filled:        'Cubierto',
    open:          'Abierto',
    apply:         'Postularme',
    applying:      'Enviando…',
    applied:       '✓ Enviado',
    applySuccess:  (site, date) => `✅ Solicitud enviada para "${site}" el ${date}`,
    applyDupe:     (site) => `⚠️ Ya te postulaste para "${site}"`,
    applyAssigned: (site) => `🔒 "${site}" ya fue cubierto`,
    applyError:    'Error al enviar. Inténtalo de nuevo.',
  },
};

function Stat({ label, value, tone = 'slate' }) {
  const tones = {
    slate:   'bg-slate-50 border-slate-100 text-slate-700',
    amber:   'bg-amber-50 border-amber-100 text-amber-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    violet:  'bg-violet-50 border-violet-100 text-violet-700',
    sky:     'bg-sky-50 border-sky-100 text-sky-700',
  };
  return (
    <div className={`border rounded-2xl px-4 py-3 ${tones[tone]}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70 mb-0.5">{label}</p>
      <p className="text-base font-extrabold">{value}</p>
    </div>
  );
}

// Full project details for one job — opened from "Apply for Job" on the results
// page. The apply flow (workers picker → applyToJob) runs from here.
export default function JobDetailsPage() {
  const navigate  = useNavigate();
  const { state } = useLocation();
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const job        = state?.job        ?? null;
  const jobTrade   = state?.trade      ?? '';
  const hourlyRate = state?.hourlyRate ?? null;
  const unit       = state?.unit       ?? 'mi';

  const [applying,     setApplying]     = useState(false);
  const [applied,      setApplied]      = useState(() => !!job && appliedJobIds.has(String(job._id)));
  const [workersOpen,  setWorkersOpen]  = useState(false);
  const [workersCount, setWorkersCount] = useState('1');
  const [workersError, setWorkersError] = useState('');
  const [rateCommentOpen, setRateCommentOpen] = useState(false);

  const back = () => navigate(-1);

  const TopBar = (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
      <button onClick={back} className="flex items-center gap-2 text-sky-600 hover:text-sky-500 font-semibold text-sm transition">
        {t.back}
      </button>
      <div className="h-5 w-px bg-slate-200" />
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sky-400 to-amber-400 flex items-center justify-center shadow">
          <span className="text-white font-bold text-xs">T</span>
        </div>
        <span className="text-base font-bold text-sky-600 tracking-tight hidden sm:block">TradeLink</span>
      </div>
    </div>
  );

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 font-sans text-slate-800">
        {TopBar}
        <p className="text-center text-sm text-slate-400 py-24">{t.notFound}</p>
      </div>
    );
  }

  const te       = job.tradeEntry;
  const dateInfo = getJobDateInfo(te);
  const distance = unit === 'km'
    ? `${(job.distanceMeters / 1000).toFixed(1)} km`
    : `${(job.distanceMeters / 1609.344).toFixed(1)} mi`;
  const workers  = te?.workers_no > 0 ? te.workers_no : 1;
  const estimate = te?.budgetType === 'hours' && te?.totalHours && hourlyRate
    ? parseFloat((te.totalHours * hourlyRate * workers).toFixed(2))
    : null;

  // Step 1 — Apply clicked: ask for workers when the slot has a worker count
  const handleApply = () => {
    if (applying || applied || !dateInfo) return;
    if ((te.workers_no ?? 0) > 0) {
      setWorkersCount('1');
      setWorkersError('');
      setWorkersOpen(true);
    } else {
      handleApplyConfirm(1);
    }
  };

  // Step 2 — actual API call
  const handleApplyConfirm = async (workersNo) => {
    setWorkersOpen(false);
    setApplying(true);
    try {
      await applyToJob(job._id, lang, dateInfo.start, workersNo);
      appliedJobIds.add(String(job._id));
      setApplied(true);
      toast.success(t.applySuccess(job.name, dateInfo.start), { duration: 5000 });
    } catch (err) {
      const data = err?.response?.data;
      if (err?.response?.status === 409) {
        if (data?.assigned)       toast.error(t.applyAssigned(job.name), { duration: 4000 });
        else if (data?.slotsFull) toast.error('All worker slots for this job are full.', { duration: 4000 });
        else if (data?.tooMany)   toast.error(`Only ${data.workersLeft} slot(s) remaining.`, { duration: 4000 });
        else                      toast.warning(t.applyDupe(job.name), { duration: 4000 });
      } else {
        toast.error(t.applyError, { duration: 4000 });
      }
    } finally {
      setApplying(false);
    }
  };

  const handleWorkersConfirm = () => {
    const w = parseInt(workersCount);
    const maxSlots = te?.workers_no ?? 0;
    if (isNaN(w) || w < 1) { setWorkersError('Minimum 1 worker required.'); return; }
    if (maxSlots > 0 && w > maxSlots) { setWorkersError(`Only ${maxSlots} slot(s) available.`); return; }
    handleApplyConfirm(w);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 font-sans text-slate-800 pb-28">
      {TopBar}

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="relative h-52 sm:h-64 bg-gradient-to-br from-amber-100 to-sky-100 flex items-center justify-center">
            {job.photo
              ? <img src={job.photo} alt={job.name} className="w-full h-full object-cover" />
              : <span className="text-7xl">{job.type === 'residential' ? '🏠' : '🏢'}</span>}
            {t.types[job.type] && (
              <span className="absolute top-4 left-4 text-xs font-bold bg-white/90 text-slate-700 px-3 py-1.5 rounded-full shadow-sm">
                {t.types[job.type]}
              </span>
            )}
            <span className="absolute top-4 right-4 text-xs font-bold bg-white/90 text-sky-700 px-3 py-1.5 rounded-full shadow-sm">
              📏 {distance} {t.away}
            </span>
          </div>
          <div className="px-6 py-5">
            <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">{job.name}</h1>
            {jobTrade && (
              <span className="inline-flex mt-2 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                🔧 {t.yourTrade(jobTrade)}
              </span>
            )}
          </div>
        </div>

        {/* ── Contractor ───────────────────────────────────────────── */}
        {job.contractorName && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-100 to-amber-100 flex items-center justify-center text-2xl">🏗️</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{t.contractor}</p>
              <p className="font-extrabold text-slate-800 truncate">{job.contractorName}</p>
            </div>
            {job.contractorId && job.contractorAvgGrade != null ? (
              <button
                type="button"
                onClick={() => navigate(`/dashboard/trade/contractor-reviews/${job.contractorId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active:scale-95"
              >
                <span className="text-amber-400">★</span>
                <span className="text-sm font-extrabold text-amber-700">{job.contractorAvgGrade.toFixed(1)}</span>
                <span className="text-xs text-slate-400">{t.reviews(job.contractorGradeCount)} →</span>
              </button>
            ) : (
              <span className="text-xs italic text-slate-400">{t.noReviews}</span>
            )}
          </div>
        )}

        {/* ── Job terms for your trade ─────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {te?.workers_no > 0 && <Stat label={t.workers} value={`👷 ${te.workers_no}`} tone="amber" />}
            {te?.budgetType === 'amount' && te?.maxAmount && <Stat label={t.budget} value={`💰 $${te.maxAmount}`} tone="emerald" />}
            {te?.budgetType === 'hours' && te?.totalHours && <Stat label={t.hours} value={`⏱️ ${te.totalHours}h`} tone="violet" />}
            {estimate != null && (
              <Stat
                label={t.estimate}
                value={workers > 1 ? `${workers}w × ${te.totalHours}h × $${hourlyRate} = $${estimate}` : `${te.totalHours}h × $${hourlyRate} = $${estimate}`}
                tone="emerald"
              />
            )}
            {te?.depositHeld && (
              <Stat label={t.deposit} value={`✅ ${te.depositAmount != null ? `$${te.depositAmount}` : ''}`} tone="emerald" />
            )}
          </div>

          {/* Dates */}
          <div className="bg-sky-50 border border-sky-100 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold text-sky-500 uppercase tracking-wide mb-1">{t.schedule}</p>
            {dateInfo ? (
              <>
                <p className="text-base font-extrabold text-sky-700">
                  📅 {dateInfo.isHours ? `${dateInfo.start} → ${dateInfo.end}` : dateInfo.start}
                </p>
                {dateInfo.isHours && <p className="text-xs text-sky-600 mt-0.5">{t.workingDays(dateInfo.range.length)}</p>}
                {dateInfo.shifted && <p className="text-xs text-amber-600 mt-1">⚠️ {t.startAdjusted(dateInfo.start)}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-500">{t.noDate}</p>
            )}
          </div>

          {te?.rateComment?.trim() && (
            <button
              type="button"
              onClick={() => setRateCommentOpen(true)}
              className="w-full text-left bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-2xl px-4 py-3 transition"
            >
              <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-0.5">💬 {t.rateComment}</p>
              <p className="text-sm text-amber-800 line-clamp-2">{te.rateComment}</p>
            </button>
          )}
        </div>

        {/* ── All trades on the project ────────────────────────────── */}
        {job.projectTrades?.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 px-6 py-5">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">{t.allTrades}</p>
            <div className="flex flex-wrap gap-2">
              {job.projectTrades.map((tr, i) => (
                <span key={`${tr.name}-${i}`}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border ${
                    tr.assigned
                      ? 'bg-slate-50 text-slate-400 border-slate-200'
                      : tr.name.toLowerCase() === jobTrade.toLowerCase()
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                  }`}>
                  {tr.name} · {tr.assigned ? t.filled : t.open}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Sticky apply bar ──────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-100 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleApply}
            disabled={applying || !dateInfo || applied}
            className="w-full py-3.5 rounded-2xl text-base font-extrabold transition-all active:scale-[0.99] bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-white shadow-lg shadow-amber-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applied ? t.applied : applying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {t.applying}
              </span>
            ) : t.apply}
          </button>
        </div>
      </div>

      {/* ── Workers count modal ───────────────────────────────────────── */}
      {workersOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-sky-400" />
            <div className="px-6 pt-6 pb-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl mx-auto mb-3">👷</div>
              <h3 className="text-base font-extrabold text-slate-800 mb-1">How many workers?</h3>
              <p className="text-xs text-slate-400 mb-3">
                Tell the contractor how many workers you'll bring to <span className="font-semibold text-slate-600">{job.name}</span>
              </p>
              {(te?.workers_no ?? 0) > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700">
                  👷 {te.workers_no} slot{te.workers_no !== 1 ? 's' : ''} available
                </div>
              )}
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setWorkersCount(w => String(Math.max(1, (parseInt(w) || 1) - 1)))}
                  className="w-11 h-11 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg transition active:scale-95"
                >−</button>
                <input
                  type="number"
                  min="1"
                  max={te?.workers_no > 0 ? te.workers_no : undefined}
                  value={workersCount}
                  onChange={(e) => { setWorkersCount(e.target.value); setWorkersError(''); }}
                  className="flex-1 text-center text-xl font-extrabold text-slate-800 border-2 border-slate-200 focus:border-sky-400 rounded-xl py-2 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setWorkersCount(w => {
                    const next = (parseInt(w) || 1) + 1;
                    const max  = te?.workers_no ?? 0;
                    if (max > 0 && next > max) return w;
                    return String(next);
                  })}
                  className="w-11 h-11 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg transition active:scale-95"
                >+</button>
              </div>
              {workersError && <p className="text-xs text-red-500 font-semibold mb-2">{workersError}</p>}
            </div>
            <div className="px-6 pb-6 flex gap-2 mt-3">
              <button
                onClick={handleWorkersConfirm}
                className="flex-1 font-bold py-2.5 rounded-xl text-sm shadow transition-all active:scale-[0.98] bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-white shadow-amber-200"
              >
                Apply for Job →
              </button>
              <button
                onClick={() => setWorkersOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rateCommentOpen && (
        <RateCommentModal
          tradeName={te?.name ?? jobTrade}
          value={te?.rateComment ?? ''}
          readOnly
          onClose={() => setRateCommentOpen(false)}
        />
      )}
    </div>
  );
}
