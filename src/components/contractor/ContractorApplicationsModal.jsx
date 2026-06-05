import { useState, useEffect } from 'react';
import { getApplications, approveApplication } from '../../api/contractor.js';
import useUIStore from '../../stores/uiStore.js';
import { toast } from '../../utils/toast.js';

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
  const [loading,       setLoading]       = useState(true);
  const [approving,     setApproving]     = useState(null);

  useEffect(() => {
    getApplications()
      .then(setApplications)
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
      const { blockedApplicationIds = [] } = await approveApplication(app._id, undefined);

      // Mark approved app as accepted; gray out all sibling IDs returned by server
      const blockedSet = new Set(blockedApplicationIds);
      setApplications((prev) =>
        prev.map((a) => {
          if (a._id === app._id)         return { ...a, status: 'accepted' };
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
          ) : applications.length === 0 ? (
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

                      {/* Rate */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t.rate}</p>
                        <p className="text-xs font-bold text-slate-700">
                          {app.tradePro?.hourlyRate ? `💰 $${app.tradePro.hourlyRate}/hr` : '—'}
                        </p>
                        {te && te.budgetType === 'hours' && te.totalHours && app.tradePro?.hourlyRate && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                            {te.totalHours}h × ${app.tradePro.hourlyRate} = ${te.totalHours * app.tradePro.hourlyRate}
                          </p>
                        )}
                        {te && te.budgetType === 'amount' && te.maxAmount && (
                          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Budget: ${te.maxAmount}</p>
                        )}
                      </div>
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
  );
}
