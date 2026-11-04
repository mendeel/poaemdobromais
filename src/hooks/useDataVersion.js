import { useEffect, useState } from 'react';

const POLL_MS = 10 * 60 * 1000;

// Watches data/meta.json (rewritten by scrape.py whenever something changes)
// and returns its `updatedAt`. Checks every 10 min and whenever the tab comes
// back into view, so an open app picks up new data without a reload.
export function useDataVersion() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch('/data/meta.json', { cache: 'no-cache' })
        .then((r) => (r.ok ? r.json() : null))
        .then((meta) => {
          if (alive && meta?.updatedAt) setVersion(meta.updatedAt);
        })
        .catch(() => {});

    check();
    const timer = setInterval(check, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return version;
}
