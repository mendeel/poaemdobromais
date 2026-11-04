import assert from 'node:assert/strict';
import { offerText, ogDescription, ogIndex, ogTags, escapeHtml } from './og.js';

const c = {
  id: '1871',
  nome: 'Sabor de Luna',
  descricao: 'um prato selecionado (ver regras)',
  beneficio: 'ganhe outro igual.',
  image: 'https://cdn.example/x.jpg',
  endereco: [{ bairro: "Mont'Serrat" }, { bairro: 'Bela Vista' }, { bairro: "Mont'Serrat" }],
};

assert.equal(offerText(c), 'Peça um prato selecionado e ganhe outro igual.');
assert.equal(offerText({ descricao: '', beneficio: 'ganhe outro.' }), 'Ganhe outro.');
assert.equal(offerText({ descricao: 'um café' }), 'Peça um café.');
assert.equal(
  ogDescription(c),
  "Peça um prato selecionado e ganhe outro igual. Mont'Serrat, Bela Vista.",
);

assert.deepEqual(ogIndex([c]), {
  1871: { nome: 'Sabor de Luna', description: ogDescription(c), image: c.image },
});

assert.equal(escapeHtml(`a"<b>&'`), 'a&quot;&lt;b&gt;&amp;&#39;');

const tags = ogTags({ nome: 'Bar "X" & <Cia>', description: 'd', image: null }, 'https://s/r/1-bar');
assert.match(tags, /<meta property="og:title" content="Bar &quot;X&quot; &amp; &lt;Cia&gt; · POA Em Dobro\+" \/>/);
assert.match(tags, /<meta property="og:url" content="https:\/\/s\/r\/1-bar" \/>/);
assert.match(tags, /twitter:card" content="summary"/);
assert.doesNotMatch(tags, /og:image/);
assert.match(ogTags(ogIndex([c])[1871], 'u'), /og:image" content="https:\/\/cdn.example\/x.jpg"/);

console.log('og tests passed');
