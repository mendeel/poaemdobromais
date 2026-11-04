import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Undo2 } from 'lucide-react';
import { CATEGORIES, esperaLabel, formatCount, formatScore, overallScore } from '../lib/ratings.js';
import { StarsDisplay, StarsInput } from './ui/Stars.jsx';
import { EsperaBreakdown, EsperaInput } from './ui/Espera.jsx';

const EMPTY = { atendimento: 0, comida: 0, ambiente: 0, espera: 0 };
const FIELDS = [...CATEGORIES.map((c) => c.key), 'espera'];

export default function RatingSection({ cupomId, agg, mine, visited, onToggleVisited, onRate }) {
  const [formOpen, setFormOpen] = useState(false);
  const [thanked, setThanked] = useState(false);
  const score = overallScore(agg);
  // A past vote implies a visit, and the visit can't be undone once rated.
  const hasVisited = visited || Boolean(mine);

  const markVisited = () => {
    onToggleVisited(cupomId);
    setFormOpen(true);
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
      <EsperaBreakdown agg={agg} />

      <div className="mt-3.5 border-t border-brd pt-3">
        {!hasVisited ? (
          <>
            <button
              type="button"
              onClick={markVisited}
              className="flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-brd-strong bg-surface py-2 text-[0.88rem] font-bold text-fg transition-colors hover:border-primary hover:text-primary"
            >
              <Check className="h-4 w-4" strokeWidth={2.6} />
              Já fui aqui
            </button>
            <p className="mt-1.5 text-center text-[0.75rem] text-fg-muted">
              Só quem já foi pode avaliar.
            </p>
          </>
        ) : formOpen ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <RatingForm
              mine={mine}
              onCancel={() => setFormOpen(false)}
              onSubmit={async (scores) => {
                await onRate(cupomId, scores);
                setFormOpen(false);
                setThanked(true);
              }}
            />
          </motion.div>
        ) : (
          <VisitedSummary
            mine={mine}
            thanked={thanked}
            onRate={() => {
              setThanked(false);
              setFormOpen(true);
            }}
            onUndo={mine ? null : () => onToggleVisited(cupomId)}
          />
        )}
      </div>
    </section>
  );
}

function VisitedSummary({ mine, thanked, onRate, onUndo }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-2.5 py-1 text-[0.75rem] font-bold text-[#166534]">
          <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
          Você já foi aqui
        </span>
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 text-[0.75rem] text-fg-muted hover:text-primary"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Desfazer
          </button>
        )}
      </div>

      {mine ? (
        <>
          <div className="flex flex-col gap-1">
            <div className="text-[0.82rem] font-semibold text-fg">Sua avaliação</div>
            {CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-[0.8rem] text-fg">
                <span className="w-[92px] shrink-0">{c.label}</span>
                <StarsDisplay value={mine[c.key]} size={13} />
              </div>
            ))}
            {mine.espera && (
              <div className="flex items-center gap-2 text-[0.8rem] text-fg">
                <span className="w-[92px] shrink-0">Espera</span>
                <span className="font-semibold">{esperaLabel(mine.espera)}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onRate}
            className="self-start text-[0.8rem] font-semibold text-primary hover:underline"
          >
            Editar avaliação
          </button>
          {thanked && (
            <p aria-live="polite" className="text-[0.75rem] text-[#166534]">
              Obrigado pela avaliação!
            </p>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={onRate}
          className="w-full rounded-[9px] bg-primary py-2 text-[0.88rem] font-bold text-white"
        >
          Avaliar agora
        </button>
      )}
    </div>
  );
}

export function RatingForm({ mine, onCancel, onSubmit }) {
  const [draft, setDraft] = useState({ ...EMPTY, ...mine });
  const [status, setStatus] = useState({ state: 'idle' });
  const complete = FIELDS.every((k) => draft[k] > 0);
  const unchanged = mine && FIELDS.every((k) => draft[k] === mine[k]);
  const sending = status.state === 'sending';

  const set = (key, v) => {
    setDraft((d) => ({ ...d, [key]: v }));
    setStatus({ state: 'idle' });
  };

  const submit = async () => {
    setStatus({ state: 'sending' });
    try {
      await onSubmit(draft);
    } catch (e) {
      setStatus({ state: 'error', message: e.message });
    }
  };

  return (
    <div>
      <div className="mb-1.5 text-[0.82rem] font-semibold text-fg">
        {mine ? 'Editar sua avaliação' : 'Como foi?'}
      </div>
      <div className="flex flex-col gap-0.5">
        {CATEGORIES.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-2 text-[0.82rem] text-fg">
            <span>{c.label}</span>
            <StarsInput
              label={c.label}
              value={draft[c.key]}
              disabled={sending}
              onChange={(v) => set(c.key, v)}
            />
          </div>
        ))}
      </div>
      <div className="mb-1.5 mt-2 text-[0.82rem] text-fg">Tempo de espera</div>
      <EsperaInput value={draft.espera} disabled={sending} onChange={(v) => set('espera', v)} />
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={sending}
          className="flex-1 rounded-[9px] border border-brd-strong bg-surface py-2 text-[0.88rem] font-bold text-fg-muted transition-colors hover:text-fg disabled:opacity-45"
        >
          {mine ? 'Cancelar' : 'Agora não'}
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!complete || unchanged || sending}
          className="flex-[2] rounded-[9px] bg-primary py-2 text-[0.88rem] font-bold text-white transition-opacity disabled:opacity-45"
        >
          {sending ? 'Enviando…' : mine ? 'Atualizar avaliação' : 'Enviar avaliação'}
        </button>
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-[1.1em] text-center text-[0.75rem]">
        {status.state === 'error' && <span className="text-primary">{status.message}</span>}
      </p>
    </div>
  );
}
