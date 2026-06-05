import { useState, useCallback, useEffect } from 'react';
import { updateSchedule, findJobs, applyToJob } from '../../api/trade.js';
import useUIStore from '../../stores/uiStore.js';
import { toast } from '../../utils/toast.js';

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
    legend:   { free: 'Available', busy: 'Off', booked: 'On Job', today: 'Today' },
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
    legend:   { free: 'Disponible', busy: 'Libre no', booked: 'En obra', today: 'Hoy' },
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

export default function TradeSchedule({ initialBusyDays = [], initialBookings = [], approvedDates = [] }) {
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

  // Build a per-date map from DB bookings (handles both new { dates[], status } and legacy { date })
  const bookingDateMap = {};
  initialBookings.forEach(b => {
    const ds = b.dates?.length ? b.dates : (b.date ? [b.date] : []);
    ds.forEach(d => { bookingDateMap[d] = b; });
  });
  const [dirty,    setDirty]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  const [unit,     setUnit]     = useState('mi');
  const [distance, setDistance] = useState(25);

  const [jobResults,    setJobResults]    = useState(null);  // null = not searched yet
  const [jobsLoading,   setJobsLoading]   = useState(false);
  const [jobError,      setJobError]      = useState('');
  const [jobTrade,      setJobTrade]      = useState('');
  const [myHourlyRate,  setMyHourlyRate]  = useState(null);
  const [applyingId,      setApplyingId]      = useState(null);
  const [selectedJobDate, setSelectedJobDate] = useState(null); // YYYY-MM-DD orange date
  const [hoveredJobId,    setHoveredJobId]    = useState(null);
  const [appliedDates,    setAppliedDates]    = useState(() => new Set()); // persisted after apply
  const [pendingDates,    setPendingDates]    = useState(() => new Set()); // requiredDates from nearby jobs

  // Merge dates approved via the messages modal into the orange calendar set
  useEffect(() => {
    if (!approvedDates.length) return;
    setAppliedDates((prev) => {
      const next = new Set(prev);
      approvedDates.forEach((d) => d && next.add(d));
      return next;
    });
  }, [approvedDates]);

  const handleFindJobs = useCallback(async () => {
    setJobsLoading(true);
    setJobError('');
    setJobResults(null);
    try {
      const data = await findJobs(distance, unit);
      setJobResults(data.results);
      setJobTrade(data.professionality);
      setMyHourlyRate(data.hourlyRate ?? null);
      setSelectedJobDate(null);
      // Collect all requiredDates as orange pending markers on the calendar
      const reqDates = new Set(data.results.map(r => r.tradeEntry?.requiredDate).filter(Boolean));
      setPendingDates(reqDates);
      // Auto-navigate to the month of the first required date
      const firstRequired = [...reqDates][0];
      if (firstRequired) {
        const [ry, rm] = firstRequired.split('-');
        setViewYear(parseInt(ry));
        setViewMonth(parseInt(rm) - 1);
      }
    } catch (err) {
      if (err?.response?.data?.message === 'no_location') {
        setJobError(t.noLocation);
      } else {
        setJobError(t.noJobs);
      }
    } finally {
      setJobsLoading(false);
    }
  }, [distance, unit, t]);

  const handleApply = useCallback(async (job) => {
    if (applyingId) return;
    const te = job.tradeEntry;
    const baseDate = te?.requiredDate || selectedJobDate;
    if (!baseDate) return;
    const actualStart = (te?.budgetType === 'hours' && te?.totalHours)
      ? getWorkingDaysRange(baseDate, te.totalHours)[0]
      : nextWorkingDay(baseDate);
    setApplyingId(job._id);
    try {
      await applyToJob(job._id, lang, actualStart);
      // Mark the applied working-day range orange on the calendar
      const appliedRange = (te?.budgetType === 'hours' && te?.totalHours)
        ? getWorkingDaysRange(actualStart, te.totalHours)
        : [actualStart];
      setAppliedDates((prev) => { const next = new Set(prev); appliedRange.forEach(d => next.add(d)); return next; });
      setSelectedJobDate(null);
      toast.success(t.applySuccess(job.name, actualStart), { duration: 5000 });
    } catch (err) {
      if (err?.response?.status === 409) {
        if (err.response.data?.assigned) {
          toast.error(t.applyAssigned(job.name), { duration: 4000 });
        } else {
          toast.warning(t.applyDupe(job.name), { duration: 4000 });
        }
      } else {
        toast.error(t.applyError, { duration: 4000 });
      }
    } finally {
      setApplyingId(null);
    }
  }, [applyingId, selectedJobDate, lang, t]);

  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  // Orange range: compute from hovered job + selected date
  const rangeSet = (() => {
    if (!selectedJobDate) return new Set();
    const hJob = hoveredJobId ? jobResults?.find(j => String(j._id) === String(hoveredJobId)) : null;
    const te   = hJob?.tradeEntry;
    if (te?.budgetType === 'hours' && te?.totalHours)
      return new Set(getWorkingDaysRange(selectedJobDate, te.totalHours));
    return new Set([nextWorkingDay(selectedJobDate)]);
  })();

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
            const dbBooking    = bookingDateMap[key];
            const isBooked     = dbBooking?.status === 'booked' || (dbBooking && !dbBooking.status); // legacy = booked
            const isOrder      = dbBooking?.status === 'order';
            const isOff        = busyDays.has(key);
            const isToday      = key === todayKey;
            const isSelected   = key === selectedJobDate;
            const isApplied    = appliedDates.has(key);
            const isInRange    = !isApplied && !isOrder && rangeSet.has(key);
            const isPending    = jobResults && pendingDates.has(key); // requiredDate from a nearby job

            const isNonWorking = !isWorkingDay(key);

            if (isPast) {
              return <div key={key} className="w-full aspect-square rounded-xl bg-slate-100 ring-1 ring-black/20 flex items-center justify-center text-xs text-slate-300 font-medium select-none">{day}</div>;
            }

            const handleDayClick = () => {
              if (jobResults) return; // calendar is read-only in job-search mode
              toggleDay(yr, mo, day);
            };

            return (
              <div key={key} className="relative group">
                <button
                  onClick={handleDayClick}
                  className={`relative w-full aspect-square rounded-xl ring-1 ring-black/25 text-sm font-semibold flex items-center justify-center transition-all duration-150 active:scale-90 select-none
                    ${isBooked
                      ? 'bg-red-400 text-white shadow-sm shadow-red-200 cursor-default'
                      : (isOrder || isApplied)
                        ? 'bg-amber-400 text-white shadow-sm shadow-amber-200 cursor-default'
                        : isPending
                          ? 'bg-amber-400 text-white shadow-sm shadow-amber-200 ring-2 ring-amber-500 ring-offset-1'
                          : isSelected
                            ? 'bg-amber-400 text-white shadow-sm shadow-amber-200 ring-2 ring-amber-500 ring-offset-1 scale-105'
                            : isInRange
                              ? 'bg-amber-300 text-white shadow-sm shadow-amber-100'
                              : isOff
                                ? 'bg-red-300 text-white shadow-sm shadow-red-100'
                                : isNonWorking
                                  ? 'bg-emerald-200 text-emerald-700 shadow-sm'
                                  : 'bg-emerald-400 text-white shadow-sm shadow-emerald-100 hover:bg-emerald-500'}
                    ${isToday && !isSelected && !isPending ? 'ring-2 ring-offset-1 ring-sky-400' : ''}`}
                >
                  <span className="leading-none">{day}</span>
                  {(isBooked || isOrder) && dbBooking?.siteName && (
                    <span className="absolute bottom-0.5 left-0 right-0 text-[6px] font-bold text-white/90 text-center px-0.5 truncate leading-none">
                      {dbBooking.siteName}
                    </span>
                  )}
                  {!(isBooked || isOrder) && (isApplied || isPending) && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/80" />}
                  {isToday && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/80" />}
                </button>
                {dbBooking && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 hidden group-hover:block w-64 bg-slate-800 text-white text-xs rounded-xl px-3 py-2 shadow-xl pointer-events-none">
                    <p className="font-semibold truncate whitespace-nowrap">
                      {isBooked ? '🔒' : '📋'} {dbBooking.siteName}{dbBooking.siteAddress && <span className="text-slate-300 ml-1.5">📍 {dbBooking.siteAddress}</span>}
                    </p>
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
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.booked}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-sky-400" /><span className="text-xs text-slate-500 font-medium">{t.legend.today}</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400" /><span className="text-xs text-slate-500 font-medium">{jobResults ? 'Job Date' : t.legendPending}</span></div>
          <span className="text-xs text-slate-400 ml-auto">{jobResults ? '' : t.hint}</span>
        </div>

        <div>{renderMonth(viewYear, viewMonth)}</div>

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

      {/* ── Job results ─────────────────────────────────────────── */}
      {(jobError || jobResults) && (
        <div className="space-y-3">

          {jobError && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-700 font-medium text-center">
              {jobError}
            </div>
          )}

          {jobResults && jobResults.length === 0 && !jobError && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm text-slate-400 text-center">
              {t.noJobs}
            </div>
          )}

          {jobResults && jobResults.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide px-1">
                {t.jobsFound(jobResults.length, jobTrade)}
              </p>
              {jobResults.map((job) => {
                const distMi = (job.distanceMeters / 1609.344).toFixed(1);
                const distKm = (job.distanceMeters / 1000).toFixed(1);
                const distLabel = unit === 'km' ? `${distKm} km` : `${distMi} mi`;
                const te = job.tradeEntry;

                return (
                  <div key={job._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    onMouseEnter={() => setHoveredJobId(job._id)}
                    onMouseLeave={() => setHoveredJobId(null)}
                  >

                    {/* Site photo bar */}
                    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-50">
                      {job.photo ? (
                        <img src={job.photo} alt={job.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center text-2xl flex-shrink-0">
                          {job.type === 'residential' ? '🏠' : '🏢'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-extrabold text-slate-800 text-sm truncate">{job.name}</p>
                        <p className="text-xs text-slate-400 truncate">📍 {job.address}</p>
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
                      {te && te.budgetType === 'amount' && te.maxAmount && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                          💰 ${te.maxAmount}
                        </span>
                      )}
                      {te && te.budgetType === 'hours' && te.totalHours && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">
                          💰 {te.totalHours}h
                        </span>
                      )}
                      {te && te.budgetType === 'hours' && te.totalHours && myHourlyRate && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                          💵 {te.totalHours}h × ${myHourlyRate} = ${te.totalHours * myHourlyRate}
                        </span>
                      )}
                      {te && te.requiredDate && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                          📅 {te.requiredDate.split('-').reverse().slice(0, 2).reverse().join('/')}
                        </span>
                      )}
                    </div>

                    {/* Apply button */}
                    <div className="px-4 pb-4 space-y-1.5">
                      {te?.requiredDate ? (
                        <p className="text-[11px] text-amber-600 font-semibold text-center">📅 {te.requiredDate}</p>
                      ) : (
                        !selectedJobDate && (
                          <p className="text-[11px] text-amber-500 font-medium text-center">{t.pickDateFirst}</p>
                        )
                      )}
                      {!te?.requiredDate && selectedJobDate && (() => {
                        const isHours = te?.budgetType === 'hours' && te?.totalHours;
                        const range   = isHours ? getWorkingDaysRange(selectedJobDate, te.totalHours) : null;
                        const start   = range ? range[0] : nextWorkingDay(selectedJobDate);
                        const end     = range ? range[range.length - 1] : null;
                        const shifted = start !== selectedJobDate;
                        return (
                          <div className="space-y-0.5 text-center">
                            {shifted && <p className="text-[10px] text-amber-500 font-medium">{t.startAdjusted(start)}</p>}
                            {isHours ? (
                              <p className="text-[11px] text-sky-600 font-semibold">
                                📅 {start} → {end} &nbsp;·&nbsp; {t.workingDays(range.length)}
                              </p>
                            ) : (
                              <p className="text-[11px] text-emerald-600 font-semibold">📅 {start}</p>
                            )}
                          </div>
                        );
                      })()}
                      <button
                        onClick={() => handleApply(job)}
                        disabled={!!applyingId || !(te?.requiredDate || selectedJobDate)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.99] bg-gradient-to-r from-amber-500 to-sky-500 hover:from-amber-400 hover:to-sky-400 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {applyingId === job._id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            {t.applying}
                          </span>
                        ) : t.apply}
                      </button>
                    </div>

                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
