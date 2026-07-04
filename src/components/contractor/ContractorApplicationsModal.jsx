import { useState, useEffect } from 'react';
import { getApplications, approveApplication, approveWorkerOffer, approveReschedule, declineReschedule } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';
import { toast } from '../../utils/toast.js';
import DepositSummaryModal from './DepositSummaryModal.jsx';

const content = {
  en: {
    badge:       '📬 Job Applications',
    title:       'Trade Applications',
    empty:       'No applications yet.',
    loading:     'Loading applications…',
    from:        'Applicant',
    site:        'Project',
    rate:        'Rate',
    status:        { pending: 'Pending', accepted: 'Accepted ✓' },
    approve:       '✓ Approve',
    approving:     '…',
    close:         'Close',
    applied:        'Applied',
    proposedDate:   'Proposed date',
    approvedToast:   (name) => `✅ Approval sent to ${name}`,
    alreadyAssigned: 'That trade already booked for that date',
  },
  es: {
    badge:       '📬 Solicitudes de Trabajo',
    title:       'Solicitudes de Profesionales',
    empty:       'No hay solicitudes aún.',
    loading:     'Cargando solicitudes…',
    from:        'Solicitante',
    site:        'Proyecto',
    rate:        'Tarifa',
    status:        { pending: 'Pendiente', accepted: 'Aceptado ✓' },
    approve:       '✓ Aprobar',
    approving:     '…',
    close:         'Cerrar',
    applied:        'Aplicó',
    proposedDate:   'Fecha propuesta',
    approvedToast:   (name) => `✅ Aprobación enviada a ${name}`,
    alreadyAssigned: 'Ese profesional ya está reservado para esa fecha',
  },
};

