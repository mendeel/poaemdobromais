import assert from 'node:assert/strict';
import { buildMarkers } from './markers.js';

// one pin per endereco
const a = {
  id: '1', lat: -30.1, lng: -51.1,
  endereco: [
    { latitude: -30.01, longitude: -51.21 },
    { latitude: -30.02, longitude: -51.22 },
  ],
};
let m = buildMarkers([a]);
assert.equal(m.length, 2);
assert.equal(m[0].cupom, a);
assert.deepEqual([m[0].lat, m[0].lng], [-30.01, -51.21]);
assert.equal(m[0].key, '1-0');
assert.equal(m[1].key, '1-1');

// fallback to top-level coords when no endereco coords
const b = { id: '2', lat: -30.05, lng: -51.25, endereco: [{ latitude: null, longitude: null }] };
m = buildMarkers([b]);
assert.equal(m.length, 1);
assert.deepEqual([m[0].lat, m[0].lng], [-30.05, -51.25]);
assert.equal(m[0].key, '2-0');

// no coords at all → skipped
const c = { id: '3', lat: null, lng: null, endereco: [] };
assert.equal(buildMarkers([c]).length, 0);

// multiple coupons accumulate
assert.equal(buildMarkers([a, b]).length, 3);

console.log('markers ok');
