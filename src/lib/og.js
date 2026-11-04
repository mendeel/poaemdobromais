// Link previews (WhatsApp, Telegram, iMessage…) for shared cupom links.
// ogIndex() runs at build time (vite.config.js) so the Worker only bundles the
// few fields it needs instead of parsing all_cupoms.json on every request.

export const SITE_NAME = 'POA Em Dobro+';

// "um prato (ver regras)" + "ganhe outro igual." → "Peça um prato e ganhe outro igual."
export function offerText(c) {
  const item = (c.descricao ?? '').replace(/\s*\(ver regras\)\s*/i, '').trim();
  const benefit = (c.beneficio ?? '').trim();
  if (!item) return benefit ? capitalize(benefit) : '';
  return `Peça ${item}${benefit ? ` e ${benefit}` : '.'}`;
}

export function ogDescription(c) {
  const bairros = [...new Set((c.endereco || []).map((e) => e.bairro).filter(Boolean))];
  return [offerText(c), bairros.length ? `${bairros.join(', ')}.` : '']
    .filter(Boolean)
    .join(' ');
}

export function ogIndex(cupoms) {
  const index = {};
  for (const c of cupoms) {
    index[c.id] = { nome: c.nome ?? '', description: ogDescription(c), image: c.image || null };
  }
  return index;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

// The <head> tags for one cupom; `url` is the absolute canonical link.
export function ogTags({ nome, description, image }, url) {
  const title = `${nome} · ${SITE_NAME}`;
  const meta = [
    ['name', 'description', description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', SITE_NAME],
    ['property', 'og:locale', 'pt_BR'],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', url],
    image && ['property', 'og:image', image],
    ['name', 'twitter:card', image ? 'summary_large_image' : 'summary'],
  ].filter(Boolean);
  return [
    ...meta.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`),
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
  ].join('\n  ');
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
