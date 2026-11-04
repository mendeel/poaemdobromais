import assert from 'node:assert/strict';
import { slugify, cupomPath, cupomIdFromPath } from './cupomUrl.js';

assert.equal(slugify('Café & Pão — São João'), 'cafe-pao-sao-joao');
assert.equal(slugify('  !!  '), '');
assert.equal(slugify(undefined), '');
assert.ok(slugify('a'.repeat(100)).length <= 60);
assert.ok(!slugify(`${'a'.repeat(59)} bb`).endsWith('-'));

assert.equal(cupomPath({ id: '1871', nome: 'Sabor de Luna' }), '/r/1871-sabor-de-luna');
assert.equal(cupomPath({ id: '7', nome: '' }), '/r/7');

assert.equal(cupomIdFromPath('/r/1871-sabor-de-luna'), '1871');
assert.equal(cupomIdFromPath('/r/1871'), '1871');
assert.equal(cupomIdFromPath('/r/1871/'), '1871');
// the slug is decorative: an old name still opens the place
assert.equal(cupomIdFromPath('/r/1871-nome-antigo'), '1871');
assert.equal(cupomIdFromPath('/'), null);
assert.equal(cupomIdFromPath('/r/'), null);
assert.equal(cupomIdFromPath('/r/abc'), null);
assert.equal(cupomIdFromPath('/x/1871'), null);

console.log('cupomUrl tests passed');
