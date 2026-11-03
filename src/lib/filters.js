import { isOpenAt, opensDuring, horarioDisplay, dist2 } from './schedule.js';

// minutes-since-midnight windows, matching the sidebar preset labels
const PRESET_WINDOWS = {
  cafeManha: [7 * 60, 11 * 60 + 30], // 07:00–11:30
  almoco: [11 * 60 + 30, 15 * 60], // 11:30–15:00
  lanche: [15 * 60, 19 * 60], // 15:00–19:00
  jantar: [19 * 60, 23 * 60], // 19:00–23:00
};

// Pure: given the full cupom list, the filter state, and the favorites Set,
// returns the filtered + sorted list. Ported from index.html applyFilters(),
// minus the Plano filter; "favorito" now means user localStorage favorites.
// changeStatus: Map of cupom id -> 'new' | 'changed' from the selected update.
export function applyFilters(cupoms, f, favorites, now, changeStatus) {
  let list = cupoms;

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
  if (f.novidades && changeStatus) list = list.filter((c) => changeStatus.has(c.id));

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
