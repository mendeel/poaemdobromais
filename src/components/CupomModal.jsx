import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, MapPin, AtSign, Map, Heart, Gift, Check, Clock, ChevronDown } from 'lucide-react';
import { DAY_NAMES_FULL } from '../lib/constants.js';
import { regraResumo } from '../lib/regra.js';
import { getSchedule, isOpenAt } from '../lib/schedule.js';
import RatingSection from './RatingSection.jsx';

export default function CupomModal({
  cupom,
  now,
  isFavorite,
  onToggleFavorite,
  rating,
  myRating,
  visited,
  onToggleVisited,
  onRate,
  onClose,
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);

  // Esc to close + lock body scroll + restore focus on close.
  useEffect(() => {
    if (!cupom) return;
    const prevActive = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [cupom, onClose]);

  return (
    <AnimatePresence>
      {cupom && (
        <motion.div
          className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={cupom.nome}
            onClick={(e) => e.stopPropagation()}
            className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden rounded-none bg-surface shadow-2xl outline-none sm:h-auto sm:max-h-[92dvh] sm:max-w-[560px] sm:rounded-[18px]"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <ModalContent
              cupom={cupom}
              now={now}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
              rating={rating}
              myRating={myRating}
              visited={visited}
              onToggleVisited={onToggleVisited}
              onRate={onRate}
              onClose={onClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function instagramUrl(handle) {
  if (!handle) return null;
  return handle.startsWith('http')
    ? handle
    : `https://instagram.com/${handle.replace('@', '')}`;
}

function ModalContent({
  cupom: c,
  now,
  isFavorite,
  onToggleFavorite,
  rating,
  myRating,
  visited,
  onToggleVisited,
  onRate,
  onClose,
}) {
  const openNow = isOpenAt(c, now.day, now.minutes);
  const td = now.day;
  const regra = regraResumo(c.regra);
  // single venue handle — first address that has one
  const instagramHref = instagramUrl(
    (c.endereco || []).find((e) => e.instagram)?.instagram,
  );

  return (
    <>
      <div className="relative h-[200px] shrink-0 bg-[#f3e9e6]">
        {c.image && (
          <img
            src={c.image}
            alt={c.nome || ''}
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent to-50%" />
        {c.logo && (
          <img
            src={c.logo}
            alt=""
            className="absolute bottom-3 left-4 h-14 w-14 rounded-xl bg-white p-1.5 object-contain shadow-lg"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-fg shadow backdrop-blur transition-transform active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(c.id)}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={isFavorite}
          className="absolute right-3 top-14 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow backdrop-blur transition-transform active:scale-90"
        >
          <Heart className="h-[18px] w-[18px]" fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
        <span
          className={`absolute bottom-3 right-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-bold ${
            openNow ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${openNow ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
          {openNow ? 'Aberto agora' : 'Fechado agora'}
        </span>
      </div>

      <div className="scroll-thin flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[1.3rem] font-bold text-primary">
              {c.nome}
            </h2>
            {c.sub_categoria && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {c.sub_categoria.split(', ').map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-[#fdf4e7] px-2.5 py-0.5 text-[0.72rem] font-semibold text-accent"
                  >
                    {s.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          {instagramHref && (
            <a
              href={instagramHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brd-strong bg-surface text-fg-muted transition-colors hover:text-primary"
            >
              <AtSign className="h-[18px] w-[18px]" />
            </a>
          )}
        </div>

        {regra && (
          <p className="text-[0.9rem] leading-relaxed text-fg-muted">{regra}</p>
        )}

        <RatingSection
          key={c.id}
          cupomId={c.id}
          agg={rating}
          mine={myRating}
          visited={visited}
          onToggleVisited={onToggleVisited}
          onRate={onRate}
        />

        {Array.isArray(c.caracteristica) && c.caracteristica.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.caracteristica.map((ch) => (
              <span
                key={ch}
                className="inline-flex items-center gap-1 rounded-full bg-bg px-2.5 py-1 text-[0.72rem] font-semibold text-fg"
              >
                <Check className="h-3 w-3 text-accent" /> {ch}
              </span>
            ))}
          </div>
        )}

        {/* addresses + per-address weekly schedule (open by default if only one) */}
        {(c.endereco || []).map((end, idx) => (
          <Address
            key={idx}
            end={end}
            today={td}
            defaultOpen={(c.endereco || []).length === 1}
          />
        ))}
      </div>
    </>
  );
}

function Address({ end, today, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const mapsHref =
    end.latitude && end.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${end.latitude},${end.longitude}`
      : end.endereco
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end.endereco)}`
        : null;
  const todayHor = getSchedule(end, today);

  return (
    <div className="rounded-xl border border-brd bg-bg">
      <div className="flex items-start justify-between gap-2 p-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-2 text-left text-[0.88rem] font-semibold text-fg"
        >
          <MapPin className="mt-px h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            {end.lugar_nome ? `${end.lugar_nome} · ` : ''}
            {end.bairro}
            {end.endereco ? (
              <span className="block font-normal text-fg-muted">{end.endereco}</span>
            ) : null}
            {!open && (
              <span className="mt-0.5 block text-[0.78rem] font-normal text-fg-muted">
                Hoje: {todayHor === '-' ? 'Fechado' : todayHor}
              </span>
            )}
          </span>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-fg-muted transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
        {mapsHref && (
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir no mapa"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-brd-strong bg-surface text-fg-muted hover:text-primary"
          >
            <Map className="h-4 w-4" />
          </a>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-0.5 px-3.5 pb-3.5">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const h = getSchedule(end, d);
                return (
                  <div
                    key={d}
                    className={`flex items-center justify-between rounded-md px-2 py-1 text-[0.8rem] ${
                      d === today ? 'bg-[#fff1f0] font-bold text-primary' : 'text-fg'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {d === today && <Clock className="h-3 w-3" />}
                      {DAY_NAMES_FULL[d]}
                    </span>
                    <span className={h === '-' ? 'text-fg-muted' : ''}>
                      {h === '-' ? 'Fechado' : h}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
