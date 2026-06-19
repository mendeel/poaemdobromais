import { Component, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { SearchX } from 'lucide-react';
import Card from './Card.jsx';
import { useMediaQuery } from '../hooks/useMediaQuery.js';

const BATCH = 24; // cards rendered per chunk; grows as you scroll

export default function CardGrid({
  cupoms,
  filterKey,
  dayNum,
  now,
  favorites,
  onToggleFavorite,
  onOpen,
}) {
  const reduce = useReducedMotion();
  // Desktop scrolls inside the grid; mobile scrolls the document (so the iOS
  // status-bar tap can scroll to top).
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const [count, setCount] = useState(BATCH);
  // bumps on every filter change so the whole grid crossfades as one unit
  const [gen, setGen] = useState(0);

  // Reset the window + re-run the entrance animation only on real filter
  // changes — not when favorites or the clock tick produce a new list.
  useEffect(() => {
    setCount(BATCH);
    setGen((g) => g + 1);
    scrollRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  }, [filterKey]);

  // Grow the window as the sentinel nears the bottom of the active scroller
  // (the grid on desktop, the viewport on mobile).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCount((c) => Math.min(c + BATCH, cupoms.length));
        }
      },
      { root: isDesktop ? scrollRef.current : null, rootMargin: '700px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cupoms.length, count, isDesktop]);

  if (!cupoms.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-[70px] text-center text-[0.95rem] text-fg-muted">
        <SearchX className="mb-3.5 h-10 w-10 text-brd-strong" />
        Nenhum cupom encontrado com esses filtros.
      </div>
    );
  }

  const shown = cupoms.slice(0, count);

  return (
    <div
      ref={scrollRef}
      className="flex-1 p-4 md:min-h-0 md:touch-pan-y md:overflow-y-auto md:overflow-x-hidden md:overscroll-contain md:scroll-thin md:p-[22px]"
    >
      {/* Remount on filter change (key=gen) for a synced staggered entrance.
          No AnimatePresence/exit — instant swap keeps rapid filter taps
          responsive instead of queueing behind exit+enter animations. */}
      <motion.div
          key={gen}
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: reduce ? 0 : 0.03 } },
          }}
          className="grid content-start gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))] md:[grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]"
        >
          {shown.map((c) => (
            <motion.div
              key={c.id}
              variants={{
                hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 16 },
                show: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.3, ease: 'easeOut' },
                },
              }}
            >
              <CardErrorBoundary id={c.id}>
                <Card
                  cupom={c}
                  dayNum={dayNum}
                  now={now}
                  isFavorite={favorites.has(c.id)}
                  onToggleFavorite={onToggleFavorite}
                  onOpen={onOpen}
                />
              </CardErrorBoundary>
            </motion.div>
          ))}

          {count < cupoms.length && (
            <div ref={sentinelRef} aria-hidden className="col-[1/-1] h-1" />
          )}
      </motion.div>
    </div>
  );
}

// One malformed cupom shouldn't blank the whole grid.
class CardErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err) {
    console.error('Card render failed for', this.props.id, err);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
