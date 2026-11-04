// Shared by the app and the Worker (worker/index.js).

export const CATEGORIES = [
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'comida', label: 'Comida' },
  { key: 'ambiente', label: 'Ambiente' },
];

// Wait time is a three-way answer instead of stars, so it stays out of the
// overall score. `value` is what's stored in D1; `key` is the count the API
// returns for it.
export const ESPERA = [
  { value: 1, key: 'espera_rapido', label: 'Rápido' },
  { value: 2, key: 'espera_esperado', label: 'Como esperado' },
  { value: 3, key: 'espera_demorado', label: 'Demorado' },
];

// Below this many answers a single slow visit would decide the card badge.
const MIN_ESPERA_ANSWERS = 3;

const VOTER_ID_RE = /^[0-9a-f]{32}$/;

// Every vote carries all three scores, so the mean of the category means is
// also the mean of each voter's own overall score.
export function overallScore(agg) {
  if (!agg?.n) return null;
  return CATEGORIES.reduce((sum, c) => sum + agg[c.key], 0) / CATEGORIES.length;
}

export function formatScore(x) {
  return x.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatCount(n) {
  return n === 1 ? '1 avaliação' : `${n} avaliações`;
}

// Votes from before the wait question have no answer, so the shares are out
// of the votes that answered it. Returns null when nobody has.
export function esperaSummary(agg) {
  const n = ESPERA.reduce((sum, o) => sum + (agg?.[o.key] ?? 0), 0);
  if (!n) return null;
  return {
    n,
    options: ESPERA.map((o) => ({ ...o, count: agg[o.key], share: agg[o.key] / n })),
  };
}

export function isUsuallySlow(agg) {
  const s = esperaSummary(agg);
  if (!s || s.n < MIN_ESPERA_ANSWERS) return false;
  return s.options.find((o) => o.key === 'espera_demorado').share > 0.5;
}

export function esperaLabel(value) {
  return ESPERA.find((o) => o.value === value)?.label ?? null;
}

// Validates a POST body. Returns { voterId, scores, espera } or null.
export function parseVote(body) {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.voterId !== 'string' || !VOTER_ID_RE.test(body.voterId)) return null;
  const scores = {};
  for (const { key } of CATEGORIES) {
    const v = body[key];
    if (!Number.isInteger(v) || v < 1 || v > 5) return null;
    scores[key] = v;
  }
  if (!ESPERA.some((o) => o.value === body.espera)) return null;
  return { voterId: body.voterId, scores, espera: body.espera };
}

// 128 random bits as hex. getRandomValues (unlike randomUUID) also works on
// plain-http LAN dev URLs.
export function newVoterId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
