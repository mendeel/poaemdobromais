import assert from 'node:assert/strict';
import {
  overallScore,
  formatScore,
  formatCount,
  parseVote,
  newVoterId,
  esperaSummary,
  isUsuallySlow,
  esperaLabel,
} from './ratings.js';

// overall = mean of the three category means
assert.equal(overallScore({ n: 2, atendimento: 5, comida: 4, ambiente: 3 }), 4);
assert.equal(overallScore(undefined), null);
assert.equal(overallScore({ n: 0 }), null);
// the wait answers don't count toward it
assert.equal(overallScore({ n: 2, atendimento: 5, comida: 4, ambiente: 3, espera_demorado: 2 }), 4);

assert.equal(formatScore(4.25), '4,3');
assert.equal(formatScore(4), '4,0');
assert.equal(formatCount(1), '1 avaliação');
assert.equal(formatCount(12), '12 avaliações');

const voterId = newVoterId();
assert.match(voterId, /^[0-9a-f]{32}$/);
assert.notEqual(newVoterId(), voterId);

const ok = { voterId, atendimento: 5, comida: 1, ambiente: 3, espera: 2 };
assert.deepEqual(parseVote(ok), {
  voterId,
  scores: { atendimento: 5, comida: 1, ambiente: 3 },
  espera: 2,
});

// all three categories are required, integers 1–5 only
assert.equal(parseVote({ ...ok, ambiente: undefined }), null);
assert.equal(parseVote({ ...ok, comida: 0 }), null);
assert.equal(parseVote({ ...ok, comida: 6 }), null);
assert.equal(parseVote({ ...ok, comida: 4.5 }), null);
assert.equal(parseVote({ ...ok, comida: '4' }), null);
assert.equal(parseVote({ ...ok, voterId: 'nope' }), null);
assert.equal(parseVote(null), null);
// the wait answer is required too, 1–3 only
assert.equal(parseVote({ ...ok, espera: undefined }), null);
assert.equal(parseVote({ ...ok, espera: 0 }), null);
assert.equal(parseVote({ ...ok, espera: 4 }), null);
assert.equal(parseVote({ ...ok, espera: '2' }), null);
// extra fields are dropped
assert.deepEqual(parseVote({ ...ok, ip_hash: 'x' }).scores, { atendimento: 5, comida: 1, ambiente: 3 });

// shares are out of the votes that answered, not all votes
const agg = { n: 10, espera_rapido: 1, espera_esperado: 1, espera_demorado: 2 };
const s = esperaSummary(agg);
assert.equal(s.n, 4);
assert.deepEqual(s.options.map((o) => o.share), [0.25, 0.25, 0.5]);
assert.equal(esperaSummary({ n: 3, espera_rapido: 0, espera_esperado: 0, espera_demorado: 0 }), null);
assert.equal(esperaSummary(undefined), null);

// "usually slow" needs a majority of at least 3 answers
assert.equal(isUsuallySlow(agg), false);
assert.equal(isUsuallySlow({ ...agg, espera_demorado: 3 }), true);
assert.equal(isUsuallySlow({ n: 2, espera_rapido: 0, espera_esperado: 0, espera_demorado: 2 }), false);
assert.equal(isUsuallySlow(undefined), false);

assert.equal(esperaLabel(3), 'Demorado');
assert.equal(esperaLabel(undefined), null);

console.log('ratings tests passed');
