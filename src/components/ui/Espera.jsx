import { Rabbit, Snail, ThumbsUp } from 'lucide-react';
import { ESPERA, esperaSummary, isUsuallySlow } from '../../lib/ratings.js';

const STYLE = {
  1: { Icon: Rabbit, bar: 'bg-[#16a34a]' },
  2: { Icon: ThumbsUp, bar: 'bg-[#86efac]' },
  3: { Icon: Snail, bar: 'bg-[#f97316]' },
};

const percent = (share) => `${Math.round(share * 100)}%`;

export function EsperaInput({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Tempo de espera" className="grid grid-cols-3 gap-1.5">
      {ESPERA.map((o) => {
        const { Icon } = STYLE[o.value];
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`flex flex-col items-center gap-1 rounded-[9px] border px-1 py-2 text-[0.75rem] font-semibold leading-tight transition-colors active:scale-95 disabled:opacity-60 ${
              on
                ? 'border-primary bg-[#fff5f5] text-primary'
                : 'border-brd-strong bg-surface text-fg-muted hover:text-fg'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Stacked bar plus a legend with each answer's share. Renders nothing until
// someone has answered the wait question.
export function EsperaBreakdown({ agg }) {
  const s = esperaSummary(agg);
  if (!s) return null;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2 text-[0.82rem] text-fg">
        <span>Tempo de espera</span>
        <span className="text-[0.72rem] text-fg-muted">
          {s.n === 1 ? '1 resposta' : `${s.n} respostas`}
        </span>
      </div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-brd" aria-hidden>
        {s.options.map(
          (o) =>
            o.count > 0 && (
              <span key={o.value} className={STYLE[o.value].bar} style={{ width: percent(o.share) }} />
            ),
        )}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.75rem] text-fg-muted">
        {s.options.map((o) => (
          <li key={o.value} className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${STYLE[o.value].bar}`} />
            {o.label}
            <span className="font-semibold tabular-nums text-fg">{percent(o.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Card footer hint, shown only when most answers say the wait was longer.
export function SlowBadge({ agg, className = '' }) {
  if (!isUsuallySlow(agg)) return null;
  return (
    <span
      title="A maioria achou a espera mais demorada que o esperado"
      aria-label="Costuma demorar"
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-[#ffedd5] px-2 py-0.5 text-[0.7rem] font-bold text-[#9a3412] ${className}`}
    >
      <Snail className="h-3 w-3" strokeWidth={2.4} />
      Demora
    </span>
  );
}
