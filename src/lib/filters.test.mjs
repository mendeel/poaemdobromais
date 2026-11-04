import assert from 'node:assert/strict';
import { applyFilters } from './filters.js';

const base = {
  search: '',
  subcats: new Set(),
  bairros: new Set(),
  caracts: new Set(),
  abertoAgora: false,
  activePresets: new Set(),
  customTime: null,
  selectedDays: new Set(),
  favorito: false,
  visitado: false,
  novidades: false,
  minNota: null,
  sort: 'nome',
  userLat: null,
  userLng: null,
};
const cupoms = [
  { id: '1', nome: 'Alfa' },
  { id: '2', nome: 'Beta' },
  { id: '3', nome: 'Gama' },
  { id: '4', nome: 'Delta' },
];
const agg = (x, n) => ({ n, atendimento: x, comida: x, ambiente: x });
const ctx = {
  favorites: new Set(),
  visited: new Set(['2', '4']),
  newIds: new Set(['3']),
  ratings: { 1: agg(3, 5), 2: agg(4.5, 1), 4: agg(4.5, 3) },
  now: { day: 1, minutes: 600 },
};
const ids = (f) => applyFilters(cupoms, { ...base, ...f }, ctx).map((c) => c.id);

assert.deepEqual(ids({}), ['1', '2', '4', '3']);
assert.deepEqual(ids({ visitado: true }), ['2', '4']);
assert.deepEqual(ids({ novidades: true }), ['3']);

// best score first, more votes break ties, unrated last
assert.deepEqual(ids({ sort: 'nota' }), ['4', '2', '1', '3']);

// minimum score drops unrated places
assert.deepEqual(ids({ minNota: 4 }), ['2', '4']);
assert.deepEqual(ids({ minNota: 3 }), ['1', '2', '4']);

// no ratings loaded yet: sorting by score falls back to name
assert.deepEqual(
  applyFilters(cupoms, { ...base, sort: 'nota' }, { ...ctx, ratings: {} }).map((c) => c.id),
  ['1', '2', '4', '3'],
);

console.log('filters tests passed');
