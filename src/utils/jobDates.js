// Working-day helpers shared by the job results and job details pages
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
export function isWorkingDay(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00');
  const dow = dt.getDay();
  return dow !== 0 && dow !== 6 && !getUSHolidays(dt.getFullYear()).has(dateStr);
}
export function nextWorkingDay(dateStr) {
  const dt = new Date(dateStr + 'T12:00:00');
  let key = dateStr;
  while (!isWorkingDay(key)) {
    dt.setDate(dt.getDate() + 1);
    key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }
  return key;
}
export function getWorkingDaysRange(startDateStr, totalHours) {
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

// Start/end of the job for a trade slot, shifted to working days — null when no date set
export function getJobDateInfo(te) {
  if (!te?.requiredDate) return null;
  const baseDate = te.requiredDate;
  const isHours  = te?.budgetType === 'hours' && te?.totalHours;
  const range    = isHours ? getWorkingDaysRange(baseDate, te.totalHours) : null;
  const start    = range ? range[0] : nextWorkingDay(baseDate);
  const end      = range ? range[range.length - 1] : null;
  return { start, end, range, isHours, shifted: start !== baseDate };
}

// Jobs applied to during this session — so the results list shows "Applied"
// after coming back from the details page.
export const appliedJobIds = new Set();
