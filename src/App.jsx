import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import CardGrid from './components/CardGrid.jsx';
import MapView from './components/MapView.jsx';
import CupomModal from './components/CupomModal.jsx';
import RateModal from './components/RateModal.jsx';
import ChangesPanel from './components/ChangesPanel.jsx';
import UpdateToast from './components/UpdateToast.jsx';
import { useFilters } from './state/useFilters.js';
import { useFavorites, useVisited } from './hooks/useLocalStorage.js';
import { useNow } from './hooks/useNow.js';
import { useChanges } from './hooks/useChanges.js';
import { useDataVersion } from './hooks/useDataVersion.js';
import { useRatings } from './hooks/useRatings.js';
import { useCupomRoute } from './hooks/useCupomRoute.js';
import { applyFilters } from './lib/filters.js';

const TITLE = 'POA Em Dobro+';

export default function App() {
  const [cupoms, setCupoms] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, openCupom, closeCupom] = useCupomRoute();
  const [navOpen, setNavOpen] = useState(false);
  const [view, setView] = useState('list');
  const [changesOpen, setChangesOpen] = useState(false);
  const [rateId, setRateId] = useState(null);

  const { filters, dispatch } = useFilters();
  const [favorites, toggleFavorite] = useFavorites();
  const [visited, toggleVisited] = useVisited();
  const now = useNow();

  // New data gets published while the app may be open: when meta.json's
  // version moves past the one we started with, re-fetch everything.
  const version = useDataVersion();
  const seenVersion = useRef(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [showUpdated, setShowUpdated] = useState(false);
  useEffect(() => {
    if (!version) return;
    if (seenVersion.current && seenVersion.current !== version) {
      setReloadKey((k) => k + 1);
      setShowUpdated(true);
    }
    seenVersion.current = version;
  }, [version]);

  const dismissUpdated = useCallback(() => setShowUpdated(false), []);

  const changes = useChanges(reloadKey);
  const { ratings, mine: myRatings, rate } = useRatings(reloadKey);

  useEffect(() => {
    const opts = { cache: 'no-cache' };
    Promise.all([
      fetch('/data/all_cupoms.json', opts).then((r) => r.json()),
      fetch('/data/config.json', opts).then((r) => r.json()),
    ])
      .then(([cs, cfg]) => {
        setCupoms(cs);
        setConfig(cfg);
      })
      .catch((e) => {
        // a failed background refresh keeps the data already on screen
        if (reloadKey === 0) setError(String(e));
      });
  }, [reloadKey]);

  // request geolocation only when the user picks "distância"
  useEffect(() => {
    if (filters.sort === 'dist' && filters.userLat === null) {
      navigator.geolocation?.getCurrentPosition((pos) => {
        dispatch({ type: 'set', key: 'userLat', value: pos.coords.latitude });
        dispatch({ type: 'set', key: 'userLng', value: pos.coords.longitude });
      });
    }
  }, [filters.sort, filters.userLat, dispatch]);

  // config order first, then any category the cupons use that config lacks
  const subcatOptions = useMemo(() => {
    const names = (config?.subCategoria || []).map((s) => s.nome);
    const extra = new Set();
    (cupoms || []).forEach((c) =>
      (c.sub_categoria || '').split(',').forEach((s) => {
        const t = s.trim();
        if (t && !names.includes(t)) extra.add(t);
      }),
    );
    return [...names, ...[...extra].sort((a, b) => a.localeCompare(b, 'pt'))];
  }, [config, cupoms]);
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

  // A past vote counts as a visit (see RatingSection), so rated places are
  // "Já fui" everywhere too.
  const visitedAll = useMemo(
    () => new Set([...visited, ...Object.keys(myRatings)]),
    [visited, myRatings],
  );

  const filtered = useMemo(
    () =>
      cupoms
        ? applyFilters(cupoms, filters, {
            favorites,
            visited: visitedAll,
            newIds: changes.newIds,
            ratings,
            now,
          })
        : [],
    [cupoms, filters, favorites, visitedAll, changes.newIds, ratings, now],
  );

  const cupomsById = useMemo(() => new Map((cupoms || []).map((c) => [c.id, c])), [cupoms]);
  const selected = (selectedId && cupomsById.get(selectedId)) || null;
  const rateTarget = (rateId && cupomsById.get(rateId)) || null;

  // Marking "Já fui" on a card opens the rating form right away, like in the
  // cupom modal. Unmarking just toggles.
  const toggleVisitedFromCard = useCallback(
    (id, marking) => {
      toggleVisited(id);
      if (marking) setRateId(id);
    },
    [toggleVisited],
  );
  const closeRate = useCallback(() => setRateId(null), []);

  // A link to a cupom that no longer exists falls back to the home page.
  useEffect(() => {
    if (cupoms && selectedId && !cupomsById.has(selectedId)) closeCupom();
  }, [cupoms, cupomsById, selectedId, closeCupom]);

  useEffect(() => {
    document.title = selected ? `${selected.nome} · ${TITLE}` : TITLE;
  }, [selected]);

  const openChanges = useCallback(() => {
    setChangesOpen(true);
    changes.markSeen();
  }, [changes.markSeen]);
  const closeChanges = useCallback(() => setChangesOpen(false), []);

  // Signature of the inputs that change which/what-order cards show — used to
  // re-run the grid entrance animation. Deliberately excludes `favorites`,
  // `visited`, `ratings` and `now` so tapping a card's heart/"Já fui" (or a
  // minute tick) doesn't re-animate the grid.
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
        v: filters.visitado,
        n: filters.novidades,
        mn: filters.minNota,
        cl: changes.selectedId,
        sort: filters.sort,
      }),
    [filters, changes.selectedId],
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
          POA Em Dobro+
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
          novidadesCount={changes.newIds.size}
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
                novidadesCount={changes.newIds.size}
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
          hasUnseenChanges={changes.hasUnseen}
          onOpenChanges={changes.index.length ? openChanges : undefined}
        />
        {view === 'list' ? (
          <CardGrid
            cupoms={filtered}
            filterKey={filterKey}
            dayNum={dayNum}
            now={now}
            favorites={favorites}
            visited={visitedAll}
            rated={myRatings}
            newIds={changes.newIds}
            ratings={ratings}
            onToggleFavorite={toggleFavorite}
            onToggleVisited={toggleVisitedFromCard}
            onOpen={openCupom}
          />
        ) : (
          <MapView cupoms={filtered} ratings={ratings} now={now} onOpen={openCupom} />
        )}
      </main>

      <CupomModal
        cupom={selected}
        now={now}
        isFavorite={selected ? favorites.has(selected.id) : false}
        onToggleFavorite={toggleFavorite}
        rating={selected ? ratings[selected.id] : undefined}
        myRating={selected ? myRatings[selected.id] : undefined}
        visited={selected ? visited.has(selected.id) : false}
        onToggleVisited={toggleVisited}
        onRate={rate}
        onClose={closeCupom}
      />

      <RateModal cupom={rateTarget} onRate={rate} onClose={closeRate} />

      <ChangesPanel
        open={changesOpen}
        onClose={closeChanges}
        paused={Boolean(selected)}
        index={changes.index}
        selectedId={changes.selectedId}
        onSelect={changes.select}
        changelog={changes.changelog}
        cupomsById={cupomsById}
        onOpenCupom={openCupom}
      />

      <UpdateToast
        show={showUpdated}
        onDismiss={dismissUpdated}
        onOpenChanges={() => {
          setShowUpdated(false);
          openChanges();
        }}
      />
    </div>
  );
}
