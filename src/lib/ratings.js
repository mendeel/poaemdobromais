// Shared by the app and the Worker (worker/index.js).

export const CATEGORIES = [
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'comida', label: 'Comida' },
  { key: 'ambiente', label: 'Ambiente' },
];

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

// Validates a POST body. Returns { voterId, scores } or null.
export function parseVote(body) {
  if (!body || typeof body !== 'object') return null;
  if (typeof body.voterId !== 'string' || !VOTER_ID_RE.test(body.voterId)) return null;
  const scores = {};
  for (const { key } of CATEGORIES) {
    const v = body[key];
    if (!Number.isInteger(v) || v < 1 || v > 5) return null;
    scores[key] = v;
  }
  return { voterId: body.voterId, scores };
}

// 128 random bits as hex. getRandomValues (unlike randomUUID) also works on
// plain-http LAN dev URLs.
export function newVoterId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
