import { isOpenAt, opensDuring, horarioDisplay, dist2 } from './schedule.js';
import { overallScore } from './ratings.js';

// minutes-since-midnight windows, matching the sidebar preset labels
const PRESET_WINDOWS = {
  cafeManha: [7 * 60, 11 * 60 + 30], // 07:00–11:30
  almoco: [11 * 60 + 30, 15 * 60], // 11:30–15:00
  lanche: [15 * 60, 19 * 60], // 15:00–19:00
  jantar: [19 * 60, 23 * 60], // 19:00–23:00
};

// Pure: given the full cupom list and the filter state, returns the filtered +
// sorted list. Context:
//   favorites, visited: Sets of cupom ids (localStorage)
//   newIds: Set of cupom ids added in the selected update
//   ratings: { [cupomId]: agg } from the ratings API
export function applyFilters(cupoms, f, { favorites, visited, newIds, ratings = {}, now }) {
  let list = cupoms;
  const score = (c) => overallScore(ratings[c.id]);

  if (f.search) {
    const q = f.search.toLowerCase();
    list = list.filter((c) =>
      `${c.nome} ${c.descricao}`.toLowerCase().includes(q),
    );
  }
  if (f.subcats.size) {
    list = list.filter((c) => {
      const cs = c.sub_categoria
        ? c.sub_categoria.split(', ').map((s) => s.trim())
        : [];
      return cs.some((s) => f.subcats.has(s));
    });
  }
  if (f.bairros.size) {
    list = list.filter((c) =>
      (c.endereco || []).some((e) => f.bairros.has(e.bairro)),
    );
  }
  if (f.caracts.size) {
    list = list.filter((c) =>
      (c.caracteristica || []).some((ch) => f.caracts.has(ch)),
    );
  }
  if (f.favorito) list = list.filter((c) => favorites.has(c.id));
  if (f.visitado) list = list.filter((c) => visited.has(c.id));
  if (f.novidades && newIds) list = list.filter((c) => newIds.has(c.id));
  if (f.minNota !== null) list = list.filter((c) => (score(c) ?? 0) >= f.minNota);

  // Time-based filters apply across any selected day; fall back to today when
  // no day is picked. Matches mean "open on ANY selected day" for "ANY selected
  // time window".
  const days = f.selectedDays.size ? [...f.selectedDays] : [now.day];
  if (f.abertoAgora) {
    list = list.filter((c) => isOpenAt(c, now.day, now.minutes));
  } else if (f.activePresets.size) {
    const windows = [...f.activePresets].map((p) => PRESET_WINDOWS[p]);
    list = list.filter((c) =>
      days.some((d) => windows.some(([s, e]) => opensDuring(c, d, s, e))),
    );
  } else if (f.customTime !== null) {
    list = list.filter((c) => days.some((d) => isOpenAt(c, d, f.customTime)));
  } else if (f.selectedDays.size) {
    // days picked with no time → places that have hours on any selected day
    list = list.filter((c) =>
      [...f.selectedDays].some((d) => horarioDisplay(c, d) !== '-'),
    );
  }

  list = [...list].sort((a, b) => {
    if (f.sort === 'nota') {
      // best first; unrated places go last, more votes break ties
      const diff = (score(b) ?? -1) - (score(a) ?? -1);
      if (diff) return diff;
      const votes = (ratings[b.id]?.n ?? 0) - (ratings[a.id]?.n ?? 0);
      if (votes) return votes;
    }
    if (f.sort === 'bairro') {
      return (a.endereco?.[0]?.bairro ?? '').localeCompare(
        b.endereco?.[0]?.bairro ?? '',
        'pt',
      );
    }
    if (f.sort === 'dist' && f.userLat !== null) {
      return (
        dist2(f.userLat, f.userLng, a.lat, a.lng) -
        dist2(f.userLat, f.userLng, b.lat, b.lng)
      );
    }
    return (a.nome ?? '').localeCompare(b.nome ?? '', 'pt');
  });

  return list;
}
