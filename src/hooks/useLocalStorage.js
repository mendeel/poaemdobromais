import { useCallback, useState } from 'react';

// Persists a Set<string|number> of ids to localStorage. Returns
// [set, toggle] — the set identity changes on every toggle so React
// re-renders consumers.
export function useIdSet(key) {
  const [set, setSet] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  });

  const toggle = useCallback(
    (id) => {
      setSet((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* ignore quota / private-mode errors */
        }
        return next;
      });
    },
    [key],
  );

  return [set, toggle];
}

export function useFavorites(key = 'betterped:favorites') {
  return useIdSet(key);
}

// "Já fui": only places marked as visited can be rated.
export function useVisited(key = 'betterped:visited') {
  return useIdSet(key);
}
