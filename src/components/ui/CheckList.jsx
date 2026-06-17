import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

// Scrollable multi-checkbox list. `items` is an array of strings; `selected`
// is a Set; `onToggle(value)` flips one. When `searchable`, a filter box
// narrows the visible options (selected ones still apply even if filtered out).
export default function CheckList({ items, selected, onToggle, searchable }) {
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    if (!q) return items;
    const needle = q.toLowerCase();
    return items.filter((name) => name.toLowerCase().includes(needle));
  }, [items, q]);

  return (
    <div className="flex flex-col gap-1.5">
      {searchable && (
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2 h-[13px] w-[13px] text-fg-muted" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar…"
            className="w-full rounded-md border border-brd-strong bg-bg py-1.5 pl-7 pr-2 text-[0.8rem] placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      )}
      <div className="scroll-thin flex max-h-[168px] flex-col gap-px overflow-y-auto pr-1">
        {shown.length === 0 ? (
          <span className="px-1.5 py-2 text-[0.8rem] text-fg-muted">
            Nenhum resultado
          </span>
        ) : (
          shown.map((name) => (
            <label
              key={name}
              className="flex min-h-[32px] cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-[0.86rem] transition-colors hover:bg-bg"
            >
              <input
                type="checkbox"
                className="h-[15px] w-[15px] shrink-0 cursor-pointer accent-primary"
                checked={selected.has(name)}
                onChange={() => onToggle(name)}
              />
              <span>{name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
