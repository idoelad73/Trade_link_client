import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useUIStore from '../../stores/uiStore.js';
import RateCommentModal from '../../components/shared/RateCommentModal.jsx';
import { getJobDateInfo, appliedJobIds } from '../../utils/jobDates.js';

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
    rateComment:   'Rate comments from the contractor',
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
    rateComment:   'Comentarios de tarifa del contratista',
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

  // Read-only rate explanation written by the contractor — { tradeName, text }
  const [rateCommentView, setRateCommentView] = useState(null);

  // Apply opens the full project details page; the apply flow runs from there
  const openJob = (job) => navigate(`/dashboard/trade/jobs/${job._id}`, {
    state: { job, trade: jobTrade, hourlyRate, unit },
  });

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
              const alreadyApplied = appliedJobIds.has(String(job._id));

              const dateInfo = getJobDateInfo(te);

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

                  {/* Contractor's explanation of the rate — shown on the card;
                      tap to read it in full. Hidden when nothing was written. */}
                  {te?.rateComment?.trim() && (
                    <button
                      type="button"
                      onClick={() => setRateCommentView({ tradeName: te.name ?? jobTrade, text: te.rateComment })}
                      className="mx-4 mb-3 w-[calc(100%-2rem)] text-left bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-xl px-3 py-2 transition"
                    >
                      <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-0.5">💬 {t.rateComment}</p>
                      <p className="text-xs text-amber-800 line-clamp-2 whitespace-pre-wrap break-words">{te.rateComment}</p>
                    </button>
                  )}

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
                      onClick={() => openJob(job)}
                      disabled={alreadyApplied}
                      className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.99] bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {alreadyApplied ? t.applied : t.apply}
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>

      {/* Read-only rate explanation, opened from a job card's 💬 */}
      {rateCommentView && (
        <RateCommentModal
          tradeName={rateCommentView.tradeName}
          value={rateCommentView.text}
          readOnly
          onClose={() => setRateCommentView(null)}
        />
      )}
    </div>
  );
}
