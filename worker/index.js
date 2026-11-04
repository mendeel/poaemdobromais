import ogIndex from 'virtual:og-index';
import { CATEGORIES, parseVote } from '../src/lib/ratings.js';
import { cupomIdFromPath, cupomPath } from '../src/lib/cupomUrl.js';
import { SITE_NAME, ogTags } from '../src/lib/og.js';

const LIST_PATH = '/api/ratings';
const VOTE_PATH_RE = /^\/api\/ratings\/(\d{1,12})$/;
const CACHE_SECONDS = 60;
const DAILY_VOTES_PER_IP = 60;
const MAX_BODY_BYTES = 1024;

const AVG_COLUMNS = CATEGORIES.map((c) => `ROUND(AVG(${c.key}), 2) AS ${c.key}`).join(', ');

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/r/')) {
      return cupomPage(url, env).catch((err) => {
        console.error(JSON.stringify({ message: 'cupom page failed', path: url.pathname, error: String(err) }));
        return env.ASSETS.fetch(new URL('/', url));
      });
    }
    try {
      if (url.pathname === LIST_PATH && request.method === 'GET') {
        return await listRatings(url, env, ctx);
      }
      const match = url.pathname.match(VOTE_PATH_RE);
      if (match && request.method === 'POST') {
        return await submitVote(request, url, env, ctx, match[1]);
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      console.error(JSON.stringify({ message: 'ratings api failed', path: url.pathname, error: String(err) }));
      return json({ error: 'internal error' }, 500);
    }
  },
};

// Shared cupom links get the app shell with that place's title, description
// and photo in <head>, so chat apps show a real preview. The app itself opens
// the cupom from the URL; unknown ids just get the plain shell.
async function cupomPage(url, env) {
  const shell = await env.ASSETS.fetch(new URL('/', url));
  const id = cupomIdFromPath(url.pathname);
  const cupom = id && ogIndex[id];
  if (!cupom || !shell.ok) return shell;

  const canonical = url.origin + cupomPath({ id, nome: cupom.nome });
  const remove = { element: (el) => el.remove() };
  const response = new HTMLRewriter()
    .on('meta[name="description"]', remove)
    .on('meta[property^="og:"]', remove)
    .on('meta[name^="twitter:"]', remove)
    .on('title', { element: (el) => el.setInnerContent(`${cupom.nome} · ${SITE_NAME}`) })
    .on('head', { element: (el) => el.append(ogTags(cupom, canonical), { html: true }) })
    .transform(shell);

  const headers = new Headers(response.headers);
  headers.delete('ETag'); // the body no longer matches the shell's ETag
  return new Response(response.body, { status: 200, headers });
}

function json(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers });
}

// Every visitor needs every restaurant's averages, so they come as one small
// JSON, cached per colo for a minute to keep D1 reads low.
async function listRatings(url, env, ctx) {
  const cacheKey = new Request(url.origin + LIST_PATH);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const { results } = await env.DB.prepare(
    `SELECT cupom_id, COUNT(*) AS n, ${AVG_COLUMNS} FROM ratings GROUP BY cupom_id`,
  ).all();
  const byId = {};
  for (const { cupom_id, ...agg } of results) byId[cupom_id] = agg;

  const response = json(byId, 200, { 'Cache-Control': `public, max-age=${CACHE_SECONDS}` });
  ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
  return response;
}

async function submitVote(request, url, env, ctx, cupomId) {
  // Requiring JSON forces a CORS preflight, so other sites can't post votes
  // through a visitor's browser with a plain form.
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) {
    return json({ error: 'expected application/json' }, 415);
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: 'body too large' }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const vote = parseVote(body);
  if (!vote) return json({ error: 'invalid vote' }, 400);

  const now = Math.floor(Date.now() / 1000);
  const ipHash = await hashIp(request.headers.get('CF-Connecting-IP') ?? 'unknown', env.IP_SALT ?? '');

  const recent = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM ratings WHERE ip_hash = ? AND updated_at > ?',
  )
    .bind(ipHash, now - 86400)
    .first('n');
  if (recent >= DAILY_VOTES_PER_IP) {
    return json({ error: 'too many votes' }, 429);
  }

  const { atendimento, comida, ambiente } = vote.scores;
  const [, aggResult] = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ratings (cupom_id, voter_id, ip_hash, atendimento, comida, ambiente, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (cupom_id, voter_id) DO UPDATE SET
         ip_hash = excluded.ip_hash,
         atendimento = excluded.atendimento,
         comida = excluded.comida,
         ambiente = excluded.ambiente,
         updated_at = excluded.updated_at`,
    ).bind(cupomId, vote.voterId, ipHash, atendimento, comida, ambiente, now),
    env.DB.prepare(`SELECT COUNT(*) AS n, ${AVG_COLUMNS} FROM ratings WHERE cupom_id = ?`).bind(cupomId),
  ]);

  // Only clears this colo's copy, which is the one the voter reads from.
  ctx.waitUntil(caches.default.delete(new Request(url.origin + LIST_PATH)));
  return json(aggResult.results[0]);
}

// Only a salted hash of the IP is stored, enough to rate-limit.
async function hashIp(ip, salt) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ip));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
