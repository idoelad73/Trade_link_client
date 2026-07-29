import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getMe, updateSchedule, findJobs, requestReschedule, removeBooking, getTradeChatBySite, uploadChatFile as tradeUploadChatFile, checkWorkLog, getDepositStatus, getScheduleBookings } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';
import useAuthStore from '../../stores/authStore.js';
import { toast } from '../../utils/toast.js';
import ChatPanel from '../shared/ChatPanel.jsx';
import WorkingHoursModal from './WorkingHoursModal.jsx';

// ── Working-day helpers ────────────────────────────────────────────────────────
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
  // Fixed holidays (observed on Fri if Sat, Mon if Sun)
  [[0,1],[5,19],[6,4],[10,11],[11,25]].forEach(([mo, da]) => {
    const dt = new Date(y, mo, da);
    const dow = dt.getDay();
    if (dow === 6) dt.setDate(da - 1);
    else if (dow === 0) dt.setDate(da + 1);
    h.add(`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`);
  });
  // Movable holidays
  [
    _nthWeekday(y, 0, 1, 3),   // MLK Day: 3rd Mon Jan
    _nthWeekday(y, 1, 1, 3),   // Presidents Day: 3rd Mon Feb
    _lastWeekday(y, 4, 1),     // Memorial Day: last Mon May
    _nthWeekday(y, 8, 1, 1),   // Labor Day: 1st Mon Sep
    _nthWeekday(y, 9, 1, 2),   // Columbus Day: 2nd Mon Oct
    _nthWeekday(y, 10, 4, 4),  // Thanksgiving: 4th Thu Nov
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
  const dt   = new Date(startDateStr + 'T12:00:00');
  const days = [];
  while (days.length < need) {
    const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    if (isWorkingDay(key)) days.push(key);
    dt.setDate(dt.getDate() + 1);
  }
  return days;
}

const DAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};
const MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};

const content = {
  en: {
    legend:   { free: 'Available', busy: 'Off', booked: 'On Job', today: 'Today', approved: 'Hours Approved' },
    legendPending: 'Pending',
    hint:     'Tap a day to toggle',
    save:     'Save Schedule',
    saving:   'Saving…',
    saved:    '✓ Schedule saved',
    tapHint:  'Tap any day to change your availability',
    radius:   { title: 'Work Radius', desc: 'How far are you willing to travel?' },
    findJob:      'Find a Job',
    within:       'within',
    searching:    'Searching…',
    noJobs:       'No open jobs found in this area for your trade.',
    noLocation:   'Location not available. Please enable location sharing on your profile.',
    jobsFound:    (n, trade) => `${n} open job${n !== 1 ? 's' : ''} for ${trade}`,
    budget:       'Budget',
    distance:     'Distance',
    apply:        'Apply for Job',
    applying:     'Sending…',
    applied:      '✓ Applied',
    applySuccess:  (site, date) => `✅ Application sent for "${site}" on ${date}`,
    applyDupe:     (site) => `⚠️ You already applied for "${site}"`,
    applyAssigned: (site) => `🔒 "${site}" has already been filled`,
    applyError:    'Failed to send. Please try again.',
    applyOverlap:  'You already have a job scheduled on these days.',
    pickDateFirst:  'Pick a free date on the calendar above to apply',
    legendSelected: 'Selected',
    workingDays:    (n) => `${n} working day${n !== 1 ? 's' : ''}`,
    startAdjusted:  (d) => `⚠️ Non-working day — starts ${d}`,
  },
  es: {
    legend:   { free: 'Disponible', busy: 'Libre no', booked: 'En obra', today: 'Hoy', approved: 'Horas Aprobadas' },
    legendPending: 'Pendiente',
    hint:     'Toca un día para cambiar',
    save:     'Guardar Calendario',
    saving:   'Guardando…',
    saved:    '✓ Calendario guardado',
    tapHint:  'Toca cualquier día para cambiar tu disponibilidad',
    radius:   { title: 'Radio de Trabajo', desc: '¿Qué tan lejos estás dispuesto a viajar?' },
    findJob:      'Buscar Trabajo',
    within:       'en',
    searching:    'Buscando…',
    noJobs:       'No hay trabajos disponibles en esta área para tu oficio.',
    noLocation:   'Ubicación no disponible. Activa la ubicación en tu perfil.',
    jobsFound:    (n, trade) => `${n} trabajo${n !== 1 ? 's' : ''} abierto${n !== 1 ? 's' : ''} para ${trade}`,
    budget:       'Presupuesto',
    distance:     'Distancia',
    apply:        'Postularme',
    applying:     'Enviando…',
    applied:      '✓ Enviado',
    applySuccess:  (site, date) => `✅ Solicitud enviada para "${site}" el ${date}`,
    applyDupe:     (site) => `⚠️ Ya te postulaste para "${site}"`,
    applyAssigned: (site) => `🔒 "${site}" ya fue cubierto`,
    applyError:    'Error al enviar. Inténtalo de nuevo.',
    applyOverlap:  'Ya tienes un trabajo programado en estos días.',
    pickDateFirst:  'Elige una fecha libre en el calendario para postularte',
    legendSelected: 'Seleccionado',
    workingDays:    (n) => `${n} día${n !== 1 ? 's' : ''} hábil${n !== 1 ? 'es' : ''}`,
    startAdjusted:  (d) => `⚠️ Día no hábil — comienza el ${d}`,
  },
};

function toDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildCalendar(year, month) {
  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function TradeSchedule({ initialBusyDays = [], initialBookings = [], approvedDates = [], approvedOrders = [], depositedRequests = [], professionality = '', hourlyRate = null }) {
  const navigate = useNavigate();
  const lang = useUIStore((s) => s.lang);
  const t    = content[lang];

  const today = new Date();

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const goPrev = () => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  };
  const goNext = () => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  };

  // Disable back-arrow at current month, forward arrow at current+1
  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
  const maxMonth = today.getMonth() === 11 ? 0 : today.getMonth() + 1;
  const maxYear  = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const isMaxMonth = viewYear === maxYear && viewMonth === maxMonth;

  const [busyDays,   setBusyDays]   = useState(() => new Set(initialBusyDays));
  // liveBookings: authoritative booking list fetched fresh from the server on mount.
  // Falls back to the prop until the API responds, so the calendar renders immediately
  // with whatever data the parent already has, then silently updates once fresh data arrives.
  const [liveBookings, setLiveBookings] = useState(initialBookings);
  const [bookingsReady, setBookingsReady] = useState(false);

  // messageBookings: every date commitment for this trade pro, read live from
  // the messages collection — unlike the bookings snapshot, this can hold more
  // than one entry per date (different sites/contractors, different workers).
  const [messageBookings, setMessageBookings] = useState([]);

  // ── Fetch fresh bookings from server on mount ──────────────────────────────
  useEffect(() => {
    getMe()
      .then((trade) => {
        if (trade?.bookings) setLiveBookings(trade.bookings);
        if (trade?.busyDays) setBusyDays(new Set(trade.busyDays));
      })
      .catch(() => {/* keep initialBookings as fallback */})
      .finally(() => setBookingsReady(true));
    getScheduleBookings()
      .then(setMessageBookings)
      .catch(() => {/* calendar falls back to bookings-only display */});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a per-date map from LIVE bookings (handles both new { dates[], status } and legacy { date })
  const bookingDateMap = {};
  liveBookings.forEach(b => {
    const ds = b.dates?.length ? b.dates : (b.date ? [b.date] : []);
    ds.forEach(d => { bookingDateMap[d] = b; });
  });

  // Group every message-sourced entry by date — one date can hold several
  // entries (multiple sites/workers on the same day).
  const messageDateMap = {};
  messageBookings.forEach((m) => {
    if (!m.date) return;
    (messageDateMap[m.date] ||= []).push(m);
  });

  // Fast lookup: "siteId_date" → true  for every approved tradehours_order
  // Used to colour calendar cells light-blue and disable the clock icon.
  const approvedOrderSet = new Set(
    approvedOrders.map(o => `${o.siteId}_${o.date}`)
  );

  // Fast lookup: "contractorId_date" → true for every held direct-search deposit.
  // Used to colour a direct-search booked day amber (awaiting deposit) vs red (deposit held).
  const depositedSet = new Set(
    depositedRequests.map(d => `${d.contractorId}_${d.date}`)
  );
  const [dirty,    setDirty]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const [unit,     setUnit]     = useState('mi');
  const [distance, setDistance] = useState(25);

  const [jobsLoading,  setJobsLoading]  = useState(false);
  const [jobError,     setJobError]     = useState('');
  const [appliedDates, setAppliedDates] = useState(() => new Set()); // orange after apply
  const [pendingDates, setPendingDates] = useState(() => new Set()); // requiredDates from nearby jobs
  const [activeBookedKey,  setActiveBookedKey]  = useState(null);
  const [chatOpen,         setChatOpen]         = useState(null);    // booking key (or null) of the row whose chat is open
  const [chatMessage,      setChatMessage]      = useState('');
  const [chatHistory,      setChatHistory]      = useState([]);
  const [chatContractorId, setChatContractorId] = useState('');
  const userId = useAuthStore((s) => s.user?._id ?? s.user?.id ?? '');
  const [rescheduleMode,    setRescheduleMode]    = useState(false); // calendar in reschedule-pick mode
  const [rescheduleSiteKey, setRescheduleSiteKey] = useState(null);  // which row (site) is being rescheduled
  const [rescheduleNewKey,  setRescheduleNewKey]  = useState(null);  // newly picked date key
  const [rescheduling,      setRescheduling]      = useState(false); // API in-flight
  const [deletingKey,       setDeletingKey]       = useState(null);  // booking key currently being deleted
  const [workingHoursTargetKey, setWorkingHoursTargetKey] = useState(null); // booking key with the hours modal open

  // ── Background timer — persists while modal is closed ─────────────────────
  // Stores timestamps so we can recalculate elapsed time without a real background interval.
  const bgTimerRef = useRef({ acc: 0, start: null, bookingKey: null });
  const [timerRunning, setTimerRunning] = useState(false);  // drives clock-icon pulse

  // Unique key per booking — a trade can have multiple bookings (different sites) on
  // the same date, so date alone is not enough to identify one.
  const bookingKeyOf = (bk) => bk.siteId ? `site:${bk.siteId}` : `direct:${bk.contractorId}`;

  // Single source of truth for "which jobs are truly confirmed on this date" — driven by
  // messageBookings (deduped worker_offer/application records), NOT raw TradePro.bookings,
  // so a booking whose contractor-side confirmation never went through never appears here.
  const getConfirmedBookingsAtDate = (key) =>
    messageBookings
      .filter(m => m.date === key && m.status === 'booked')
      .map(m => ({
        siteId:       m.siteId,
        siteName:     m.siteName,
        siteAddress:  m.siteAddress,
        contractorId: m.contractorId,
        workers_no:   m.workers,
        totalHours:   m.totalHours,
      }));

  // ── Clock-disabled check — queried from server when a booked day is tapped ─
  // Prevents opening the clock when a pending payment message already exists for
  // this trade + site + date combination. Keyed per booking so multiple sites on
  // the same day are tracked independently.
  const [clockStatus, setClockStatus] = useState({}); // { [bookingKey]: { disabled, checking } }

  // Merge dates approved via the messages modal into the orange calendar set
  useEffect(() => {
    if (!approvedDates.length) return;
    setAppliedDates((prev) => {
      const next = new Set(prev);
      approvedDates.forEach((d) => d && next.add(d));
      return next;
    });
  }, [approvedDates]);

  // When a booked day is tapped, check each row's clock independently against the
  // server (messages collection) for:
  //   a) An approved tradehours_order already exists for this site+date  (client-side, instant)
  //   b) A deposit is actually held for this job — required for BOTH site-based AND
  //      direct-search bookings. No-deposit does NOT grey out the clock; it stays
  //      clickable so tapping it can explain why via a SweetAlert2 popup instead of
  //      silently doing nothing.
  //   c) A pending payment message already exists for this site+date (site-based only)
  useEffect(() => {
    if (!activeBookedKey) { setClockStatus({}); return; }
    const bookings = getConfirmedBookingsAtDate(activeBookedKey);
    let cancelled = false;

    bookings.forEach((bk) => {
      const key = bookingKeyOf(bk);

      // (a) Already approved — disable immediately, no round-trip needed
      if (bk.siteId && approvedOrderSet.has(`${String(bk.siteId)}_${activeBookedKey}`)) {
        setClockStatus((prev) => ({ ...prev, [key]: { disabled: true, checking: false, reason: 'approved' } }));
        return;
      }

      if (!bk.siteId && !bk.contractorId) {
        setClockStatus((prev) => ({ ...prev, [key]: { disabled: false, checking: false, reason: 'no_deposit' } }));
        return;
      }

      // (b) Deposit check — server call against the messages collection
      setClockStatus((prev) => ({ ...prev, [key]: { disabled: false, checking: true, reason: null } }));
      getDepositStatus({ siteId: bk.siteId || null, contractorId: bk.contractorId || null, date: activeBookedKey })
        .then(({ hasDeposit }) => {
          if (cancelled) return;
          if (!hasDeposit) {
            setClockStatus((prev) => ({ ...prev, [key]: { disabled: false, checking: false, reason: 'no_deposit' } }));
            return;
          }
          // Deposit confirmed — (c) site-based bookings still need the pending-submission check
          if (bk.siteId) {
            checkWorkLog(String(bk.siteId), activeBookedKey)
              .then(({ hasPending }) => { if (!cancelled) setClockStatus((prev) => ({ ...prev, [key]: { disabled: hasPending, checking: false, reason: hasPending ? 'pending_submission' : null } })); })
              .catch(() => { if (!cancelled) setClockStatus((prev) => ({ ...prev, [key]: { disabled: false, checking: false, reason: null } })); });
          } else {
            setClockStatus((prev) => ({ ...prev, [key]: { disabled: false, checking: false, reason: null } }));
          }
        })
        // Fail-safe, not fail-open — treat a network error as "no deposit confirmed" rather
        // than silently letting the clock start without server confirmation.
        .catch(() => { if (!cancelled) setClockStatus((prev) => ({ ...prev, [key]: { disabled: false, checking: false, reason: 'no_deposit' } })); });
    });

    return () => { cancelled = true; };
  }, [activeBookedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFindJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobError('');
    try {
      const data = await findJobs(distance, unit);
      // Mark required dates orange on the calendar (visible when user returns)
      const reqDates = new Set(data.results.map(r => r.tradeEntry?.requiredDate).filter(Boolean));
      setPendingDates(reqDates);
      // Navigate to the job results page
      navigate('/dashboard/trade/jobs', {
        state: {
          results:    data.results,
          trade:      data.professionality,
          hourlyRate: data.hourlyRate ?? null,
          unit,
        },
      });
    } catch (err) {
      if (err?.response?.data?.message === 'no_location') {
        setJobError(t.noLocation);
      } else {
        setJobError(t.noJobs);
      }
    } finally {
      setJobsLoading(false);
    }
  }, [distance, unit, t, navigate]);


  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());


  const toggleDay = (yr, mo, day) => {
    if (!day) return;
    const key = toDateKey(yr, mo, day);
    setBusyDays((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
    setDirty(true);
    setSaved(false);
  };

  const renderMonth = (yr, mo) => {
    const cells = buildCalendar(yr, mo);
    return (
      <div>
        <div className="grid grid-cols-7 px-3 pt-2 pb-1">
          {DAYS[lang].map((d) => (
            <div key={d} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wide py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 px-3 pb-4">
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} />;
            const key          = toDateKey(yr, mo, day);
            const isPast       = new Date(yr, mo, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const dbBooking       = bookingDateMap[key];
            const msgEntries       = messageDateMap[key] || [];
            const isBooked        = dbBooking?.status === 'booked' || (dbBooking && !dbBooking.status); // legacy = booked
            const isOrder         = dbBooking?.status === 'order';
            const isApprovedOrder = isBooked && dbBooking?.siteId &&
              approvedOrderSet.has(`${String(dbBooking.siteId)}_${key}`);
            // Direct/quick-search booking whose contractor hasn't held the deposit yet —
            // stays amber (like a pending offer) instead of red (locked/confirmed).
            const isDirectPendingDeposit = isBooked && !dbBooking?.siteId && dbBooking?.contractorId &&
              !depositedSet.has(`${String(dbBooking.contractorId)}_${key}`);
            const isOff        = busyDays.has(key);
            const isToday      = key === todayKey;
            const isApplied    = appliedDates.has(key);
            const isPending       = pendingDates.has(key);
            const isRescheduleNew = rescheduleMode && key === rescheduleNewKey;

            const isNonWorking = !isWorkingDay(key);

            if (isPast) {
              return <div key={key} className="w-full aspect-square rounded-xl bg-slate-100 ring-1 ring-black/20 flex items-center justify-center text-xs text-slate-300 font-medium select-none">{day}</div>;
            }

            const handleDayClick = () => {
              if (isBooked) {
                setActiveBookedKey((prev) => prev === key ? null : key);
                setChatOpen(false);
                setRescheduleMode(false);
                setRescheduleNewKey(null);
                return;
              }
              // In reschedule mode, green days become the new-date selection
              if (rescheduleMode && !isOff && !isApplied && !isOrder) {
                setRescheduleNewKey((prev) => prev === key ? null : key);
                return;
              }
              toggleDay(yr, mo, day);
            };

            return (
              <div key={key} className="relative group">
                <button
                  onClick={handleDayClick}
                  className={`relative w-full aspect-square rounded-xl ring-1 ring-black/25 text-sm font-semibold flex transition-all duration-150 active:scale-90 select-none overflow-hidden
                    ${isApprovedOrder
                      ? `items-center justify-center bg-sky-300 text-white shadow-sm shadow-sky-200 cursor-pointer ${activeBookedKey === key ? 'ring-2 ring-offset-1 ring-sky-500 scale-105' : 'hover:bg-sky-400'}`
                      : isDirectPendingDeposit
                        ? `flex-col items-center justify-start pt-1 ring-amber-300 bg-amber-100 text-amber-700 shadow-sm shadow-amber-100 cursor-pointer ${activeBookedKey === key ? 'ring-2 ring-offset-1 ring-amber-400 scale-105' : 'hover:bg-amber-200'}`
                        : isBooked
                        ? `flex-col items-center justify-start pt-1 ring-red-300 bg-red-100 text-red-700 shadow-sm shadow-red-100 cursor-pointer ${activeBookedKey === key ? 'ring-2 ring-offset-1 ring-red-400 scale-105' : 'hover:bg-red-200'}`
                        : isRescheduleNew
                          ? 'items-center justify-center bg-violet-500 text-white shadow-sm shadow-violet-200 ring-2 ring-violet-600 ring-offset-1 scale-105'
                          : (isOrder || isApplied)
                            ? 'items-center justify-center bg-amber-400 text-white shadow-sm shadow-amber-200 cursor-default'
                            : isPending
                              ? 'items-center justify-center bg-amber-400 text-white shadow-sm shadow-amber-200 ring-2 ring-amber-500 ring-offset-1'
                              : isOff
                                ? 'items-center justify-center bg-red-300 text-white shadow-sm shadow-red-100'
                                : isNonWorking
                                  ? 'items-center justify-center bg-emerald-200 text-emerald-700 shadow-sm'
                                  : 'items-center justify-center bg-emerald-400 text-white shadow-sm shadow-emerald-100 hover:bg-emerald-500'}
                    ${isToday && !isPending ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`}
                >
                  {isBooked && !isApprovedOrder ? (() => {
                    // A trade can send multiple workers to different sites on the same day —
                    // show one line PER SITE (not joined) so worker counts read clearly per job.
                    const bookedEntries = msgEntries.filter((m) => m.status === 'booked');
                    const bySite = new Map();
                    bookedEntries.forEach((m) => {
                      if (!m.siteName) return;
                      bySite.set(m.siteName, (bySite.get(m.siteName) || 0) + (m.workers || 1));
                    });
                    const siteRows = [...bySite.entries()]; // [siteName, totalWorkers][]
                    const textColor = isDirectPendingDeposit ? 'text-amber-700' : 'text-red-600';
                    return (
                      /* ── Booked day: day number at top + one line per site below ── */
                      <>
                        <span className={`text-xs font-bold leading-none ${isDirectPendingDeposit ? 'text-amber-600' : 'text-red-500'}`}>{day}</span>
                        {siteRows.length > 0 ? (
                          <span className="w-full px-0.5 mt-0.5 flex flex-col gap-px overflow-hidden">
                            {siteRows.map(([name, workers]) => (
                              <span key={name} className={`text-[6.5px] font-bold text-center leading-tight truncate ${textColor}`}>
                                👷{workers} {name}
                              </span>
                            ))}
                          </span>
                        ) : dbBooking?.siteName && (
                          <span className={`w-full px-0.5 mt-0.5 text-[7px] font-bold text-center leading-tight line-clamp-3 break-words ${textColor}`}>
                            {dbBooking.siteName}
                          </span>
                        )}
                      </>
                    );
                  })() : (
                    /* ── All other days ── */
                    <>
                      <span className="leading-none">{day}</span>
                      {isApprovedOrder && dbBooking?.siteName && (
                        <span className="absolute bottom-0.5 left-0 right-0 text-[6px] font-bold text-white/90 text-center px-0.5 truncate leading-none">
                          {dbBooking.siteName}
                        </span>
                      )}
                      {isOrder && !isApprovedOrder && dbBooking?.siteName && (
                        <span className="absolute bottom-0.5 left-0 right-0 text-[6px] font-bold text-white/90 text-center px-0.5 truncate leading-none">
                          {msgEntries.length > 0 ? `👷${msgEntries.reduce((s, m) => s + (m.workers || 1), 0)} ` : ''}{dbBooking.siteName}
                        </span>
                      )}
                      {!(isBooked || isOrder) && (isApplied || isPending) && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/80" />}
                      {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />}
                    </>
                  )}
                </button>
                {(dbBooking || msgEntries.length > 0) && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 hidden group-hover:block w-64 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 shadow-xl pointer-events-none space-y-1">
                    {msgEntries.length > 0 ? (
                      msgEntries.map((m, idx) => (
                        <p key={idx} className="font-semibold truncate whitespace-nowrap">
                          {m.status === 'booked' ? '🔒' : '📋'} 👷{m.workers} {m.siteName}
                          {m.siteAddress && <span className="text-slate-300 ml-1.5">📍 {m.siteAddress}</span>}
                        </p>
                      ))
                    ) : (
                      <p className="font-semibold truncate whitespace-nowrap">
                        {isBooked ? '🔒' : '📋'} {dbBooking.siteName}{dbBooking.siteAddress && <span className="text-slate-300 ml-1.5">📍 {dbBooking.siteAddress}</span>}
                      </p>
                    )}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateSchedule([...busyDays]);
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { /* keep dirty so user can retry */ }
    finally { setSaving(false); }
  }, [busyDays]);

  const kmValue    = Math.round(distance * 1.609);
  const displayDist = unit === 'mi' ? `${distance} mi` : `${kmValue} km`;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">

      {/* Calendar */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-sky-100 shadow-md overflow-hidden">

        <div className="px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-400 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={isCurrentMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-lg transition"
          >‹</button>
          <h2 className="text-white font-extrabold text-lg tracking-tight">
            {MONTHS[lang][viewMonth]} {viewYear}
          </h2>
          <button
            onClick={goNext}
            disabled={isMaxMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-lg transition"
          >›</button>
        </div>

        <div className="flex items-center gap-3 px-3 sm:px-6 py-2 sm:py-3 border-b border-sky-50 bg-sky-50/40 overflow-x-auto scrollbar-none flex-nowrap">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.free}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-300" /><span className="text-xs text-slate-500 font-medium">{t.legend.busy}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-200 border border-red-300" /><span className="text-xs text-slate-500 font-medium">{t.legend.booked}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-sky-300" /><span className="text-xs text-slate-500 font-medium">{t.legend.approved}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-sky-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.today}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-xs text-slate-500 font-medium">{t.legendPending}</span></div>
          <span className="text-xs text-slate-400 ml-auto">{t.hint}</span>
        </div>

        <div>{renderMonth(viewYear, viewMonth)}</div>

        {/* Booked-day allocations — one card PER SITE, so hours can be logged separately.
            Sourced from messageBookings (same as the calendar cell) instead of raw
            TradePro.bookings, so a booking whose worker_offer confirmation never actually
            went through (e.g. rejected for lacking open slots) doesn't show a phantom row.

            Rendered as a modal over the calendar, EXCEPT while rescheduling — that flow
            needs the user to tap a green day on the calendar underneath, so the modal
            steps aside and the confirm row shows inline instead. */}
        {activeBookedKey && (() => {
          const bookingsAtDate = getConfirmedBookingsAtDate(activeBookedKey);
          if (bookingsAtDate.length === 0) return null;

          const rescheduleTargetBk = bookingsAtDate.find((b) => bookingKeyOf(b) === rescheduleSiteKey);

          const closeDay = () => {
            setActiveBookedKey(null);
            setRescheduleMode(false);
            setRescheduleSiteKey(null);
            setRescheduleNewKey(null);
          };

          const handleRescheduleConfirm = async () => {
            if (!rescheduleNewKey || !rescheduleTargetBk || rescheduling) return;
            setRescheduling(true);
            try {
              await requestReschedule(rescheduleTargetBk.siteId, rescheduleNewKey);
              toast.success(`📅 Reschedule request sent for ${rescheduleTargetBk.siteName}`, { duration: 5000 });
              setRescheduleMode(false);
              setRescheduleSiteKey(null);
              setRescheduleNewKey(null);
            } catch (err) {
              if (err?.response?.status === 409) {
                toast.warning('That date is already busy on your calendar', { duration: 4000 });
              } else {
                toast.error('Failed to send request', { duration: 4000 });
              }
            } finally { setRescheduling(false); }
          };

          const headingDate = (() => {
            const d = new Date(activeBookedKey + 'T12:00:00');
            return isNaN(d) ? activeBookedKey : d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            });
          })();

          // While picking a new date the calendar must stay reachable, so only the
          // slim confirm bar is shown inline and the modal is suppressed.
          if (rescheduleMode) {
            return (
              <div className="mx-4 mb-3 space-y-2">
                <div className="rounded-2xl bg-violet-50 border border-violet-200 px-4 py-3">
                  <p className="text-xs font-bold text-violet-700">📅 Pick a new date for {rescheduleTargetBk?.siteName ?? 'this job'}</p>
                  <p className="text-[10px] text-violet-400 mt-0.5">Tap any green day above ↑</p>
                </div>
                {rescheduleNewKey && rescheduleTargetBk && (
                  <div className="rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2.5 flex items-center gap-3">
                    <p className="flex-1 text-xs font-semibold text-violet-700">
                      Send request for <span className="font-extrabold">{rescheduleTargetBk.siteName}</span> on <span className="font-extrabold">{rescheduleNewKey}</span>?
                    </p>
                    <button
                      onClick={handleRescheduleConfirm}
                      disabled={rescheduling}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-50 transition shadow-sm shadow-violet-200"
                    >
                      {rescheduling ? '…' : '✉️ Send'}
                    </button>
                    <button
                      onClick={() => { setRescheduleMode(false); setRescheduleSiteKey(null); setRescheduleNewKey(null); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 transition"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div
              className="fixed inset-0 z-[65] flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) closeDay(); }}
            >
              <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">

                {/* Header — the date and how many jobs sit on it */}
                <div className="bg-gradient-to-r from-red-500 to-rose-400 px-5 py-4 flex items-start justify-between gap-3 flex-shrink-0">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">Scheduled work</p>
                    <h3 className="text-sm font-extrabold text-white leading-snug mt-0.5">{headingDate}</h3>
                    <p className="text-[11px] text-white/80 mt-0.5">
                      {bookingsAtDate.length} {bookingsAtDate.length === 1 ? 'job' : 'jobs'} ·{' '}
                      {bookingsAtDate.reduce((sum, b) => sum + (b.workers_no ?? 1), 0)} 👷 total
                    </p>
                  </div>
                  <button
                    onClick={closeDay}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-base leading-none transition"
                  >×</button>
                </div>

                {/* One card per job allocation */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
                  {bookingsAtDate.map((bk) => {
                    const bkKey = bookingKeyOf(bk);
                    const isPendingDeposit = !bk.siteId && bk.contractorId &&
                      !depositedSet.has(`${String(bk.contractorId)}_${activeBookedKey}`);
                    const status     = clockStatus[bkKey] || { disabled: false, checking: false, reason: null };
                    const isActive   = timerRunning && bgTimerRef.current.bookingKey === bkKey;
                    const isDisabled = status.disabled && !isActive; // never disable if timer is already running
                    const noDeposit  = status.reason === 'no_deposit'; // clickable — explains itself via popup, not greyed out
                    const clockTitle = status.checking  ? 'Checking…'
                                     : status.reason === 'approved'            ? 'Hours already approved for this day ✅'
                                     : status.reason === 'pending_submission'  ? 'Hours already submitted — awaiting approval 🕐'
                                     : noDeposit         ? 'No deposit held for this job — tap for details 💳'
                                     : isActive          ? 'Timer running — tap to open'
                                     :                     'Log working hours';

                    const handleClockClick = () => {
                      if (isDisabled || status.checking) return;
                      if (noDeposit) {
                        Swal.fire({
                          icon:  'warning',
                          title: "Can't start working yet",
                          text:  "We can't start working because there is no deposit for that job.",
                          confirmButtonText: 'Got it',
                          confirmButtonColor: '#f59e0b',
                          customClass: { popup: 'rounded-3xl' },
                        });
                        return;
                      }
                      setWorkingHoursTargetKey(bkKey);
                    };

                    const handleRowChat = async () => {
                      if (!bk.siteId) { toast.warning('No site ID on this booking'); return; }
                      try {
                        const result = await getTradeChatBySite(String(bk.siteId));
                        setChatHistory(result?.chat?.messages ?? []);
                        setChatContractorId(String(result?.contractorId ?? ''));
                      } catch (err) {
                        console.error('Chat load error', err);
                        setChatHistory([]);
                      }
                      setChatOpen(bkKey);
                    };

                    const handleRowDelete = async () => {
                      if (deletingKey) return;
                      if (!window.confirm(`Remove your booking for "${bk.siteName}"?`)) return;
                      setDeletingKey(bkKey);
                      try {
                        await removeBooking(bk.siteId);
                        toast.success(`Booking removed for ${bk.siteName}`, { duration: 4000 });
                        // Keep both data sources in sync — liveBookings drives the red/amber day
                        // colour, messageBookings drives the calendar lines + this modal's cards.
                        setLiveBookings((prev) => prev.filter((b) => bookingKeyOf(b) !== bkKey));
                        setMessageBookings((prev) => prev.filter((m) =>
                          !(m.date === activeBookedKey && (m.siteId ?? `direct:${m.contractorId}`) === (bk.siteId ?? `direct:${bk.contractorId}`))
                        ));
                        if (bookingsAtDate.length <= 1) {
                          setActiveBookedKey(null);
                          setRescheduleMode(false);
                          setRescheduleSiteKey(null);
                        }
                      } catch { toast.error('Failed to remove booking', { duration: 4000 }); }
                      finally { setDeletingKey(null); }
                    };

                    // Human-readable state for this allocation, so the card says what's
                    // going on instead of leaving it encoded in a disabled button.
                    const stateChip = isPendingDeposit
                      ? { label: 'Waiting for contractor’s deposit', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
                      : status.checking                        ? { label: 'Checking…',                    cls: 'bg-slate-100 text-slate-500 border-slate-200' }
                      : status.reason === 'approved'           ? { label: 'Hours approved ✅',            cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' }
                      : status.reason === 'pending_submission' ? { label: 'Awaiting approval 🕐',         cls: 'bg-sky-100 text-sky-700 border-sky-200' }
                      : status.reason === 'no_deposit'         ? { label: 'No deposit held 💳',           cls: 'bg-amber-100 text-amber-700 border-amber-200' }
                      : isActive                               ? { label: 'Timer running ⏱️',             cls: 'bg-violet-100 text-violet-700 border-violet-200' }
                      :                                          { label: 'Ready to log hours',          cls: 'bg-slate-100 text-slate-500 border-slate-200' };

                    return (
                      <div key={bkKey} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                        {/* Job identity */}
                        <div className="px-4 pt-3.5 pb-3">
                          <p className="text-sm font-extrabold text-slate-800 leading-snug">
                            {isPendingDeposit ? '💳' : '🔒'} {bk.siteName}
                          </p>
                          {bk.siteAddress && (
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">📍 {bk.siteAddress}</p>
                          )}

                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                              👷 {bk.workers_no ?? 1} {(bk.workers_no ?? 1) === 1 ? 'worker' : 'workers'}
                            </span>
                            {bk.totalHours != null && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5">
                                ⏱️ {bk.totalHours}h min
                              </span>
                            )}
                          </div>

                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-2 ${stateChip.cls}`}>
                            {stateChip.label}
                          </span>
                        </div>

                        {/* Actions — labelled, not bare icons, so each one is self-explanatory */}
                        <div className="grid grid-cols-4 border-t border-slate-100 divide-x divide-slate-100">
                          <button
                            onClick={handleRowChat}
                            title="Open chat"
                            className="flex flex-col items-center gap-1 py-2.5 text-violet-600 hover:bg-violet-50 transition active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-[10px] font-bold">Chat</span>
                          </button>

                          <button
                            onClick={() => { setRescheduleMode(true); setRescheduleSiteKey(bkKey); setRescheduleNewKey(null); }}
                            title="Update schedule"
                            className="flex flex-col items-center gap-1 py-2.5 text-sky-600 hover:bg-sky-50 transition active:scale-95"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[10px] font-bold">Reschedule</span>
                          </button>

                          {/* Working hours — a missing deposit keeps this clickable (not greyed
                              out) so tapping it explains why via a popup; only approved /
                              pending_submission / checking states hard-disable it. */}
                          <button
                            onClick={handleClockClick}
                            disabled={isDisabled || status.checking}
                            title={clockTitle}
                            className={`relative flex flex-col items-center gap-1 py-2.5 transition active:scale-95 ${
                              isDisabled || status.checking
                                ? 'text-slate-300 cursor-not-allowed'
                                : isActive
                                  ? 'text-white bg-violet-500 hover:bg-violet-400'
                                  : noDeposit
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-violet-600 hover:bg-violet-50'
                            }`}
                          >
                            {status.checking ? (
                              <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-400 rounded-full animate-spin" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="9" strokeLinecap="round" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 3" />
                              </svg>
                            )}
                            <span className="text-[10px] font-bold">{isActive ? 'Running' : 'Hours'}</span>
                          </button>

                          <button
                            onClick={handleRowDelete}
                            disabled={deletingKey === bkKey}
                            title="Remove booking"
                            className="flex flex-col items-center gap-1 py-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 transition active:scale-95 disabled:opacity-40"
                          >
                            {deletingKey === bkKey ? (
                              <span className="w-4 h-4 border-2 border-red-300 border-t-red-500 rounded-full animate-spin" />
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                            <span className="text-[10px] font-bold">Remove</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
                  <button
                    onClick={closeDay}
                    className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 font-semibold text-xs hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        <div className="px-6 pb-5">
          {dirty || saved ? (
            <button onClick={handleSave} disabled={saving || saved}
              className={`w-full py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${saved ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-sky-500 hover:bg-sky-400 text-white shadow shadow-sky-200 active:scale-[0.99]'}`}>
              {saving ? t.saving : saved ? t.saved : t.save}
            </button>
          ) : (
            <p className="text-center text-xs text-slate-400">{t.tapHint}</p>
          )}
        </div>
      </div>

      {/* Distance & Find Job */}
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-md px-6 py-6 space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700">{t.radius.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t.radius.desc}</p>
          </div>
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5">
            {['mi', 'km'].map((u) => (
              <button key={u} onClick={() => setUnit(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${unit === u ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <span className="text-3xl sm:text-4xl font-extrabold text-sky-500">{displayDist}</span>
        </div>

        <div>
          <input type="range" min={5} max={200} step={5} value={distance} onChange={(e) => setDistance(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-sky-500"
            style={{ background: `linear-gradient(to right, #0ea5e9 0%, #0ea5e9 ${((distance - 5) / 195) * 100}%, #e0f2fe ${((distance - 5) / 195) * 100}%, #e0f2fe 100%)` }}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1 px-0.5">
            <span>5 {unit}</span><span>200 {unit}</span>
          </div>
        </div>

        <button
          onClick={handleFindJobs}
          disabled={jobsLoading}
          className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-sky-400 hover:from-amber-400 hover:to-sky-300 disabled:opacity-70 text-white font-extrabold text-sm sm:text-base py-3.5 sm:py-4 rounded-2xl shadow-lg shadow-amber-200 transition-all active:scale-[0.99] tracking-wide flex items-center justify-center gap-2 sm:gap-3 mt-2"
        >
          {jobsLoading ? (
            <><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t.searching}</>
          ) : (
            <><span className="text-lg sm:text-xl">🔍</span>{t.findJob}<span className="text-xs sm:text-sm font-normal opacity-80 hidden xs:inline sm:inline">{t.within} {displayDist}</span></>
          )}
        </button>
      </div>

      {/* Error banner (location / network error) */}
      {jobError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-700 font-medium text-center">
          {jobError}
        </div>
      )}
      {/* ── Real-time chat panel (bottom-left, half width) ───────────────── */}
      {/* ── Working-hours modal — targets one specific site's booking ──────── */}
      {workingHoursTargetKey && activeBookedKey && (() => {
        const bk = getConfirmedBookingsAtDate(activeBookedKey).find((b) => bookingKeyOf(b) === workingHoursTargetKey);
        if (!bk) return null;
        return (
          <WorkingHoursModal
            date={activeBookedKey}
            bookingKey={workingHoursTargetKey}
            siteName={bk.siteName}
            siteAddress={bk.siteAddress}
            siteId={bk.siteId ? String(bk.siteId) : ''}
            contractorId={bk.contractorId ? String(bk.contractorId) : ''}
            professionality={professionality}
            hourlyRate={hourlyRate}
            totalHours={bk.totalHours ?? null}
            workersNo={bk.workers_no ?? 1}
            bgTimerRef={bgTimerRef}
            timerRunning={timerRunning}
            setTimerRunning={setTimerRunning}
            onClose={() => setWorkingHoursTargetKey(null)}
            onSent={() => setClockStatus((prev) => ({ ...prev, [workingHoursTargetKey]: { disabled: true, checking: false } }))}
          />
        );
      })()}

      {chatOpen && activeBookedKey && (() => {
        const bk = getConfirmedBookingsAtDate(activeBookedKey).find((b) => bookingKeyOf(b) === chatOpen);
        if (!bk) return null;
        const sharedProps = {
          contractorId:    chatContractorId,
          tradeProId:      String(userId),
          siteId:          String(bk.siteId ?? ''),
          siteName:        bk.siteName,
          userType:        'trade',
          initialMessages: chatHistory,
          uploadFn:        tradeUploadChatFile,
          onClose: () => { setChatOpen(null); setChatHistory([]); setChatContractorId(''); },
        };
        return (
          <div className="fixed inset-0 z-50">
            {/* Mobile — full-screen slide up from bottom */}
            <div className="sm:hidden absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col justify-end">
              <ChatPanel
                {...sharedProps}
                className="rounded-t-3xl rounded-b-none border-b-0"
                style={{ height: '72dvh' }}
              />
            </div>
            {/* Desktop — floating bottom-left */}
            <div className="hidden sm:block pointer-events-none absolute inset-0">
              <ChatPanel
                {...sharedProps}
                className="absolute bottom-4 left-4 pointer-events-auto"
                style={{ width: 'min(50vw, 380px)', height: 'min(36vh, 320px)' }}
              />
            </div>
          </div>
        );
      })()}

    </div>
  );
}
