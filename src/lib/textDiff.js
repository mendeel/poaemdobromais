// Word-level diff for the "O que mudou" panel: marks the words that left
// (before) and the ones that came in (after), and collapses lines that are
// identical on both sides into a single "…" so long rules show only what moved.

// LCS over two token arrays → [{ t: 'eq' | 'del' | 'ins', v }]
function diffTokens(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ t: 'eq', v: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ t: 'del', v: a[i++] });
    } else {
      ops.push({ t: 'ins', v: b[j++] });
    }
  }
  while (i < n) ops.push({ t: 'del', v: a[i++] });
  while (j < m) ops.push({ t: 'ins', v: b[j++] });
  return ops;
}

// words, single punctuation marks and whitespace runs — whitespace is kept as
// tokens so the original spacing renders exactly
const tokenize = (text) => text.match(/\n|[^\S\n]+|[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];

function pushToken(segs, token, mark) {
  segs.push({ text: token, mark });
}

// Many small changed runs with few surviving words = a rewritten sentence,
// where word-by-word marks are just noise.
function mostlyRewritten(ops) {
  let same = 0;
  let before = 0;
  let after = 0;
  let runs = 0;
  let inRun = false;
  for (const { t, v } of ops) {
    if (!v.trim()) continue;
    if (t === 'eq') same++;
    if (t !== 'ins') before++;
    if (t !== 'del') after++;
    if (t !== 'eq' && !inRun) runs++;
    inRun = t !== 'eq';
  }
  return runs >= 3 && same < 0.5 * Math.min(before, after);
}

// Whitespace is only highlighted when it sits inside a highlighted run; then
// adjacent pieces with the same highlight are merged.
function finish(segs) {
  const out = [];
  segs.forEach((seg, i) => {
    if (seg.gap) return out.push(seg);
    let mark = seg.mark;
    if (!seg.text.trim()) {
      // line breaks never carry a highlight; spaces only inside a marked run
      mark = !seg.text.includes('\n') && Boolean(segs[i - 1]?.mark && segs[i + 1]?.mark);
    }
    const last = out[out.length - 1];
    if (last && !last.gap && last.mark === mark) last.text += seg.text;
    else out.push({ text: seg.text, mark });
  });
  return out;
}

/**
 * @returns {{ before: Array<{text?: string, mark?: boolean, gap?: true}>,
 *             after:  Array<{text?: string, mark?: boolean, gap?: true}> }}
 */
export function textDiff(before = '', after = '') {
  const lineOps = diffTokens(before.split('\n'), after.split('\n'));

  // group into blocks: runs of unchanged lines vs runs of changed lines
  const blocks = [];
  for (const op of lineOps) {
    const kind = op.t === 'eq' ? 'eq' : 'chg';
    let block = blocks[blocks.length - 1];
    if (!block || block.kind !== kind) {
      block = { kind, del: [], ins: [], eq: [] };
      blocks.push(block);
    }
    if (op.t === 'eq') block.eq.push(op.v);
    else if (op.t === 'del') block.del.push(op.v);
    else block.ins.push(op.v);
  }

  const out = { before: [], after: [] };
  const gap = (side) => {
    if (!out[side].at(-1)?.gap) out[side].push({ gap: true });
  };

  blocks.forEach((block) => {
    if (block.kind === 'eq') {
      const meaningful = block.eq.some((l) => l.trim());
      for (const side of ['before', 'after']) {
        if (meaningful) gap(side);
        // blank separator lines: keep a line break between changed blocks
        else if (out[side].length && !out[side].at(-1).gap) pushToken(out[side], '\n', false);
      }
      return;
    }
    // same number of lines (e.g. one per weekday): pair them up so words
    // never get matched across different lines
    const pairs =
      block.del.length === block.ins.length
        ? block.del.map((l, i) => [l, block.ins[i]])
        : [[block.del.join('\n'), block.ins.join('\n')]];
    pairs.forEach(([b, a], i) => {
      if (i > 0) {
        pushToken(out.before, '\n', false);
        pushToken(out.after, '\n', false);
      }
      const ops = diffTokens(tokenize(b), tokenize(a));
      if (mostlyRewritten(ops)) {
        // word-by-word marks on a rewritten sentence are just noise
        if (b) pushToken(out.before, b, true);
        if (a) pushToken(out.after, a, true);
        return;
      }
      for (const op of ops) {
        if (op.t !== 'ins') pushToken(out.before, op.v, op.t === 'del');
        if (op.t !== 'del') pushToken(out.after, op.v, op.t === 'ins');
      }
    });
  });

  return { before: finish(out.before), after: finish(out.after) };
}
