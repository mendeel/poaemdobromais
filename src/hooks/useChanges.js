import { useCallback, useEffect, useMemo, useState } from 'react';

const SEEN_KEY = 'betterped:lastSeenChange';

// Loads the update history written by scrape.py (data/changes/). The selected
// changelog (latest by default) drives the card badges and "Novidades" filter.
// Bump `reloadKey` to re-read the index after new data was published.
export function useChanges(reloadKey = 0) {
  const [index, setIndex] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState({}); // id -> changelog
  const [lastSeen, setLastSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    fetch('data/changes/index.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : []))
      .then((idx) => {
        setIndex(idx);
        if (idx[0]) setSelectedId(idx[0].id);
      })
      .catch(() => {});
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedId || logs[selectedId]) return;
    fetch(`data/changes/${selectedId}.json`)
      .then((r) => r.json())
      .then((log) => setLogs((prev) => ({ ...prev, [selectedId]: log })))
      .catch(() => {});
  }, [selectedId, logs]);

  const changelog = selectedId ? (logs[selectedId] ?? null) : null;

  // cupom id -> 'new' | 'changed'
  const statusById = useMemo(() => {
    const m = new Map();
    if (!changelog) return m;
    changelog.added.forEach((c) => m.set(c.id, 'new'));
    changelog.changed.forEach((c) => m.set(c.id, 'changed'));
    return m;
  }, [changelog]);

  const latestId = index[0]?.id ?? null;
  const hasUnseen = Boolean(latestId && latestId !== lastSeen);

  const markSeen = useCallback(() => {
    if (!latestId) return;
    try {
      localStorage.setItem(SEEN_KEY, latestId);
    } catch {
      /* ignore quota / private-mode errors */
    }
    setLastSeen(latestId);
  }, [latestId]);

  return {
    index,
    selectedId,
    select: setSelectedId,
    changelog,
    statusById,
    hasUnseen,
    markSeen,
  };
}
