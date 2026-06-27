// Time-open logic — ported from the original vanilla index.html.
// API horarios are stored in GMT; display and open/closed checks use local time.

const API_TZ_OFFSET_MIN = -3 * 60; // GMT → America/Sao_Paulo (UTC-3)

export function todayDay() {
  const d = new Date().getDay(); // JS: 0=Sun
  return d === 0 ? 7 : d; // Their: 1=Seg, 7=Dom
}

export function nowMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function parseRangeRaw(str) {
  if (!str || str === '-') return null;
  const p = str.split(' - ');
  if (p.length !== 2) return null;
  const m = (s) => {
    const [h, mm] = s.split(':').map(Number);
    return h * 60 + mm;
  };
  return [m(p[0]), m(p[1])];
}

function shiftMinutes(minutes) {
  return ((minutes + API_TZ_OFFSET_MIN) % (24 * 60) + 24 * 60) % (24 * 60);
}

function minutesToStr(minutes) {
  const h = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function convertHorario(str) {
  const r = parseRangeRaw(str);
  if (!r) return str;
  return `${minutesToStr(shiftMinutes(r[0]))} - ${minutesToStr(shiftMinutes(r[1]))}`;
}

export function parseRange(str) {
  const r = parseRangeRaw(str);
  if (!r) return null;
  return [shiftMinutes(r[0]), shiftMinutes(r[1])];
}

const PERIODS = ['A', 'J'];

function scheduleRawsForDay(end, dayNum) {
  const horario = end?.horario;
  if (!horario) return [];
  return PERIODS.map((p) => horario[p]?.[String(dayNum)]?.horario ?? '-').filter(
    (s) => s && s !== '-',
  );
}

export function getSchedule(end, dayNum) {
  const raws = scheduleRawsForDay(end, dayNum);
  if (!raws.length) return '-';
  return raws.map(convertHorario).join(', ');
}

function prevDayNum(dayNum) {
  return dayNum === 1 ? 7 : dayNum - 1;
}

function dayRanges(end, dayNum) {
  return scheduleRawsForDay(end, dayNum)
    .map((raw) => parseRange(raw))
    .filter(Boolean);
}

function isMinutesInRange(minutes, [start, end]) {
  if (end > start) return minutes >= start && minutes < end;
  return minutes >= start || minutes < end;
}

function rangeOverlapsWindow([r0, r1], start, end) {
  if (r1 > r0) return r0 < end && r1 > start;
  return r0 < end || r1 > start;
}

function isOpenAtAddress(end, dayNum, minutes) {
  for (const r of dayRanges(end, dayNum)) {
    if (isMinutesInRange(minutes, r)) return true;
  }
  for (const r of dayRanges(end, prevDayNum(dayNum))) {
    if (r[1] <= r[0] && minutes < r[1]) return true;
  }
  return false;
}

export function isOpenAt(cupom, dayNum, minutes) {
  return (cupom.endereco || []).some((end) => isOpenAtAddress(end, dayNum, minutes));
}

export function opensDuring(cupom, dayNum, start, end) {
  return (cupom.endereco || []).some((addr) => {
    for (const r of dayRanges(addr, dayNum)) {
      if (rangeOverlapsWindow(r, start, end)) return true;
    }
    return false;
  });
}

export function horarioDisplay(cupom, dayNum) {
  const seen = new Set();
  (cupom.endereco || []).forEach((e) => {
    const h = getSchedule(e, dayNum);
    if (h !== '-') seen.add(h);
  });
  const hrs = [...seen];
  return hrs.length ? hrs[0] : '-';
}

function dist2(la1, ln1, la2, ln2) {
  if (!la2 || !ln2) return Infinity;
  return (la1 - la2) ** 2 + (ln1 - ln2) ** 2;
}

export { dist2 };
