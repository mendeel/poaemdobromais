// Shareable cupom links: /r/<id>-<slug>. Only the id is read back, so a
// renamed place keeps working under its old link.

const PATH_RE = /^\/r\/(\d+)(?:-[^/]*)?\/?$/;

export function slugify(text) {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

export function cupomPath(cupom) {
  const slug = slugify(cupom.nome);
  return `/r/${cupom.id}${slug ? `-${slug}` : ''}`;
}

// Cupom ids in the data are strings, so this returns a string (or null).
export function cupomIdFromPath(pathname) {
  return pathname.match(PATH_RE)?.[1] ?? null;
}
