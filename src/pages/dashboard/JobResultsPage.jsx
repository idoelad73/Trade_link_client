import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyToJob } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';
import { toast } from '../../utils/toast.js';

// ── Working-day helpers (duplicated from TradeSchedule) ──────────────────────
const _hCache = {};
function _nthWeekday(y, m, wd, n) {
  let c = 0;
  for (let d = 1; d <= 31; d++) {
    const dt = new Date(y, m, d);
    if (dt.getMonth() !== m) break;
    if (dt.getDay() === wd && ++c === n)
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}
function _lastWeekday(y, m, wd) {
  for (let d = new Date(y, m + 1, 0).getDate(); d >= 1; d--)
    if (new Date(y, m, d).getDay() === wd)
      return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return null;
}
function getUSHolidays(y) {
  if (_hCache[y]) return _hCache[y];
  const h = new Set();
  [[0,1],[5,19],[6,4],[10,11],[11,25]].forEach(([mo, da]) => {
    const dt = new Date(y, mo, da);
    const dow = dt.getDay();
    if (dow === 6) dt.setDate(da - 1);
    else if (dow === 0) dt.setDate(da + 1);
    h.add(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
  });
  [
    _nthWeekday(y, 0, 1, 3), _nthWeekday(y, 1, 1, 3), _lastWeekday(y, 4, 1),
    _nthWeekday(y, 8, 1, 1), _nthWeekday(y, 9, 1, 2), _nthWeekday(y, 10, 4, 4),
  ].filter(Boolean).forEach(d => h.add(d));
  return (_hCache[y] = h);
}
function isWorkingDay(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00');
  const dow = dt.getDay();
  return dow !== 0 && dow !== 6 && !getUSHolidays(dt.getFullYear()).has(dateStr);
}
function nextWorkingDay(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00');
  let key = dateStr;
  while (!isWorkingDay(key)) {
    dt.setDate(dt.getDate() + 1);
    key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }
  return key;
}
function getWorkingDaysRange(startDateStr, totalHours) {
  const need = Math.ceil(totalHours / 8);
  const dt = new Date(startDateStr + 'T12:00:00');
  const days = [];
  while (days.length < need) {
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    if (isWorkingDay(key)) days.push(key);
    dt.setDate(dt.getDate() + 1);
  }
  return days;
}

const content = {
  en: {
    back:          '← Back to Schedule',
    title:         (n, trade) => `${n} open job${n !== 1 ? 's' : ''} for ${trade}`,
    noJobs:        'No open jobs found in this area for your trade.',
    apply:         'Apply for Job',
    applying:      'Sending…',
    applied:       '✓ Applied',
    pickDateFirst: 'No date available',
    workingDays:   (n) => `${n} working day${n !== 1 ? 's' : ''}`,
    startAdjusted: (d) => `⚠️ Non-working day — starts ${d}`,
    applySuccess:  (site, date) => `✅ Application sent for "${site}" on ${date}`,
    applyDupe:     (site) => `⚠️ You already applied for "${site}"`,
    applyAssigned: (site) => `🔒 "${site}" has already been filled`,
    applyError:    'Failed to send. Please try again.',
    workers:       (n) => `${n} worker${n !== 1 ? 's' : ''}`,
  },
  es: {
    back:          '← Volver al Calendario',
    title:         (n, trade) => `${n} trabajo${n !== 1 ? 's' : ''} abierto${n !== 1 ? 's' : ''} para ${trade}`,
    noJobs:        'No hay trabajos disponibles en esta área para tu oficio.',
    apply:         'Postularme',
    applying:      'Enviando…',
    applied:       '✓ Enviado',
    pickDateFirst: 'Sin fecha disponible',
    workingDays:   (n) => `${n} día${n !== 1 ? 's' : ''} hábil${n !== 1 ? 'es' : ''}`,
    startAdjusted: (d) => `⚠️ Día no hábil — comienza el ${d}`,
    applySuccess:  (site, date) => `✅ Solicitud enviada para "${site}" el ${date}`,
    applyDupe:     (site) => `⚠️ Ya te postulaste para "${site}"`,
    applyAssigned: (site) => `🔒 "${site}" ya fue cubierto`,
    applyError:    'Error al enviar. Inténtalo de nuevo.',
    workers:       (n) => `${n} trabajador${n !== 1 ? 'es' : ''}`,
  },
};

export default function JobResultsPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const lang = useUIStore((s) => s.lang);
  const t = content[lang];

  const results    = state?.results    ?? [];
  const jobTrade   = state?.trade      ?? '';
  const hourlyRate = state?.hourlyRate ?? null;
  const unit       = state?.unit       ?? 'mi';

  const [applyingId,   setApplyingId]   = useState(null);
  const [appliedIds,   setAppliedIds]   = useState(new Set());

  // ── Workers modal state ───────────────────────────────────────────────────
  const [pendingJob,   setPendingJob]   = useState(null);   // job waiting for workers input
  const [workersCount, setWorkersCount] = useState('1');
  const [workersError, setWorkersError] = useState('');

  // Step 1 — called when button is clicked
  const handleApply = useCallback((job) => {
    if (applyingId) return;
    const te = job.tradeEntry;
    if (!te?.requiredDate) return;
    if ((te.workers_no ?? 0) > 0) {
      // Show workers modal first
      setWorkersCount('1');
      setWorkersError('');
      setPendingJob(job);
    } else {
      handleApplyConfirm(job, 1);
    }
  }, [applyingId]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2 — actual API call (after workers confirmed, or direct for no-workers jobs)
  const handleApplyConfirm = useCallback(async (job, workersNo) => {
    const te = job.tradeEntry;
    const baseDate = te?.requiredDate;
    if (!baseDate) return;
    const actualStart = (te?.budgetType === 'hours' && te?.totalHours)
      ? getWorkingDaysRange(baseDate, te.totalHours)[0]
      : nextWorkingDay(baseDate);
    setPendingJob(null);
    setApplyingId(job._id);
    try {
      await applyToJob(job._id, lang, actualStart, workersNo);
      setAppliedIds((prev) => { const n = new Set(prev); n.add(String(job._id)); return n; });
      toast.success(t.applySuccess(job.name, actualStart), { duration: 5000 });
    } catch (err) {
      const data = err?.response?.data;
      if (err?.response?.status === 409) {
        if (data?.assigned)   toast.error(t.applyAssigned(job.name), { duration: 4000 });
        else if (data?.slotsFull) toast.error('All worker slots for this job are full.', { duration: 4000 });
        else if (data?.tooMany)   toast.error(`Only ${data.workersLeft} slot(s) remaining.`, { duration: 4000 });
        else                  toast.warning(t.applyDupe(job.name), { duration: 4000 });
      } else {
        toast.error(t.applyError, { duration: 4000 });
      }
    } finally {
      setApplyingId(null);
    }
  }, [applyingId, lang, t]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleWorkersConfirm = () => {
    const w = parseInt(workersCount);
    const maxSlots = pendingJob?.tradeEntry?.workers_no ?? 0;
    if (isNaN(w) || w < 1) { setWorkersError('Minimum 1 worker required.'); return; }
    if (maxSlots > 0 && w > maxSlots) { setWorkersError(`Only ${maxSlots} slot(s) available.`); return; }
    handleApplyConfirm(pendingJob, w);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-slate-50 to-amber-50 font-sans text-slate-800">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm px-4 sm:px-8 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard/trade')}
          className="flex items-center gap-2 text-sky-600 hover:text-sky-500 font-semibold text-sm transition"
        >
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

      {/* ── Content ──────────────────────────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {results.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-8 text-sm text-slate-400 text-center">
            {t.noJobs}
          </div>
        ) : (
          <>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
              {t.title(results.length, jobTrade)}
            </p>

            {results.map((job) => {
              const distMi  = (job.distanceMeters / 1609.344).toFixed(1);
              const distKm  = (job.distanceMeters / 1000).toFixed(1);
              const distLabel = unit === 'km' ? `${distKm} km` : `${distMi} mi`;
              const te = job.tradeEntry;
              const alreadyApplied = appliedIds.has(String(job._id));

              const getDateInfo = () => {
                if (!te?.requiredDate) return null;
                const baseDate  = te.requiredDate;
                const isHours   = te?.budgetType === 'hours' && te?.totalHours;
                const range     = isHours ? getWorkingDaysRange(baseDate, te.totalHours) : null;
                const start     = range ? range[0] : nextWorkingDay(baseDate);
                const end       = range ? range[range.length - 1] : null;
                const shifted   = start !== baseDate;
                return { start, end, range, isHours, shifted };
              };
              const dateInfo = getDateInfo();

              return (
                <div
                  key={job._id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  {/* Site photo bar */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-50">
                    {job.photo ? (
                      <img src={job.photo} alt={job.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center text-3xl flex-shrink-0">
                        {job.type === 'residential' ? '🏠' : '🏢'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 text-base truncate">{job.name}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">📍 {job.address}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-50 text-sky-600 border border-sky-100">
                      📏 {distLabel}
                    </span>
                  </div>

                  {/* Details row */}
                  <div className="px-4 pt-3 pb-2 flex items-center gap-3 flex-wrap">
                    {job.contractorName && (
                      <span className="text-xs font-semibold text-slate-500">🏗️ {job.contractorName}</span>
                    )}
                    {job.contractorId && job.contractorAvgGrade != null && (
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/trade/contractor-reviews/${job.contractorId}`)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition active:scale-95 focus:outline-none"
                        title="View contractor reviews"
                      >
                        <span className="text-amber-400 text-xs leading-none">★</span>
                        <span className="text-xs font-extrabold text-amber-700">{job.contractorAvgGrade.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400">({job.contractorGradeCount})</span>
                      </button>
                    )}
                    {/* Workers badge — always show when workers_no is set */}
                    {te?.workers_no > 0 && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                        👷 {t.workers(te.workers_no)}
                      </span>
                    )}
                    {te?.budgetType === 'amount' && te?.maxAmount && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                        💰 ${te.maxAmount}
                      </span>
                    )}
                    {te?.budgetType === 'hours' && te?.totalHours && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">
                        💰 {te.totalHours}h
                      </span>
                    )}
                    {te?.budgetType === 'hours' && te?.totalHours && hourlyRate && (() => {
                      const workers = te.workers_no > 0 ? te.workers_no : 1;
                      const total   = parseFloat((te.totalHours * hourlyRate * workers).toFixed(2));
                      const formula = workers > 1
                        ? `${workers}w × ${te.totalHours}h × $${hourlyRate} = $${total}`
                        : `${te.totalHours}h × $${hourlyRate} = $${total}`;
                      return (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                          💵 {formula}
                        </span>
                      );
                    })()}
                    {te?.requiredDate && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                        📅 {te.requiredDate.split('-').reverse().slice(0, 2).reverse().join('/')}
                      </span>
                    )}
                    {te?.depositHeld && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✅ Deposit held{te.depositAmount != null ? ` $${te.depositAmount}` : ''}
                      </span>
                    )}
                  </div>

                  {/* Date info + Apply */}
                  <div className="px-4 pb-4 space-y-1.5">
                    {dateInfo ? (
                      <div className="space-y-0.5 text-center">
                        {dateInfo.shifted && (
                          <p className="text-[10px] text-amber-500 font-medium">{t.startAdjusted(dateInfo.start)}</p>
                        )}
                        {dateInfo.isHours ? (
                          <p className="text-[11px] text-sky-600 font-semibold">
                            📅 {dateInfo.start} → {dateInfo.end} &nbsp;·&nbsp; {t.workingDays(dateInfo.range.length)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-amber-600 font-semibold">📅 {dateInfo.start}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-medium text-center">{t.pickDateFirst}</p>
                    )}

                    <button
                      onClick={() => handleApply(job)}
                      disabled={!!applyingId || !dateInfo || alreadyApplied}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.99] bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {alreadyApplied ? (
                        t.applied
                      ) : applyingId === job._id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          {t.applying}
                        </span>
                      ) : (
                        t.apply
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>

      {/* ── Workers count modal ───────────────────────────────────────── */}
      {pendingJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">

            <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-sky-400" />

            <div className="px-6 pt-6 pb-2 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl mx-auto mb-3">👷</div>
              <h3 className="text-base font-extrabold text-slate-800 mb-1">How many workers?</h3>
              <p className="text-xs text-slate-400 mb-3">
                Tell the contractor how many workers you'll bring to <span className="font-semibold text-slate-600">{pendingJob.name}</span>
              </p>

              {/* Slots badge */}
              {(pendingJob.tradeEntry?.workers_no ?? 0) > 0 && (
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700">
                  👷 {pendingJob.tradeEntry.workers_no} slot{pendingJob.tradeEntry.workers_no !== 1 ? 's' : ''} available
                </div>
              )}

              {/* +/- input */}
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => setWorkersCount(w => String(Math.max(1, (parseInt(w) || 1) - 1)))}
                  className="w-11 h-11 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg transition active:scale-95"
                >−</button>
                <input
                  type="number"
                  min="1"
                  max={pendingJob.tradeEntry?.workers_no > 0 ? pendingJob.tradeEntry.workers_no : undefined}
                  value={workersCount}
                  onChange={(e) => { setWorkersCount(e.target.value); setWorkersError(''); }}
                  className="flex-1 text-center text-xl font-extrabold text-slate-800 border-2 border-slate-200 focus:border-sky-400 rounded-xl py-2 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setWorkersCount(w => {
                    const next = (parseInt(w) || 1) + 1;
                    const max  = pendingJob.tradeEntry?.workers_no ?? 0;
                    if (max > 0 && next > max) return w;
                    return String(next);
                  })}
                  className="w-11 h-11 flex-shrink-0 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-lg transition active:scale-95"
                >+</button>
              </div>

              {workersError && (
                <p className="text-xs text-red-500 font-semibold mb-2">{workersError}</p>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-2 mt-3">
              <button
                onClick={handleWorkersConfirm}
                className="flex-1 font-bold py-2.5 rounded-xl text-sm shadow transition-all active:scale-[0.98] bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-white shadow-amber-200"
              >
                Apply for Job →
              </button>
              <button
                onClick={() => setPendingJob(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
