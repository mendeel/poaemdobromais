import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Sparkles, ArrowRight, ChevronRight, MapPin } from 'lucide-react';
import Pill from './ui/Pill.jsx';
import { textDiff } from '../lib/textDiff.js';

// Change fields (as written by changes.py) grouped into the filter chips.
const GROUPS = [
  { key: 'prato', label: 'Prato e regras', fields: ['nome', 'descricao', 'beneficio', 'regra', 'validade'] },
  { key: 'horario', label: 'Horário', fields: ['horario'] },
  { key: 'unidades', label: 'Endereços', fields: ['unidade', 'endereco'] },
  { key: 'categorias', label: 'Categorias', fields: ['sub_categoria', 'caracteristica'] },
  { key: 'foto', label: 'Foto', fields: ['image'] },
  { key: 'contato', label: 'Contato', fields: ['telefone', 'instagram'] },
];
const GROUP_OF = Object.fromEntries(
  GROUPS.flatMap((g) => g.fields.map((f) => [f, g.key])),
);

const TABS = [
  { key: 'added', label: 'Entraram' },
  { key: 'removed', label: 'Saíram' },
  { key: 'changed', label: 'Mudaram' },
];

export function fmtDate(stamp) {
  if (!stamp) return '';
  return new Date(stamp).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ChangesPanel({
  open,
  onClose,
  paused,
  index,
  selectedId,
  onSelect,
  changelog,
  cupomsById,
  onOpenCupom,
}) {
  const reduce = useReducedMotion();

  // Esc closes (unless a cupom modal is on top) + lock body scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !paused && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, paused, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1500] flex justify-end bg-black/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="O que mudou"
            onClick={(e) => e.stopPropagation()}
            className="flex h-dvh w-full flex-col bg-surface shadow-2xl sm:max-w-[520px]"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}
          >
            <PanelContent
              onClose={onClose}
              index={index}
              selectedId={selectedId}
              onSelect={onSelect}
              changelog={changelog}
              cupomsById={cupomsById}
              onOpenCupom={onOpenCupom}
            />
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PanelContent({ onClose, index, selectedId, onSelect, changelog, cupomsById, onOpenCupom }) {
  const [tab, setTab] = useState('added');
  const [group, setGroup] = useState(null);
  const entry = index.find((e) => e.id === selectedId);

  // filter the "changed" list down to the chosen kind of change
  const changed = useMemo(() => {
    const list = changelog?.changed ?? [];
    if (!group) return list;
    return list
      .map((c) => ({ ...c, changes: c.changes.filter((ch) => GROUP_OF[ch.field] === group) }))
      .filter((c) => c.changes.length);
  }, [changelog, group]);

  const groupCounts = useMemo(() => {
    const counts = {};
    for (const c of changelog?.changed ?? []) {
      for (const key of new Set(c.changes.map((ch) => GROUP_OF[ch.field]))) {
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  }, [changelog]);

  const open = (id) => {
    const cupom = cupomsById.get(id);
    if (cupom) onOpenCupom(cupom);
  };

  return (
    <>
      <div className="header-bar flex shrink-0 items-center gap-2.5 border-b border-brd px-4">
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-accent to-[#f59e0b] text-white">
          <Sparkles className="h-[18px] w-[18px]" />
        </span>
        <h2 className="font-display text-[1.18rem] font-bold leading-none text-primary">
          O que mudou
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="ml-auto grid h-10 w-10 place-items-center rounded-[9px] border border-brd-strong text-fg-muted transition-colors hover:text-primary"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!entry ? (
        <div className="grid flex-1 place-items-center p-8 text-center text-fg-muted">
          Nenhuma atualização registrada ainda.
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-col gap-3 border-b border-brd px-4 py-3.5">
            {index.length > 1 ? (
              <select
                value={selectedId}
                onChange={(e) => {
                  onSelect(e.target.value);
                  setGroup(null);
                }}
                aria-label="Atualização"
                className="min-h-[38px] w-full cursor-pointer rounded-[9px] border border-brd-strong bg-surface px-2.5 py-2 text-[0.85rem] text-fg focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
              >
                {index.map((e) => (
                  <option key={e.id} value={e.id}>
                    {fmtDate(e.to)} (comparado com {fmtDate(e.from)})
                  </option>
                ))}
              </select>
            ) : null}
            <p className="text-[0.82rem] text-fg-muted">
              Atualizado em <b className="text-fg">{fmtDate(entry.to)}</b>, comparado com{' '}
              <b className="text-fg">{fmtDate(entry.from)}</b>.
            </p>

            <div className="grid grid-cols-3 overflow-hidden rounded-[9px] border border-brd-strong">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  aria-pressed={tab === key}
                  className={`flex flex-col items-center py-1.5 text-[0.8rem] font-semibold transition-colors ${
                    tab === key ? 'bg-primary text-white' : 'bg-surface text-fg-muted hover:text-fg'
                  }`}
                >
                  <span className="text-[1.05rem] font-bold tabular-nums leading-tight">
                    {entry[key]}
                  </span>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'changed' && (
              <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 scroll-thin">
                <Pill active={!group} onClick={() => setGroup(null)}>
                  Tudo
                </Pill>
                {GROUPS.filter((g) => groupCounts[g.key]).map((g) => (
                  <Pill key={g.key} active={group === g.key} onClick={() => setGroup(g.key)}>
                    {g.label} ({groupCounts[g.key]})
                  </Pill>
                ))}
              </div>
            )}
          </div>

          <div className="scroll-thin flex flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {!changelog ? (
              <p className="py-10 text-center text-fg-muted">Carregando…</p>
            ) : tab === 'changed' ? (
              changed.map((c) => (
                <ChangedItem key={c.id} item={c} onOpen={cupomsById.has(c.id) ? () => open(c.id) : null} />
              ))
            ) : (
              changelog[tab].map((c) => (
                <SummaryItem
                  key={c.id}
                  item={c}
                  removed={tab === 'removed'}
                  onOpen={tab === 'added' && cupomsById.has(c.id) ? () => open(c.id) : null}
                />
              ))
            )}
            {changelog && (tab === 'changed' ? changed : changelog[tab]).length === 0 && (
              <p className="py-10 text-center text-fg-muted">Nada por aqui.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

function Logo({ src, muted }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[10px] border border-brd bg-white p-1">
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          className={`h-full w-full object-contain ${muted ? 'grayscale' : ''}`}
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />
      )}
    </span>
  );
}

function RowShell({ onOpen, children, className = '' }) {
  const base = `flex w-full items-center gap-3 text-left ${className}`;
  if (!onOpen) return <div className={base}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${base} transition-colors hover:border-brd-strong hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
    >
      {children}
      <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" />
    </button>
  );
}

function SummaryItem({ item, removed, onOpen }) {
  return (
    <RowShell
      onOpen={onOpen}
      className={`rounded-xl border border-brd p-3 ${removed ? 'bg-bg' : 'bg-surface'}`}
    >
      <Logo src={item.logo} muted={removed} />
      <span className="min-w-0 flex-1">
        <span className={`block font-bold leading-tight ${removed ? 'text-fg-muted' : 'text-fg'}`}>
          {item.nome}
        </span>
        {item.descricao && (
          <span className="mt-0.5 block text-[0.82rem] leading-snug text-fg-muted">
            {item.descricao}
            {item.beneficio ? ` — ${item.beneficio}` : ''}
          </span>
        )}
        {item.bairros?.length > 0 && (
          <span className="mt-1 flex items-center gap-1 text-[0.74rem] font-semibold text-primary/80">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.bairros.join(', ')}</span>
          </span>
        )}
      </span>
    </RowShell>
  );
}

function ChangedItem({ item, onOpen }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brd bg-surface p-3">
      <RowShell onOpen={onOpen} className="-m-1 rounded-lg p-1">
        <Logo src={item.logo} />
        <span className="min-w-0 flex-1 font-bold leading-tight text-fg">{item.nome}</span>
      </RowShell>
      {item.changes.map((ch, i) => (
        <ChangeLine key={i} change={ch} />
      ))}
    </div>
  );
}

