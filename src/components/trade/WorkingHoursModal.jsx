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
    },
    noRate:   'No hourly rate set — order sum will be $0.',
    noTime:   'Start the timer first.',
    success:  '✅ Work log sent for approval!',
    error:    'Failed to send. Please try again.',
    hours:    (h) => `${h} hr${h !== 1 ? 's' : ''} recorded`,
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
    },
    noRate:   'Sin tarifa horaria — el total será $0.',
    noTime:   'Primero inicia el temporizador.',
    success:  '✅ ¡Registro enviado para aprobación!',
    error:    'Error al enviar. Inténtalo de nuevo.',
    hours:    (h) => `${h} hr${h !== 1 ? 's' : ''} registradas`,
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function WorkingHoursModal({
  date,
  siteName,
  siteAddress,
  siteId,
  professionality,
  hourlyRate,   // optional — passed from tradeData
  onClose,
}) {
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];
  const user = useAuthStore((s) => s.user);

  // ── Timer state ─────────────────────────────────────────────────────────
  const [isRunning,      setIsRunning]      = useState(false);
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const accRef      = useRef(0);   // accumulated seconds from finished segments
  const runStartRef = useRef(null);// Date.now() when current segment started
  const intervalRef = useRef(null);

  // Cleanup interval on unmount
  useEffect(() => () => clearInterval(intervalRef.current), []);

  const handleStart = () => {
    if (isRunning) return;
    runStartRef.current = Date.now();
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      const seg = Math.floor((Date.now() - runStartRef.current) / 1000);
      setDisplaySeconds(accRef.current + seg);
    }, 500); // 500 ms for smooth feel
  };

  const handleStop = () => {
    if (!isRunning) return;
    clearInterval(intervalRef.current);
    const seg = Math.floor((Date.now() - runStartRef.current) / 1000);
    accRef.current += seg;
    setDisplaySeconds(accRef.current);
    setIsRunning(false);
  };

  // ── Submit state ─────────────────────────────────────────────────────────
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState(''); // '' | success msg | error msg

  const handleSend = async () => {
    if (displaySeconds === 0) { setResult(t.noTime); return; }
    // Auto-stop if still running
    if (isRunning) handleStop();
    // Use final accumulated value (handleStop updated accRef synchronously)
    const finalSec = accRef.current;
    setSending(true);
    setResult('');
    try {
      await submitWorkLog({ siteId, date, totalSeconds: finalSec });
      setResult(t.success);
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

  // Ring color theme
  const ringColor = isRunning ? 'ring-violet-400 shadow-violet-100'
                  : hasTime   ? 'ring-amber-400  shadow-amber-100'
                              : 'ring-slate-200  shadow-transparent';
  const bgColor   = isRunning ? 'bg-violet-50'
                  : hasTime   ? 'bg-amber-50'
                              : 'bg-slate-50';
  const numColor  = isRunning ? 'text-violet-700'
                  : hasTime   ? 'text-amber-700'
                              : 'text-slate-400';
  const badgeColor = isRunning ? 'bg-violet-100 text-violet-600 border-violet-200'
                   : hasTime   ? 'bg-amber-100  text-amber-600  border-amber-200'
                               : 'bg-slate-100  text-slate-400  border-slate-200';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !isRunning && !sending) onClose(); }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Top accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-sky-400 to-amber-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-violet-100 text-violet-700 border border-violet-200 mb-1">
              {t.badge}
            </div>
            <h2 className="text-base font-extrabold text-slate-800">{t.title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning || sending}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-500 transition text-lg leading-none"
          >×</button>
        </div>

        {/* Info card */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 space-y-1.5">
          <Row icon="👤" label={t.labels.name}    value={user?.fullName} bold />
          {professionality && <Row icon="🔧" label={t.labels.trade}   value={professionality} />}
          <Row icon="📅" label={t.labels.date}    value={date} />
          <Row icon="🏗️" label={t.labels.site}    value={siteName} bold />
          {siteAddress && <Row icon="📍" label={t.labels.address} value={siteAddress} small />}
        </div>

        {/* Clock */}
        <div className="px-6 pt-6 pb-3 flex flex-col items-center gap-3">

          {/* Digital ring */}
          <div className={`relative w-40 h-40 rounded-full flex items-center justify-center ring-4 ring-offset-2 shadow-lg transition-all duration-300 ${ringColor} ${bgColor}`}>
            {/* Pulsing glow when running */}
            {isRunning && (
              <div className="absolute inset-0 rounded-full ring-4 ring-violet-300 animate-ping opacity-30" />
            )}
            <div className="relative flex flex-col items-center">
              <span className={`font-mono font-extrabold text-3xl tracking-widest leading-none transition-colors duration-300 ${numColor}`}>
                {formatClock(displaySeconds)}
              </span>
              {hasTime && (
                <span className="text-[11px] font-semibold text-slate-400 mt-1">
                  {t.hours(hoursFloat)}
                </span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border transition-colors duration-300 ${badgeColor}`}>
            {isRunning && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            )}
            {statusText}
          </div>

          {/* Order preview */}
          {hasTime && orderSum !== null && (
            <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-1.5 rounded-xl">
              💰 {t.labels.date === 'Date' ? 'Estimated total' : 'Total estimado'}: <span className="font-extrabold">${orderSum}</span>
              <span className="text-emerald-500 font-normal ml-1">({hoursFloat}h × ${hourlyRate}/hr)</span>
            </div>
          )}
          {!hourlyRate && (
            <p className="text-[10px] text-slate-400 text-center px-2">{t.noRate}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="px-6 pb-6 space-y-2.5">

          {/* Start / Stop row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStart}
              disabled={isRunning || sent}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow shadow-emerald-200 transition-all active:scale-95"
            >
              {t.btn.start}
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow shadow-red-200 transition-all active:scale-95"
            >
              {t.btn.stop}
            </button>
          </div>

          {/* Send for approval */}
          <button
            onClick={handleSend}
            disabled={sending || !hasTime || isRunning || sent}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-sky-400 hover:from-violet-400 hover:to-sky-300 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow shadow-violet-200 transition-all active:scale-[0.99]"
          >
            {sending ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t.btn.sending}</>
            ) : (
              <>✅ {t.btn.send}</>
            )}
          </button>

          {/* Result message */}
          {result && (
            <div className={`rounded-xl px-4 py-2.5 text-xs font-semibold text-center border transition-all ${
              sent
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}>
              {result}
            </div>
          )}

          {/* Cancel */}
          {!isRunning && !sent && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium text-sm transition text-center"
            >
              {t.btn.cancel}
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
