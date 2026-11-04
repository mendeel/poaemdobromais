import { useState } from 'react';
import { CATEGORIES, formatCount, formatScore, overallScore } from '../lib/ratings.js';
import { StarsDisplay, StarsInput } from './ui/Stars.jsx';

const EMPTY = { atendimento: 0, comida: 0, ambiente: 0 };

export default function RatingSection({ cupomId, agg, mine, onRate }) {
  const [draft, setDraft] = useState(mine || EMPTY);
  const [status, setStatus] = useState({ state: 'idle' });
  const score = overallScore(agg);

  const complete = CATEGORIES.every((c) => draft[c.key] > 0);
  const unchanged = mine && CATEGORIES.every((c) => draft[c.key] === mine[c.key]);
  const sending = status.state === 'sending';

  const submit = async () => {
    setStatus({ state: 'sending' });
    try {
      await onRate(cupomId, draft);
      setStatus({ state: 'sent' });
    } catch (e) {
      setStatus({ state: 'error', message: e.message });
    }
  };

  return (
    <section className="rounded-xl border border-brd bg-bg p-3.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.95rem] font-bold text-fg">Avaliações</h3>
        {score !== null ? (
          <div className="flex items-center gap-2">
            <span className="text-[1.35rem] font-bold leading-none text-fg">{formatScore(score)}</span>
            <span className="flex flex-col items-start gap-0.5">
              <StarsDisplay value={score} size={13} />
              <span className="text-[0.72rem] text-fg-muted">{formatCount(agg.n)}</span>
            </span>
          </div>
        ) : (
          <span className="text-[0.8rem] text-fg-muted">Ainda sem avaliações</span>
        )}
      </div>

      {score !== null && (
        <div className="mt-3 flex flex-col gap-1.5">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center gap-2 text-[0.82rem] text-fg">
              <span className="w-[92px] shrink-0">{c.label}</span>
              <StarsDisplay value={agg[c.key]} size={14} />
              <span className="ml-auto font-semibold tabular-nums">{formatScore(agg[c.key])}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3.5 border-t border-brd pt-3">
        <div className="mb-1.5 text-[0.82rem] font-semibold text-fg">
          {mine ? 'Sua avaliação' : 'Avalie este lugar'}
        </div>
        <div className="flex flex-col gap-0.5">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2 text-[0.82rem] text-fg">
              <span>{c.label}</span>
              <StarsInput
                label={c.label}
                value={draft[c.key]}
                disabled={sending}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, [c.key]: v }));
                  setStatus({ state: 'idle' });
                }}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!complete || unchanged || sending}
          className="mt-2.5 w-full rounded-[9px] bg-primary py-2 text-[0.88rem] font-bold text-white transition-opacity disabled:opacity-45"
        >
          {sending ? 'Enviando…' : mine ? 'Atualizar avaliação' : 'Enviar avaliação'}
        </button>
        <p aria-live="polite" className="mt-1.5 min-h-[1.1em] text-center text-[0.75rem]">
          {status.state === 'sent' && <span className="text-[#166534]">Obrigado pela avaliação!</span>}
          {status.state === 'error' && <span className="text-primary">{status.message}</span>}
          {status.state === 'idle' && !complete && (
            <span className="text-fg-muted">Dê de 1 a 5 estrelas em cada categoria.</span>
          )}
        </p>
      </div>
    </section>
  );
}