function ChangeLine({ change: ch }) {
  if (ch.field === 'image') {
    return (
      <div className="flex flex-col gap-1">
        <Label>{ch.label}</Label>
        <div className="flex items-center gap-2">
          <Thumb src={ch.before} muted />
          <ArrowRight className="h-4 w-4 shrink-0 text-fg-muted" />
          <Thumb src={ch.after} />
        </div>
      </div>
    );
  }
  // both sides present → highlight only the words that changed
  const diff = ch.before && ch.after ? textDiff(ch.before, ch.after) : null;
  return (
    <div className="flex flex-col gap-1">
      <Label>{ch.label}</Label>
      {ch.before !== null && (
        <Value tone="before">
          {diff ? <Segments segs={diff.before} tone="before" /> : ch.before || '(vazio)'}
        </Value>
      )}
      {ch.after !== null && (
        <Value tone="after">
          {diff ? <Segments segs={diff.after} tone="after" /> : ch.after || '(vazio)'}
        </Value>
      )}
    </div>
  );
}

function Segments({ segs, tone }) {
  const markClass =
    tone === 'before'
      ? 'rounded-[3px] bg-[#fca5a5]/55 px-0.5 text-[#7f1d1d] line-through decoration-[#7f1d1d]/50'
      : 'rounded-[3px] bg-[#86efac]/70 px-0.5 font-semibold text-[#14532d]';
  return segs.map((s, i) =>
    s.gap ? (
      <span key={i} className="block select-none opacity-60" aria-label="trecho sem mudança">
        …
      </span>
    ) : s.mark ? (
      <mark key={i} className={markClass}>
        {s.text}
      </mark>
    ) : (
      <span key={i}>{s.text}</span>
    ),
  );
}

function Label({ children }) {
  return (
    <span className="text-[0.66rem] font-bold uppercase tracking-[0.08em] text-fg-muted">
      {children}
    </span>
  );
}

function Value({ tone, children }) {
  const before = tone === 'before';
  return (
    <div
      className={`flex gap-2 rounded-lg px-2.5 py-1.5 text-[0.82rem] leading-snug ${
        before ? 'bg-[#fdf2f2] text-[#7f1d1d]/75' : 'bg-[#ecfdf3] text-[#14532d]'
      }`}
    >
      <span className="w-[42px] shrink-0 pt-px text-[0.66rem] font-bold uppercase tracking-wide opacity-70">
        {before ? 'Antes' : 'Agora'}
      </span>
      <span className="min-w-0 whitespace-pre-line break-words">{children}</span>
    </div>
  );
}

function Thumb({ src, muted }) {
  return (
    <span className="h-20 flex-1 overflow-hidden rounded-lg bg-[#f3e9e6]">
      {src && (
        <img
          src={src}
          alt=""
          loading="lazy"
          className={`h-full w-full object-cover ${muted ? 'opacity-60 grayscale' : ''}`}
          onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
        />
      )}
    </span>
  );
}
