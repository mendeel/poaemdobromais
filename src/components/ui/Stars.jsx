import { Star } from 'lucide-react';
import { formatCount, formatScore, overallScore } from '../../lib/ratings.js';

const STAR_COLOR = 'text-[#f59e0b]';

// Read-only 0–5 stars; the filled layer is clipped to the exact average.
export function StarsDisplay({ value, size = 14 }) {
  const row = (filled) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className="shrink-0"
          strokeWidth={1.8}
          fill={filled ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex" aria-hidden>
      <span className="text-brd-strong">{row(false)}</span>
      <span
        className={`absolute inset-y-0 left-0 overflow-hidden ${STAR_COLOR}`}
        style={{ width: `${(value / 5) * 100}%` }}
      >
        {row(true)}
      </span>
    </span>
  );
}

export function StarsInput({ value, onChange, label, disabled }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} de 5`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`grid h-8 w-8 place-items-center transition-transform active:scale-90 disabled:opacity-60 ${
            value >= n ? STAR_COLOR : 'text-brd-strong'
          }`}
        >
          <Star className="h-6 w-6" strokeWidth={1.8} fill={value >= n ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

// Compact "★ 4,3 (12)" used on cards and map popups. Renders nothing until
// the restaurant has at least one vote.
export function RatingBadge({ agg, className = '' }) {
  const score = overallScore(agg);
  if (score === null) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap font-bold text-fg ${className}`}
      title={formatCount(agg.n)}
      aria-label={`Nota ${formatScore(score)} de 5, ${formatCount(agg.n)}`}
    >
      <Star className={`h-[13px] w-[13px] ${STAR_COLOR}`} fill="currentColor" strokeWidth={1.8} />
      {formatScore(score)}
      <span className="font-normal text-fg-muted">({agg.n})</span>
    </span>
  );
}
