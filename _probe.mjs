import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto('http://localhost:5174/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);

const r = await p.evaluate(async () => {
  const sentinel = document.querySelector('[aria-hidden].\\[grid-column\\:1\\/-1\\]') || document.querySelector('div[aria-hidden]');
  // walk up to find scrollable ancestor
  let el = sentinel?.parentElement, scroller = null;
  while (el) {
    const s = getComputedStyle(el);
    if ((s.overflowY === 'auto' || s.overflowY === 'scroll')) { scroller = el; break; }
    el = el.parentElement;
  }
  const out = {
    sentinelFound: !!sentinel,
    sentinelClass: sentinel?.className,
    scrollerClass: scroller?.className,
    scroller: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight, top: scroller.scrollTop } : null,
  };
  if (scroller) {
    out.fired = await new Promise(res => {
      let done = false;
      const io = new IntersectionObserver((es) => { done = true; res({ intersecting: es[0].isIntersecting, ratio: es[0].intersectionRatio }); },
        { root: scroller, rootMargin: '700px' });
      io.observe(sentinel);
      setTimeout(() => { if (!done) res('NO_CALLBACK'); }, 800);
    });
    // now scroll this scroller and recheck count
    scroller.scrollTop = scroller.scrollHeight;
  }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await p.waitForTimeout(800);
const after = await p.evaluate(() => document.querySelectorAll('[class*="[grid-template-columns"] > div').length);
console.log('card divs after scrolling real scroller:', after);
await b.close();
