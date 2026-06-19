import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { submitWorkLog } from '../../api/trade.js';
import { toast } from '../../utils/toast.js';

// ── i18n ─────────────────────────────────────────────────────────────────────
const content = {
  en: {
    badge:  '⏱️ Work Log',
    title:  'Actual Working Hours',
    labels: { name: 'Professional', trade: 'Trade', date: 'Date', site: 'Site' },
    status: { idle: 'Not started', running: 'Running…', paused: 'Paused' },
    btn: {
      start:    '▶ Start',
      stop:     '⏹ Stop',
      send:     'Send for Approval',
      sending:  'Sending…',
      cancel:   'Cancel',
      closeRun: 'Close (timer keeps running)',
    },
    noRate:  'No hourly rate set — order sum will be $0.',
    noTime:  'Start the timer first.',
    success: '✅ Work log sent for approval!',
    error:   'Failed to send. Please try again.',
    hours:   (h) => `${h} hr${h !== 1 ? 's' : ''} recorded`,
    bgRunning: '⏱️ Timer running in background',
    toastOk:  (name) => `💵 Payment approval request sent to ${name || 'contractor'}`,
    toastErr: '❌ Failed to send work log. Please try again.',
    minHours: {
      title:       'Minimum Hours Required',
      html:        (min) => `The minimum hours for this job is <strong>${min}h</strong>.<br>Please enter the correct hours below.`,
      inputLabel:  'Corrected hours',
      inputPlaceholder: (min) => `Minimum: ${min}h`,
      confirm:     'Confirm',
      cancel:      'Cancel',
      tooLow:      (min) => `Minimum is ${min} hours`,
      invalid:     'Please enter a valid number',
    },
  },
  es: {
    badge:  '⏱️ Registro de Trabajo',
    title:  'Horas Reales Trabajadas',
    labels: { name: 'Profesional', trade: 'Oficio', date: 'Fecha', site: 'Obra' },
    status: { idle: 'No iniciado', running: 'En curso…', paused: 'Pausado' },
    btn: {
      start:    '▶ Iniciar',
      stop:     '⏹ Detener',
      send:     'Enviar para Aprobación',
      sending:  'Enviando…',
      cancel:   'Cancelar',
      closeRun: 'Cerrar (temporizador activo)',
    },
    noRate:  'Sin tarifa horaria — el total será $0.',
    noTime:  'Primero inicia el temporizador.',
    success: '✅ ¡Registro enviado para aprobación!',
    error:   'Error al enviar. Inténtalo de nuevo.',
    hours:   (h) => `${h} hr${h !== 1 ? 's' : ''} registradas`,
    bgRunning: '⏱️ Temporizador activo en segundo plano',
    toastOk:  (name) => `💵 Solicitud enviada a ${name || 'el contratista'}`,
    toastErr: '❌ Error al enviar el registro. Inténtalo de nuevo.',
    minHours: {
      title:       'Horas Mínimas Requeridas',
      html:        (min) => `Las horas mínimas para este trabajo son <strong>${min}h</strong>.<br>Por favor ingresa las horas correctas.`,
      inputLabel:  'Horas corregidas',
      inputPlaceholder: (min) => `Mínimo: ${min}h`,
      confirm:     'Confirmar',
      cancel:      'Cancelar',
      tooLow:      (min) => `El mínimo es ${min} horas`,
      invalid:     'Por favor ingresa un número válido',
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad2(n) { return String(n).padStart(2, '0'); }
function formatClock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}
function toHours(totalSeconds) {
  return parseFloat((totalSeconds / 3600).toFixed(2));
}
function currentBgSeconds(bgTimer) {
  if (bgTimer.start !== null) {
    return bgTimer.acc + Math.floor((Date.now() - bgTimer.start) / 1000);
  }
  return bgTimer.acc;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorkingHoursModal({
  date,
  siteName,
  siteAddress,
  siteId,
  professionality,
  hourlyRate,
  totalHours,   // minimum hours required for this job (from site tradesNeeded)
  workersNo,    // how many workers this trade pro is bringing
  bgTimerRef,
  timerRunning,
  setTimerRunning,
  onClose,
  onSent,
}) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];
  const user = useAuthStore((s) => s.user);

  const workers = (workersNo && workersNo > 0) ? workersNo : 1;

  // ── Local display interval (recreated on every open) ─────────────────────
  const intervalRef = useRef(null);

  const isSameBooking = bgTimerRef.current.bookingKey === date;
  const [isRunning,      setIsRunning]      = useState(() => isSameBooking && bgTimerRef.current.start !== null);
  const [displaySeconds, setDisplaySeconds] = useState(() => isSameBooking ? currentBgSeconds(bgTimerRef.current) : 0);

  useEffect(() => {
    if (!isSameBooking && bgTimerRef.current.bookingKey !== null) {
      bgTimerRef.current = { acc: 0, start: null, bookingKey: null };
      setTimerRunning(false);
    }
    bgTimerRef.current.bookingKey = date;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isRunning && bgTimerRef.current.start !== null) {
      intervalRef.current = setInterval(() => {
        setDisplaySeconds(currentBgSeconds(bgTimerRef.current));
      }, 500);
    }
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timer controls ────────────────────────────────────────────────────────
  const handleStart = () => {
    if (isRunning) return;
    bgTimerRef.current.start = Date.now();
    bgTimerRef.current.bookingKey = date;
    setIsRunning(true);
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setDisplaySeconds(currentBgSeconds(bgTimerRef.current));
    }, 500);
  };

  const handleStop = async () => {
    if (!isRunning) return;
    clearInterval(intervalRef.current);

    // Commit elapsed seconds
    const elapsed = Math.floor((Date.now() - bgTimerRef.current.start) / 1000);
    bgTimerRef.current.acc  += elapsed;
    bgTimerRef.current.start = null;
    const finalSec   = bgTimerRef.current.acc;
    const finalHours = toHours(finalSec);

    setIsRunning(false);
    setTimerRunning(false);
    setDisplaySeconds(finalSec);

    // ── Minimum-hours guard (SweetAlert2) ─────────────────────────────────
    if (totalHours && finalHours < totalHours) {
      const mh = t.minHours;
      const { value, isConfirmed } = await Swal.fire({
        icon:              'warning',
        title:             mh.title,
        html:              mh.html(totalHours),
        input:             'number',
        inputLabel:        mh.inputLabel,
        inputPlaceholder:  mh.inputPlaceholder(totalHours),
        inputAttributes:   { min: totalHours, step: '0.01', style: 'font-size:1.1rem;text-align:center' },
        confirmButtonText: mh.confirm,
        cancelButtonText:  mh.cancel,
        showCancelButton:  true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor:  '#94a3b8',
        inputValidator: (val) => {
          if (!val || isNaN(Number(val))) return mh.invalid;
          if (Number(val) < totalHours)   return mh.tooLow(totalHours);
        },
      });

      if (isConfirmed && value) {
        // Override the accumulated seconds with the corrected hours
        const correctedSec = Math.round(parseFloat(value) * 3600);
        bgTimerRef.current.acc = correctedSec;
        setDisplaySeconds(correctedSec);
      }
      // If cancelled, keep the recorded time (trade pro can fix and re-stop manually)
    }
  };

  const handleClose = () => {
    clearInterval(intervalRef.current);
    onClose();
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState('');

  const handleSend = async () => {
    if (displaySeconds === 0) { setResult(t.noTime); return; }
    if (isRunning) handleStop();
    const finalSec = bgTimerRef.current.acc;
    setSending(true);
    setResult('');
    try {
      const res = await submitWorkLog({
        siteId,
        date,
        totalSeconds: finalSec,
        workers_no:   workers,   // server multiplies into order_sum
      });
      setResult(t.success);
      bgTimerRef.current = { acc: 0, start: null, bookingKey: null };
      setTimerRunning(false);
      onSent?.();
      toast.success(t.toastOk(res?.contractorName), { duration: 5000 });
      setTimeout(onClose, 2200);
    } catch {
      setResult(t.error);
      toast.error(t.toastErr, { duration: 4000 });
    } finally {
      setSending(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const hasTime      = displaySeconds > 0;
  const sent         = result === t.success;
  const statusText   = isRunning ? t.status.running : (hasTime ? t.status.paused : t.status.idle);
  const hoursFloat   = toHours(displaySeconds);

  // Effective rate = workers × hourlyRate; total = hours × effectiveRate
  const effectiveRate = hourlyRate ? hourlyRate * workers : null;
  const orderSum      = effectiveRate ? (hoursFloat * effectiveRate).toFixed(2) : null;

  // Visual state
  const ringColor  = isRunning ? 'ring-violet-400 shadow-violet-100'
                   : hasTime   ? 'ring-amber-400  shadow-amber-100'
                               : 'ring-slate-200  shadow-transparent';
  const bgColor    = isRunning ? 'bg-violet-50' : hasTime ? 'bg-amber-50' : 'bg-slate-50';
  const numColor   = isRunning ? 'text-violet-700' : hasTime ? 'text-amber-700' : 'text-slate-400';
  const badgeColor = isRunning ? 'bg-violet-100 text-violet-600 border-violet-200'
                   : hasTime   ? 'bg-amber-100  text-amber-600  border-amber-200'
                               : 'bg-slate-100  text-slate-400  border-slate-200';

  // Below-minimum warning (after stop, before send)
  const belowMin = !isRunning && hasTime && totalHours && hoursFloat < totalHours;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-sky-400 to-amber-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
              {t.badge}
            </span>
            <h2 className="text-sm font-extrabold text-slate-800">{t.title}</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition text-base leading-none flex-shrink-0"
          >×</button>
        </div>

        {/* Info row */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-0.5">
          <span className="text-[11px] text-slate-500"><span className="font-bold text-slate-400">Site</span> {siteName}</span>
          <span className="text-[11px] text-slate-500"><span className="font-bold text-slate-400">Date</span> {date}</span>
          {professionality && <span className="text-[11px] text-slate-500"><span className="font-bold text-slate-400">Trade</span> {professionality}</span>}
          {totalHours && (
            <span className="text-[11px] font-semibold text-violet-600">
              <span className="font-bold text-slate-400">Min</span> {totalHours}h required
            </span>
          )}
        </div>

        {/* Clock + status */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-4">
          {/* Clock circle */}
          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center ring-4 ring-offset-2 shadow-md transition-all duration-300 flex-shrink-0 ${ringColor} ${bgColor}`}>
            {isRunning && (
              <div className="absolute inset-0 rounded-full ring-4 ring-violet-300 animate-ping opacity-30" />
            )}
            <div className="relative flex flex-col items-center">
              <span className={`font-mono font-extrabold text-lg tracking-widest leading-none transition-colors duration-300 ${numColor}`}>
                {formatClock(displaySeconds)}
              </span>
              {hasTime && (
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  {t.hours(hoursFloat)}
                </span>
              )}
            </div>
          </div>

          {/* Right side: status + cost breakdown */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColor}`}>
              {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
              {statusText}
            </div>

            {isRunning && (
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-600">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse flex-shrink-0" />
                {t.bgRunning}
              </div>
            )}

            {/* Workers × rate line */}
            {hourlyRate && workers > 1 && (
              <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                👷 {workers} workers × ${hourlyRate}/hr
                <span className="text-slate-400 ml-1">= <span className="font-bold text-slate-700">${effectiveRate?.toFixed(2)}/hr</span></span>
              </div>
            )}

            {/* Total cost */}
            {hasTime && orderSum !== null && (
              <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                💰 <span className="font-extrabold">${orderSum}</span>
                <span className="text-emerald-500 font-normal ml-1">
                  ({hoursFloat}h × {workers > 1 ? `${workers} × ` : ''}${hourlyRate}/hr)
                </span>
              </div>
            )}
            {!hourlyRate && <p className="text-[10px] text-slate-400">{t.noRate}</p>}

            {/* Below-minimum warning */}
            {belowMin && (
              <div className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                ⚠️ Min {totalHours}h — recorded {hoursFloat}h
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="px-4 pb-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleStart} disabled={isRunning || sent}
              className="flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow shadow-emerald-200 transition-all active:scale-95">
              {t.btn.start}
            </button>
            <button onClick={handleStop} disabled={!isRunning}
              className="flex items-center justify-center gap-1 py-2 rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow shadow-red-200 transition-all active:scale-95">
              {t.btn.stop}
            </button>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !hasTime || isRunning || sent || belowMin}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-sky-400 hover:from-violet-400 hover:to-sky-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow shadow-violet-200 transition-all active:scale-[0.99]"
          >
            {sending ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t.btn.sending}</>
            ) : (
              <>✅ {t.btn.send}</>
            )}
          </button>

          {result && (
            <div className={`rounded-xl px-3 py-2 text-xs font-semibold text-center border ${
              sent ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {result}
            </div>
          )}

          {!sent && (
            <button onClick={handleClose}
              className={`w-full py-2 rounded-xl border font-medium text-xs transition text-center ${
                isRunning
                  ? 'border-violet-200 text-violet-500 hover:bg-violet-50 bg-violet-50/50'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>
              {isRunning ? t.btn.closeRun : t.btn.cancel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
