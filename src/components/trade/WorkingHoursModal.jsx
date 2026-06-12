import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../stores/authStore.js';
import useUIStore from '../../stores/uiStore.js';
import { submitWorkLog } from '../../api/trade.js';

// ── i18n ─────────────────────────────────────────────────────────────────────
const content = {
  en: {
    badge:  '⏱️ Work Log',
    title:  'Actual Working Hours',
    labels: { name: 'Professional', trade: 'Trade', date: 'Date', site: 'Site', address: 'Address' },
    status: { idle: 'Not started', running: 'Running…', paused: 'Paused' },
    btn: {
      start:    '▶ Start',
      stop:     '⏹ Stop',
      send:     'Send for Approval',
      sending:  'Sending…',
      cancel:   'Cancel',
      closeRun: 'Close (timer keeps running)',
    },
    noRate:   'No hourly rate set — order sum will be $0.',
    noTime:   'Start the timer first.',
    success:  '✅ Work log sent for approval!',
    error:    'Failed to send. Please try again.',
    hours:    (h) => `${h} hr${h !== 1 ? 's' : ''} recorded`,
    bgRunning: '⏱️ Timer running in background',
  },
  es: {
    badge:  '⏱️ Registro de Trabajo',
    title:  'Horas Reales Trabajadas',
    labels: { name: 'Profesional', trade: 'Oficio', date: 'Fecha', site: 'Obra', address: 'Dirección' },
    status: { idle: 'No iniciado', running: 'En curso…', paused: 'Pausado' },
    btn: {
      start:    '▶ Iniciar',
      stop:     '⏹ Detener',
      send:     'Enviar para Aprobación',
      sending:  'Enviando…',
      cancel:   'Cancelar',
      closeRun: 'Cerrar (temporizador activo)',
    },
    noRate:   'Sin tarifa horaria — el total será $0.',
    noTime:   'Primero inicia el temporizador.',
    success:  '✅ ¡Registro enviado para aprobación!',
    error:    'Error al enviar. Inténtalo de nuevo.',
    hours:    (h) => `${h} hr${h !== 1 ? 's' : ''} registradas`,
    bgRunning: '⏱️ Temporizador activo en segundo plano',
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
  // Background timer shared with TradeSchedule so state survives close/reopen
  bgTimerRef,         // { acc, start, bookingKey }
  timerRunning,       // boolean (for icon pulse in parent)
  setTimerRunning,    // (bool) => void
  onClose,
  onSent,             // called after successful submission — parent can disable clock
}) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];
  const user = useAuthStore((s) => s.user);

  // ── Local display interval (recreated on every open) ─────────────────────
  const intervalRef = useRef(null);

  // On open: resume from bgTimerRef if this booking is active, else start fresh
  const isSameBooking = bgTimerRef.current.bookingKey === date;
  const [isRunning,      setIsRunning]      = useState(() => isSameBooking && bgTimerRef.current.start !== null);
  const [displaySeconds, setDisplaySeconds] = useState(() => isSameBooking ? currentBgSeconds(bgTimerRef.current) : 0);

  // If bgTimerRef belongs to a different booking, reset it silently on open
  useEffect(() => {
    if (!isSameBooking && bgTimerRef.current.bookingKey !== null) {
      // Stop any running timer for the other booking before opening this one
      bgTimerRef.current = { acc: 0, start: null, bookingKey: null };
      setTimerRunning(false);
    }
    bgTimerRef.current.bookingKey = date;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start display interval if we opened while timer was already running
  useEffect(() => {
    if (isRunning && bgTimerRef.current.start !== null) {
      intervalRef.current = setInterval(() => {
        setDisplaySeconds(currentBgSeconds(bgTimerRef.current));
      }, 500);
    }
    return () => clearInterval(intervalRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape: close modal — if running, leave timer in background
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

  const handleStop = () => {
    if (!isRunning) return;
    clearInterval(intervalRef.current);
    // Commit elapsed seconds to accumulated total
    const elapsed = Math.floor((Date.now() - bgTimerRef.current.start) / 1000);
    bgTimerRef.current.acc  += elapsed;
    bgTimerRef.current.start = null;
    setDisplaySeconds(bgTimerRef.current.acc);
    setIsRunning(false);
    setTimerRunning(false);
  };

  // Close: if timer is running, leave it in the background (bgTimerRef.start stays set)
  const handleClose = () => {
    clearInterval(intervalRef.current); // stop the display interval
    // timerRunning stays true — clock icon in parent keeps pulsing
    onClose();
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [result,  setResult]  = useState('');

  const handleSend = async () => {
    if (displaySeconds === 0) { setResult(t.noTime); return; }
    // Auto-stop if still running
    if (isRunning) handleStop();
    const finalSec = bgTimerRef.current.acc;
    setSending(true);
    setResult('');
    try {
      await submitWorkLog({ siteId, date, totalSeconds: finalSec });
      setResult(t.success);
      // Reset background timer after successful send
      bgTimerRef.current = { acc: 0, start: null, bookingKey: null };
      setTimerRunning(false);
      onSent?.();        // tell parent to disable the clock icon
      setTimeout(onClose, 2200);
    } catch {
      setResult(t.error);
    } finally {
      setSending(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const hasTime     = displaySeconds > 0;
  const sent        = result === t.success;
  const statusText  = isRunning ? t.status.running : (hasTime ? t.status.paused : t.status.idle);
  const hoursFloat  = toHours(displaySeconds);
  const orderSum    = hourlyRate ? (hoursFloat * hourlyRate).toFixed(2) : null;

  const ringColor = isRunning ? 'ring-violet-400 shadow-violet-100'
                  : hasTime   ? 'ring-amber-400  shadow-amber-100'
                              : 'ring-slate-200  shadow-transparent';
  const bgColor   = isRunning ? 'bg-violet-50' : hasTime ? 'bg-amber-50' : 'bg-slate-50';
  const numColor  = isRunning ? 'text-violet-700' : hasTime ? 'text-amber-700' : 'text-slate-400';
  const badgeColor = isRunning ? 'bg-violet-100 text-violet-600 border-violet-200'
                   : hasTime   ? 'bg-amber-100  text-amber-600  border-amber-200'
                               : 'bg-slate-100  text-slate-400  border-slate-200';

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
          {/* × always enabled — timer keeps running in background */}
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition text-base leading-none flex-shrink-0"
          >×</button>
        </div>

        {/* Info card — compact single line */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-x-4 gap-y-0.5">
          <span className="text-[11px] text-slate-500"><span className="font-bold text-slate-400">Site</span> {siteName}</span>
          <span className="text-[11px] text-slate-500"><span className="font-bold text-slate-400">Date</span> {date}</span>
          {professionality && <span className="text-[11px] text-slate-500"><span className="font-bold text-slate-400">Trade</span> {professionality}</span>}
        </div>

        {/* Clock + status row */}
        <div className="px-4 pt-3 pb-2 flex items-center gap-4">
          {/* Clock circle — smaller */}
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

          {/* Right side: status + estimated sum */}
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

            {hasTime && orderSum !== null && (
              <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                💰 <span className="font-extrabold">${orderSum}</span>
                <span className="text-emerald-500 font-normal ml-1">({hoursFloat}h × ${hourlyRate}/hr)</span>
              </div>
            )}
            {!hourlyRate && <p className="text-[10px] text-slate-400">{t.noRate}</p>}
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

          <button onClick={handleSend} disabled={sending || !hasTime || isRunning || sent}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-sky-400 hover:from-violet-400 hover:to-sky-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow shadow-violet-200 transition-all active:scale-[0.99]">
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

          {/* Close button — label changes based on running state */}
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

// ── Small helper sub-component ────────────────────────────────────────────────
function Row({ icon, label, value, bold, small }) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="text-xs mt-0.5 flex-shrink-0 w-4 text-center">{icon}</span>
      <div className="min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mr-1">{label}</span>
        <span className={`${small ? 'text-[11px] text-slate-500' : bold ? 'text-xs font-bold text-slate-800' : 'text-xs text-slate-600'} break-words`}>
          {value}
        </span>
      </div>
    </div>
  );
}
