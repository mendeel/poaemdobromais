import assert from 'node:assert/strict';
import { overallScore, formatScore, formatCount, parseVote, newVoterId } from './ratings.js';

// overall = mean of the three category means
assert.equal(overallScore({ n: 2, atendimento: 5, comida: 4, ambiente: 3 }), 4);
assert.equal(overallScore(undefined), null);
assert.equal(overallScore({ n: 0 }), null);

assert.equal(formatScore(4.25), '4,3');
assert.equal(formatScore(4), '4,0');
assert.equal(formatCount(1), '1 avaliação');
assert.equal(formatCount(12), '12 avaliações');

const voterId = newVoterId();
assert.match(voterId, /^[0-9a-f]{32}$/);
assert.notEqual(newVoterId(), voterId);

const ok = { voterId, atendimento: 5, comida: 1, ambiente: 3 };
assert.deepEqual(parseVote(ok), { voterId, scores: { atendimento: 5, comida: 1, ambiente: 3 } });

// all three categories are required, integers 1–5 only
assert.equal(parseVote({ ...ok, ambiente: undefined }), null);
assert.equal(parseVote({ ...ok, comida: 0 }), null);
assert.equal(parseVote({ ...ok, comida: 6 }), null);
assert.equal(parseVote({ ...ok, comida: 4.5 }), null);
assert.equal(parseVote({ ...ok, comida: '4' }), null);
assert.equal(parseVote({ ...ok, voterId: 'nope' }), null);
assert.equal(parseVote(null), null);
// extra fields are dropped
assert.deepEqual(parseVote({ ...ok, ip_hash: 'x' }).scores, { atendimento: 5, comida: 1, ambiente: 3 });

console.log('ratings tests passed');
