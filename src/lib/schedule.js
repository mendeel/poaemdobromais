// Time-open logic — ported from the original vanilla index.html.

export function todayDay() {
  const d = new Date().getDay(); // JS: 0=Sun
  return d === 0 ? 7 : d; // Their: 1=Seg, 7=Dom
}

export function nowMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export function parseRange(str) {
  if (!str || str === '-') return null;
  const p = str.split(' - ');
  if (p.length !== 2) return null;
  const m = (s) => {
    const [h, mm] = s.split(':').map(Number);
    return h * 60 + mm;
  };
  return [m(p[0]), m(p[1])];
}

export function getSchedule(end, dayNum) {
  const period = end?.period_default ?? 'A';
  return end?.horario?.[period]?.[String(dayNum)]?.horario ?? '-';
}

function prevDayNum(dayNum) {
  return dayNum === 1 ? 7 : dayNum - 1;
}

// Only the address's default period (A or J) is its real operating schedule —
// the other period belongs to a different mode and must not count as "open".
function dayRanges(end, dayNum) {
  const r = parseRange(getSchedule(end, dayNum));
  return r ? [r] : [];
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
  (cupom.endereco || []).forEach((e) => seen.add(getSchedule(e, dayNum)));
  const hrs = [...seen].filter((s) => s !== '-');
  return hrs.length ? hrs[0] : '-';
}

function dist2(la1, ln1, la2, ln2) {
  if (!la2 || !ln2) return Infinity;
  return (la1 - la2) ** 2 + (ln1 - ln2) ** 2;
}

export { dist2 };
