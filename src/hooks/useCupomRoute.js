import { useCallback, useEffect, useRef, useState } from 'react';
import { cupomIdFromPath, cupomPath } from '../lib/cupomUrl.js';

// The open cupom lives in the URL (/r/<id>-<slug>), so a link opens that place
// directly and the browser's back button closes the modal.
// Returns [openId, open(cupom), close()].
export function useCupomRoute() {
  const [openId, setOpenId] = useState(() => cupomIdFromPath(window.location.pathname));
  const openIdRef = useRef(openId);
  openIdRef.current = openId;

  useEffect(() => {
    const onPop = () => setOpenId(cupomIdFromPath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = useCallback((cupom) => {
    const path = cupomPath(cupom);
    if (openIdRef.current) window.history.replaceState(window.history.state, '', path);
    else window.history.pushState({ fromApp: true }, '', path);
    setOpenId(String(cupom.id));
  }, []);

  const close = useCallback(() => {
    if (!openIdRef.current) return;
    openIdRef.current = null;
    setOpenId(null);
    // Opened from inside the app: step back so our close and the browser's
    // back button agree. Landed on a shared link: nothing to go back to.
    if (window.history.state?.fromApp) window.history.back();
    else window.history.replaceState(null, '', '/');
  }, []);

  return [openId, open, close];
}
