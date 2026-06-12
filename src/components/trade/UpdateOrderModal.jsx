import { useState, useEffect, useRef } from 'react';
import { submitWorkLog } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';

// ── i18n ──────────────────────────────────────────────────────────────────────
const content = {
  en: {
    title:       'Update Work Order',
    badge:       '🔄 Resubmit Hours',
    infoTitle:   'Job Details',
    labels: {
      site:      'Site',
      address:   'Address',
      date:      'Work Date',
      hours:     'Hours Worked',
      hoursHint: 'Enter the actual hours you worked (e.g. 2.5)',
      preview:   'Order Preview',
      rate:      '/hr',
    },
    preview: {
      hours:     'Hours',
      rate:      'Rate',
      total:     'Estimated Total',
      noRate:    'Rate not set',
    },
    btn: {
      send:    'Send for Approval',
      sending: 'Sending…',
      cancel:  'Cancel',
    },
    success: 'Order submitted! Waiting for contractor approval.',
    error:   'Failed to submit. Please try again.',
    validation: {
      required: 'Please enter the hours worked.',
      positive: 'Hours must be greater than 0.',
      max:      'Hours cannot exceed 24.',
    },
  },
  es: {
    title:       'Actualizar Orden de Trabajo',
    badge:       '🔄 Reenviar Horas',
    infoTitle:   'Detalles del Trabajo',
    labels: {
      site:      'Obra',
      address:   'Dirección',
      date:      'Fecha de Trabajo',
      hours:     'Horas Trabajadas',
      hoursHint: 'Ingresa las horas reales trabajadas (ej: 2.5)',
      preview:   'Vista Previa',
      rate:      '/hr',
    },
    preview: {
      hours:     'Horas',
      rate:      'Tarifa',
      total:     'Total Estimado',
      noRate:    'Sin tarifa',
    },
    btn: {
      send:    'Enviar para Aprobación',
      sending: 'Enviando…',
      cancel:  'Cancelar',
    },
    success: '¡Orden enviada! Esperando aprobación del contratista.',
    error:   'Error al enviar. Inténtalo de nuevo.',
    validation: {
      required: 'Por favor ingresa las horas trabajadas.',
      positive: 'Las horas deben ser mayores a 0.',
      max:      'Las horas no pueden superar 24.',
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 leading-snug">{value || '—'}</p>
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export default function UpdateOrderModal({
  siteId,
  siteName,
  siteAddress,
  date,
  hourlyRate,
  onClose,
  onSent,
}) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const [hours,    setHours]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [valErr,   setValErr]   = useState('');
  const [apiError, setApiError] = useState('');
  const [success,  setSuccess]  = useState(false);
  const inputRef = useRef();

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const hoursFloat   = parseFloat(hours) || 0;
  const estimatedSum = hourlyRate && hoursFloat > 0
    ? (hoursFloat * hourlyRate).toFixed(2)
    : null;

  const validate = () => {
    if (!hours || hours === '') { setValErr(t.validation.required); return false; }
    if (hoursFloat <= 0)        { setValErr(t.validation.positive); return false; }
    if (hoursFloat > 24)        { setValErr(t.validation.max);      return false; }
    setValErr('');
    return true;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    setApiError('');
    try {
      // Reuse existing submitWorkLog — convert manual hours to seconds
      const totalSeconds = Math.round(hoursFloat * 3600);
      await submitWorkLog({ siteId, date, totalSeconds });
      setSuccess(true);
      setTimeout(() => { onSent?.(); onClose(); }, 1600);
    } catch {
      setApiError(t.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 via-sky-400 to-emerald-400 flex-shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 mb-2">
              {t.badge}
            </span>
            <h2 className="text-lg font-extrabold text-slate-800 leading-tight">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition text-lg mt-0.5 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5 overflow-y-auto">

          {/* Job info card */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.infoTitle}</p>
            <InfoRow icon="🏗️" label={t.labels.site}    value={siteName} />
            {siteAddress && <InfoRow icon="📍" label={t.labels.address} value={siteAddress} />}
            <InfoRow icon="📅" label={t.labels.date}    value={date} />
          </div>

          {/* Hours input */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              {t.labels.hours}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="number"
                min="0"
                max="24"
                step="0.25"
                value={hours}
                onChange={(e) => { setHours(e.target.value); setValErr(''); setApiError(''); }}
                placeholder="0.00"
                className={`w-full rounded-2xl border px-4 py-3.5 pr-14 text-2xl font-extrabold text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 transition ${
                  valErr
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-slate-200 focus:ring-violet-200 focus:border-violet-300'
                }`}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 pointer-events-none">
                hrs
              </span>
            </div>
            {valErr && (
              <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center gap-1">
                <span>⚠️</span>{valErr}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-1.5">{t.labels.hoursHint}</p>
          </div>

          {/* Order preview */}
          <div className={`rounded-2xl border p-4 transition-all ${
            hoursFloat > 0
              ? 'bg-gradient-to-br from-emerald-50 to-sky-50 border-emerald-200'
              : 'bg-slate-50 border-slate-100 opacity-60'
          }`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{t.labels.preview}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Hours */}
              <div>
                <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{t.preview.hours}</p>
                <p className="text-lg font-extrabold text-violet-600">
                  {hoursFloat > 0 ? hoursFloat : '—'}
                  {hoursFloat > 0 && <span className="text-xs font-normal text-slate-400 ml-0.5">hr</span>}
                </p>
              </div>
              {/* Rate */}
              <div>
                <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{t.preview.rate}</p>
                {hourlyRate
                  ? <p className="text-lg font-extrabold text-sky-600">${hourlyRate}<span className="text-xs font-normal text-slate-400">/hr</span></p>
                  : <p className="text-sm text-slate-400">{t.preview.noRate}</p>
                }
              </div>
              {/* Total */}
              <div>
                <p className="text-[10px] text-slate-400 font-semibold mb-0.5">{t.preview.total}</p>
                {estimatedSum
                  ? <p className="text-lg font-extrabold text-emerald-600">${estimatedSum}</p>
                  : <p className="text-sm text-slate-400">—</p>
                }
              </div>
            </div>
          </div>

          {/* Success banner */}
          {success && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700">
              <span className="text-lg">✅</span>
              {t.success}
            </div>
          )}

          {/* API error */}
          {apiError && !success && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium">
              {apiError}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSend}
              disabled={sending || success}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-400 hover:to-sky-400 disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl shadow shadow-violet-200 transition-all active:scale-[0.98] text-sm"
            >
              {sending ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t.btn.sending}
                </>
              ) : success ? (
                <>✅ {t.success.split('!')[0]}!</>
              ) : (
                <>
                  <span>📨</span>
                  {t.btn.send}
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={sending}
              className="px-5 py-3.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-sm transition"
            >
              {t.btn.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
