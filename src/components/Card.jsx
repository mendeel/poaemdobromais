import { memo } from 'react';
import { MapPin, Clock, Heart, Sparkles, Check } from 'lucide-react';
import { DAY_NAMES } from '../lib/constants.js';
import { regraResumo } from '../lib/regra.js';
import { horarioDisplay, isOpenAt } from '../lib/schedule.js';
import { RatingBadge } from './ui/Stars.jsx';

function CardImage({ src, alt, className, onError }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={onError}
    />
  );
}

function Card({
  cupom: c,
  dayNum,
  now,
  isFavorite,
  isVisited,
  visitLocked,
  isNew,
  rating,
  onToggleFavorite,
  onToggleVisited,
  onOpen,
}) {
  const bairros = [
    ...new Set((c.endereco || []).map((e) => e.bairro).filter(Boolean)),
  ];
  const hor = horarioDisplay(c, dayNum);
  const openNow = isOpenAt(c, now.day, now.minutes);
  const subcats = c.sub_categoria
    ? c.sub_categoria.split(', ').map((s) => s.trim())
    : [];
  const regra = regraResumo(c.regra);

  return (
    <article
      onClick={() => onOpen(c)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(c);
        }
      }}
      className="group cv-auto flex h-[366px] cursor-pointer flex-col overflow-hidden rounded-card border border-brd bg-surface shadow-[0_1px_2px_rgba(60,20,20,.06),0_2px_6px_rgba(60,20,20,.05)] transition-[box-shadow,transform] duration-200 hover:shadow-[0_6px_22px_rgba(180,40,40,.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="relative h-[156px] shrink-0 overflow-hidden bg-[#f3e9e6]">
        <CardImage
          src={c.image}
          alt={c.nome || ''}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden';
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent to-[45%]" />

        {c.logo && (
          <CardImage
            src={c.logo}
            alt=""
            className="absolute right-2.5 top-2.5 z-[2] h-[42px] w-[42px] rounded-[10px] bg-white p-1 object-contain shadow-[0_2px_8px_rgba(0,0,0,.2)]"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}

        <div className="absolute left-2.5 top-2.5 z-[2] flex items-center gap-1.5">
          <button
            type="button"
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            aria-pressed={isFavorite}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(c.id);
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-primary shadow backdrop-blur transition-transform active:scale-90"
          >
            <Heart
              className="h-[18px] w-[18px]"
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </button>

          {/* A rated place stays visited, same as in RatingSection. */}
          <button
            type="button"
            aria-label={
              visitLocked ? 'Já fui (avaliado)' : isVisited ? 'Já fui (desmarcar)' : 'Marcar como já fui'
            }
            aria-pressed={isVisited}
            aria-disabled={visitLocked || undefined}
            title={
              visitLocked
                ? 'Você já avaliou este lugar'
                : isVisited
                  ? 'Desmarcar “Já fui”'
                  : 'Marcar como já fui'
            }
            onClick={(e) => {
              e.stopPropagation();
              if (!visitLocked) onToggleVisited(c.id);
            }}
            className={`flex h-9 items-center justify-center gap-1 rounded-full shadow backdrop-blur transition-transform active:scale-90 ${
              isVisited
                ? 'bg-[#16a34a] pl-2.5 pr-3 text-[0.75rem] font-bold text-white'
                : 'w-9 bg-white/90 text-fg-muted hover:text-[#16a34a]'
            } ${visitLocked ? 'cursor-default active:scale-100' : ''}`}
          >
            <Check className="h-[17px] w-[17px]" strokeWidth={2.6} />
            {isVisited && 'Já fui'}
          </button>

          {isNew && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white shadow">
              <Sparkles className="h-3 w-3" strokeWidth={2.4} />
              Novo
            </span>
          )}
        </div>

        <div
          className={`absolute bottom-2.5 left-2.5 z-[2] flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${
            openNow ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fee2e2] text-[#991b1b]'
          }`}
        >
          <span
            className={`h-[7px] w-[7px] rounded-full ${
              openNow ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
            }`}
          />
          {openNow ? 'Aberto' : 'Fechado'}
        </div>

        {bairros.length > 0 && (
          <div className="absolute bottom-2.5 right-2.5 z-[2] flex max-w-[55%] flex-wrap justify-end gap-1">
            {bairros.slice(0, 2).map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[0.68rem] font-semibold text-primary shadow backdrop-blur"
              >
                <MapPin className="h-[11px] w-[11px]" strokeWidth={2.4} />
                {b}
              </span>
            ))}
            {bairros.length > 2 && (
              <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[0.68rem] font-semibold text-primary shadow backdrop-blur">
                +{bairros.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-3.5 pb-3.5 pt-3">
        <div className="line-clamp-2 shrink-0 text-[0.98rem] font-bold leading-[1.25] text-fg">
          {c.nome}
        </div>

        {subcats.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-1">
            {subcats.map((s) => (
              <span
                key={s}
                className="whitespace-nowrap rounded-full bg-[#fdf4e7] px-2 py-0.5 text-[0.68rem] font-semibold text-accent"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {regra && (
          <p className="line-clamp-3 text-[0.82rem] leading-[1.45] text-fg-muted">
            {regra}
          </p>
        )}

        <div className="mt-auto flex shrink-0 items-center gap-1.5 border-t border-brd pt-2.5 text-[0.8rem] text-fg">
          <Clock className="h-[13px] w-[13px] shrink-0 text-fg-muted" />
          <span className="min-w-0 truncate">
            {DAY_NAMES[dayNum]}: {hor === '-' ? 'Fechado' : hor}
          </span>
          <RatingBadge agg={rating} className="ml-auto shrink-0" />
        </div>
      </div>
    </article>
  );
}

export default memo(Card);
