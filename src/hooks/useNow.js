import { useEffect, useState } from 'react';
import { nowMin, todayDay } from '../lib/schedule.js';

/** Live clock for open/closed checks — ticks every minute. */
export function useNow() {
  const [now, setNow] = useState(() => ({ day: todayDay(), minutes: nowMin() }));

  useEffect(() => {
    const tick = () => setNow({ day: todayDay(), minutes: nowMin() });
    tick();
    const id = setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return now;
}
