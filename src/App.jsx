import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import CardGrid from './components/CardGrid.jsx';
import MapView from './components/MapView.jsx';
import CupomModal from './components/CupomModal.jsx';
import { useFilters } from './state/useFilters.js';
import { useFavorites } from './hooks/useLocalStorage.js';
import { useNow } from './hooks/useNow.js';
import { applyFilters } from './lib/filters.js';

export default function App() {
  const [cupoms, setCupoms] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState('list');

  const { filters, dispatch } = useFilters();
  const [favorites, toggleFavorite] = useFavorites();
  const now = useNow();

  useEffect(() => {
    Promise.all([
      fetch('data/all_cupoms.json').then((r) => r.json()),
      fetch('data/config.json').then((r) => r.json()),
    ])
      .then(([cs, cfg]) => {
        setCupoms(cs);
        setConfig(cfg);
      })
      .catch((e) => setError(String(e)));
  }, []);

  // request geolocation only when the user picks "distância"
  useEffect(() => {
    if (filters.sort === 'dist' && filters.userLat === null) {
      navigator.geolocation?.getCurrentPosition((pos) => {
        dispatch({ type: 'set', key: 'userLat', value: pos.coords.latitude });
        dispatch({ type: 'set', key: 'userLng', value: pos.coords.longitude });
      });
    }
  }, [filters.sort, filters.userLat, dispatch]);

  const subcatOptions = useMemo(
    () => (config?.subCategoria || []).map((s) => s.nome),
    [config],
  );
  const caractOptions = useMemo(
    () => (config?.caracteristica || []).map((c) => c.nome),
    [config],
  );
  const bairroOptions = useMemo(() => {
    if (!cupoms) return [];
    return [
      ...new Set(
        cupoms.flatMap((c) => (c.endereco || []).map((e) => e.bairro).filter(Boolean)),
      ),
    ].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [cupoms]);

  const filtered = useMemo(
    () => (cupoms ? applyFilters(cupoms, filters, favorites, now) : []),
    [cupoms, filters, favorites, now],
  );

  // Signature of the inputs that change which/what-order cards show — used to
  // re-run the grid entrance animation. Deliberately excludes `favorites` and
  // `now` so favoriting a card (or a minute tick) doesn't re-animate the grid.
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        s: filters.search,
        sc: [...filters.subcats],
        b: [...filters.bairros],
        ca: [...filters.caracts],
        a: filters.abertoAgora,
        p: [...filters.activePresets],
        t: filters.customTime,
        d: [...filters.selectedDays],
        f: filters.favorito,
        sort: filters.sort,
      }),
    [filters],
  );

  // Card schedule line: the single selected day if exactly one, else today.
  const dayNum =
    !filters.abertoAgora && filters.selectedDays.size === 1
      ? [...filters.selectedDays][0]
      : now.day;

  if (error) {
    return (
      <div className="grid h-dvh place-items-center p-8 text-center text-fg-muted">
        Erro ao carregar dados: {error}
      </div>
    );
  }
  if (!cupoms || !config) {
    return (
      <div className="grid h-dvh place-items-center text-fg-muted">
        <div className="animate-pulse font-display text-2xl text-primary">
          POA Em Dobro++
        </div>
      </div>
    );
  }

  return (
    // Mobile: the document scrolls (so iOS status-bar tap scrolls to top).
    // Desktop: fixed app-shell with an internal scroll region.
    <div className="flex min-h-dvh md:h-dvh md:overflow-hidden">
      {/* desktop sidebar */}
      <aside className="hidden h-full w-[286px] shrink-0 border-r border-brd md:block">
        <Sidebar
          filters={filters}
          dispatch={dispatch}
          subcatOptions={subcatOptions}
          bairroOptions={bairroOptions}
          caractOptions={caractOptions}
          resultCount={filtered.length}
          totalCount={cupoms.length}
        />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {navOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-[800] bg-black/45 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setNavOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-[900] w-full md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 38 }}
            >
              <Sidebar
                filters={filters}
                dispatch={dispatch}
                subcatOptions={subcatOptions}
                bairroOptions={bairroOptions}
                caractOptions={caractOptions}
                resultCount={filtered.length}
                totalCount={cupoms.length}
                onClose={() => setNavOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        <Topbar
          filteredCount={filtered.length}
          totalCount={cupoms.length}
          sort={filters.sort}
          onSortChange={(v) => dispatch({ type: 'set', key: 'sort', value: v })}
          onOpenMenu={() => setNavOpen(true)}
          searchValue={filters.search}
          onSearchChange={(v) => dispatch({ type: 'set', key: 'search', value: v })}
          view={view}
          onViewChange={setView}
        />
        {view === 'list' ? (
          <CardGrid
            cupoms={filtered}
            filterKey={filterKey}
            dayNum={dayNum}
            now={now}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onOpen={setSelected}
          />
        ) : (
          <MapView cupoms={filtered} now={now} onOpen={setSelected} />
        )}
      </main>

      <CupomModal
        cupom={selected}
        now={now}
        isFavorite={selected ? favorites.has(selected.id) : false}
        onToggleFavorite={toggleFavorite}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