export default function ContractorApplicationsModal({ onClose, onApproved }) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [applications,  setApplications]  = useState([]);
  const [reschedules,   setReschedules]   = useState([]);
  const [workerOffers,  setWorkerOffers]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [approving,        setApproving]        = useState(null);
  const [approvingOffer,   setApprovingOffer]   = useState(null);
  const [actingReschedule, setActingReschedule] = useState(null);
  const [depositData,      setDepositData]      = useState(null); // direct-search deposit after worker offer approval

  useEffect(() => {
    getApplications()
      .then(({ applications: apps = [], reschedules: resc = [], workerOffers: offers = [] }) => {
        setApplications(apps);
        setReschedules(resc);
        setWorkerOffers(offers);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleApprove = async (app) => {
    if (approving) return;
    setApproving(app._id);
    try {
      const { blockedApplicationIds = [], slotsRemaining, siteId } = await approveApplication(app._id, undefined);

      const blockedSet = new Set(blockedApplicationIds);
      setApplications((prev) =>
        prev.map((a) => {
          if (a._id === app._id)             return { ...a, status: 'accepted' };
          if (blockedSet.has(String(a._id))) return { ...a, _alreadyBooked: true };
          return a;
        })
      );
      toast.success(t.approvedToast(app.tradePro?.fullName ?? ''));
      onApproved?.();
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.alreadyAssigned) {
        toast.error(t.alreadyAssigned, { duration: 4000 });
      } else {
        console.error(err);
      }
    } finally {
      setApproving(null);
    }
  };


  const tradeEntry = (app) => app.site?.tradesNeeded?.find(
    (t) => t.name?.toLowerCase() === app.tradePro?.professionality?.toLowerCase()
  );

  return (
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[95dvh] sm:max-h-[90vh] flex flex-col mx-2 sm:mx-0">

        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-sky-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 mb-2">
              {t.badge}
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg"
          >×</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : applications.length === 0 && reschedules.length === 0 && workerOffers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">{t.empty}</div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const te = tradeEntry(app);
                return (
                  <div key={app._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">

                    {/* Trade pro header */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-50">
                      {app.tradePro?.photo ? (
                        <img src={app.tradePro.photo} alt={app.tradePro.fullName} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-50 to-amber-50 flex items-center justify-center text-2xl flex-shrink-0">🔧</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm truncate">{app.tradePro?.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">🏗️ {app.tradePro?.professionality}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        app.status === 'accepted'
                          ? 'bg-green-100 text-green-600 border border-green-200'
                          : 'bg-amber-100 text-amber-600 border border-amber-200'
                      }`}>
                        {t.status[app.status] ?? app.status}
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">

                      {/* Site */}
                      <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide mb-0.5">{t.site}</p>
                        <p className="text-xs font-bold text-sky-700 truncate">🏠 {app.site?.name}</p>
                        <p className="text-[10px] text-sky-500 truncate mt-0.5">📍 {app.site?.address}</p>
                      </div>

                      {/* Workers offered */}
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide mb-0.5">Workers</p>
                        <p className="text-xs font-bold text-amber-700">
                          👷 {app.workersOffered ?? 1} worker{(app.workersOffered ?? 1) !== 1 ? 's' : ''}
                        </p>
                        {te?.workers_no > 0 && (
                          <p className="text-[10px] text-amber-500 mt-0.5">
                            of {te.workers_no} slot{te.workers_no !== 1 ? 's' : ''} needed
                          </p>
                        )}
                      </div>

                      {/* Rate + cost estimate */}
                      {(app.tradePro?.hourlyRate || (te?.budgetType === 'amount' && te?.maxAmount)) && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 sm:col-span-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t.rate}</p>
                          <p className="text-xs font-bold text-slate-700">
                            {app.tradePro?.hourlyRate ? `💰 $${app.tradePro.hourlyRate}/hr` : '—'}
                          </p>
                          {te?.budgetType === 'hours' && te?.totalHours && app.tradePro?.hourlyRate && (() => {
                            const w     = app.workersOffered ?? 1;
                            const total = parseFloat((w * te.totalHours * app.tradePro.hourlyRate).toFixed(2));
                            return (
                              <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                                {w > 1
                                  ? `${w}w × ${te.totalHours}h × $${app.tradePro.hourlyRate} = $${total}`
                                  : `${te.totalHours}h × $${app.tradePro.hourlyRate} = $${total}`}
                              </p>
                            );
                          })()}
                          {te?.budgetType === 'amount' && te?.maxAmount && (
                            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Budget: ${te.maxAmount}</p>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="px-4 pb-2 text-[10px] text-slate-300">
                      {t.applied} {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>

                    {/* Accept flow */}
                    {(app.status === 'pending' || app._alreadyBooked) && (() => {
                      // _alreadyBooked: flagged by server on load OR set client-side after in-session approval
                      const taskTaken = !!app._alreadyBooked;
                      return (
                        <div className="px-4 pb-4 space-y-2">
                          {app.scheduledDate && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-50 border border-sky-100">
                              <span className="text-sky-500 text-sm">📅</span>
                              <div>
                                <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide">{t.proposedDate}</p>
                                <p className="text-xs font-bold text-sky-700">{app.scheduledDate}</p>
                              </div>
                            </div>
                          )}
                          {taskTaken ? (
                            <div className="w-full py-2 px-3 rounded-xl text-xs font-bold text-center text-slate-400 bg-slate-100 border border-slate-200">
                              🔒 {t.alreadyAssigned}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleApprove(app)}
                              disabled={!!approving}
                              className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
                            >
                              {approving === app._id ? t.approving : t.approve}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Worker offers awaiting approval ──────────────────────────── */}
          {workerOffers.length > 0 && (
            <div className={`${applications.length > 0 ? 'mt-5' : ''} space-y-3`}>
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wide px-1">
                👷 Worker Offers — Pending Approval
              </p>
              {workerOffers.map((offer) => {
                const tradeSlot   = offer.site?.tradesNeeded?.find(
                  (tr) => tr.name?.toLowerCase() === (offer.tradeName || offer.tradePro?.professionality || '').toLowerCase()
                );
                const totalNeeded = tradeSlot?.workers_no ?? null;
                const isDirect    = !offer.site;
                // Total hours: site-based uses tradeSlot, direct-search uses offer.totalHours
                const totalHours  = tradeSlot?.totalHours ?? offer.totalHours ?? null;
                const rate        = offer.tradePro?.hourlyRate ?? null;
                const workers     = offer.workersOffered ?? 1;
                const deposit     = (rate && totalHours)
                  ? parseFloat((workers * rate * totalHours).toFixed(2))
                  : null;

                return (
                  <div key={offer._id} className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-amber-400" />
                    {/* Trade pro header */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-50">
                      {offer.tradePro?.photo
                        ? <img src={offer.tradePro.photo} alt={offer.tradePro.fullName} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                        : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-xl flex-shrink-0">👷</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm truncate">{offer.tradePro?.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">🔧 {offer.tradePro?.professionality}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 border border-orange-200 whitespace-nowrap">
                        ⏳ Pending
                      </span>
                    </div>

                    {/* Details grid */}
                    <div className="px-4 py-3 grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                          {isDirect ? 'Quick Search' : 'Project'}
                        </p>
                        <p className="text-xs font-bold text-slate-700 truncate">
                          {isDirect ? '🔍 Direct Request' : `🏗️ ${offer.site?.name}`}
                        </p>
                      </div>
                      <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-wide mb-0.5">Scheduled Date</p>
                        <p className="text-xs font-bold text-orange-700">📅 {offer.requestedDate}</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                        <p className="text-[10px] font-semibold text-amber-500 uppercase tracking-wide mb-0.5">Workers Offered</p>
                        <p className="text-sm font-extrabold text-amber-700">👷 {workers}</p>
                      </div>
                      {totalNeeded != null && (
                        <div className="bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wide mb-0.5">Total Needed</p>
                          <p className="text-sm font-extrabold text-sky-700">👥 {totalNeeded}</p>
                        </div>
                      )}
                      {totalHours != null && (
                        <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide mb-0.5">Total Hours</p>
                          <p className="text-sm font-extrabold text-violet-700">⏱ {totalHours}h</p>
                        </div>
                      )}
                      {rate != null && (
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Hourly Rate</p>
                          <p className="text-sm font-extrabold text-slate-700">💵 ${rate}/hr</p>
                        </div>
                      )}
                    </div>

                    {/* Total job cost breakdown */}
                    {deposit != null && (
                      <div className="mx-4 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                        <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mb-1">Total Job Cost</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5">👷 {workers}w</span>
                          <span className="text-[10px] text-slate-400">×</span>
                          <span className="text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-2 py-0.5">⏱ {totalHours}h</span>
                          <span className="text-[10px] text-slate-400">×</span>
                          <span className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-2 py-0.5">💵 ${rate}/hr</span>
                          <span className="text-[10px] text-slate-400">=</span>
                          <span className="text-sm font-extrabold text-emerald-700">${deposit.toFixed(2)}</span>
                        </div>
                        {isDirect && (
                          <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                            🔒 A refundable deposit will be required after approval.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Approve button */}
                    <div className="px-4 pb-4">
                      <button
                        onClick={async () => {
                          setApprovingOffer(offer._id);
                          try {
                            const result = await approveWorkerOffer(offer._id);
                            console.log('[approveWorkerOffer] response:', result);
                            setWorkerOffers((prev) => prev.filter((o) => o._id !== offer._id));
                            toast.success(`✅ ${offer.tradePro?.fullName} — ${workers} worker${workers !== 1 ? 's' : ''} confirmed`);
                            onApproved?.();
                            // Direct search with deposit required → show deposit flow immediately
                            if (isDirect && result.minDeposit > 0) {
                              setDepositData({
                                messageId: result.messageId,
                                siteName:  offer.tradePro?.fullName ?? 'Direct Request',
                                total:     result.minDeposit,
                                rows: [{
                                  messageId:       result.messageId,
                                  tradeProName:    offer.tradePro?.fullName ?? '—',
                                  professionality: offer.tradePro?.professionality ?? '—',
                                  min_deposit:     result.minDeposit,
                                  workers,
                                  hourlyRate:      rate,
                                  totalHours,
                                }],
                              });
                            }
                          } catch (err) {
                            toast.error('Failed to approve. Please try again.');
                          } finally {
                            setApprovingOffer(null);
                          }
                        }}
                        disabled={!!approvingOffer}
                        className="w-full py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-400 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm active:scale-[0.98]"
                      >
                        {approvingOffer === offer._id ? '…' : `✓ Approve ${workers} Worker${workers !== 1 ? 's' : ''}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Reschedule requests from trade pros ──────────────────────── */}
          {reschedules.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-bold text-violet-500 uppercase tracking-wide px-1">
                📅 Reschedule Requests
              </p>
              {reschedules.map((msg) => (
                <div key={msg._id} className="bg-white rounded-2xl border border-violet-200 shadow-sm overflow-hidden">
                  <div className="h-1 w-full bg-gradient-to-r from-violet-400 to-sky-400" />
                  {/* Trade pro info */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-50">
                    {msg.tradePro?.photo
                      ? <img src={msg.tradePro.photo} alt={msg.tradePro.fullName} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                      : <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-50 to-sky-50 flex items-center justify-center text-xl flex-shrink-0">🔧</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 text-sm truncate">{msg.tradePro?.fullName}</p>
                      <p className="text-xs text-slate-400 truncate">🔧 {msg.tradePro?.professionality}</p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-600 border border-violet-200">
                      Reschedule
                    </span>
                  </div>
                  {/* Details */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Project</p>
                      <p className="text-xs font-bold text-slate-700 truncate">🏗️ {msg.site?.name}</p>
                    </div>
                    <div className="bg-violet-50 border border-violet-100 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide mb-0.5">Requested Date</p>
                      <p className="text-xs font-bold text-violet-700">📅 {msg.requestedDate}</p>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="px-4 pb-4 flex gap-2">
                    <button
                      onClick={async () => {
                        setActingReschedule(msg._id + '_approve');
                        try {
                          await approveReschedule(msg._id);
                          setReschedules(prev => prev.filter(m => m._id !== msg._id));
                          toast.success(`✅ Schedule updated for ${msg.tradePro?.fullName}`);
                          onApproved?.();
                        } catch { toast.error('Error'); }
                        finally { setActingReschedule(null); }
                      }}
                      disabled={!!actingReschedule}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 transition shadow-sm"
                    >
                      {actingReschedule === msg._id + '_approve' ? '…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={async () => {
                        setActingReschedule(msg._id + '_decline');
                        try {
                          await declineReschedule(msg._id);
                          setReschedules(prev => prev.filter(m => m._id !== msg._id));
                          toast.success('Request declined');
                        } catch { toast.error('Error'); }
                        finally { setActingReschedule(null); }
                      }}
                      disabled={!!actingReschedule}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 transition"
                    >
                      {actingReschedule === msg._id + '_decline' ? '…' : '✕ Decline'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>

    {/* ── Direct-search deposit modal (shown after worker offer approval) ── */}
    {depositData && (
      <DepositSummaryModal
        messageId={depositData.messageId}
        siteName={depositData.siteName}
        rows={depositData.rows}
        total={depositData.total}
        onClose={() => setDepositData(null)}
        onSuccess={() => { setDepositData(null); onApproved?.(); }}
      />
    )}
    </>
  );
}
