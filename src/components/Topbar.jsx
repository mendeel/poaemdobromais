import { Menu, ArrowDownNarrowWide, Search, X, Sparkles } from 'lucide-react';

export default function Topbar({
  filteredCount,
  totalCount,
  sort,
  onSortChange,
  onOpenMenu,
  searchValue,
  onSearchChange,
  view,
  onViewChange,
  hasUnseenChanges = false,
  onOpenChanges,
}) {
  // ponytail: one sort element, rendered inline on desktop and on the search row on mobile
  const sortSelect = (
    <label className="flex items-center gap-2 text-[0.85rem] text-fg-muted">
      <ArrowDownNarrowWide className="h-4 w-4 shrink-0 text-fg-muted" />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="min-h-[38px] w-full cursor-pointer rounded-[9px] border border-brd-strong bg-surface px-2.5 py-2 text-[0.85rem] text-fg focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
      >
        <option value="nome">Nome A–Z</option>
        <option value="nota">Melhor nota</option>
        <option value="bairro">Bairro</option>
        <option value="dist">Distância</option>
      </select>
    </label>
  );

  return (
    <div className="header-bar header-bar-top sticky top-0 z-30 flex shrink-0 flex-col gap-2.5 border-b border-brd bg-surface px-5 py-3.5 md:static md:flex-row md:items-center md:gap-3.5 md:px-[22px] md:py-0">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir filtros"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[9px] border border-brd-strong bg-surface text-fg md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="flex-1 whitespace-nowrap text-[0.92rem] font-semibold text-fg">
          <b
            className="inline-block tabular-nums text-right font-bold text-primary"
            style={{ minWidth: `${String(totalCount).length}ch` }}
          >
            {filteredCount}
          </b>{' '}
          de{' '}
          <span className="tabular-nums">{totalCount}</span>
          {/* mobile drops the noun so the "O que mudou" button fits */}
          <span className={onOpenChanges ? 'hidden sm:inline' : ''}> cupons</span>
        </span>

        {onOpenChanges && (
          <button
            type="button"
            onClick={onOpenChanges}
            aria-label="O que mudou"
            className="relative flex h-[34px] shrink-0 items-center gap-1.5 rounded-[9px] border border-brd-strong bg-surface px-2.5 text-[0.85rem] font-semibold text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="hidden sm:inline">O que mudou</span>
            {hasUnseenChanges && (
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-surface" />
            )}
          </button>
        )}

        <div className="flex shrink-0 overflow-hidden rounded-[9px] border border-brd-strong">
          {[
            { v: 'list', label: 'Lista' },
            { v: 'map', label: 'Mapa' },
          ].map(({ v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
              className={
                'px-3 py-1.5 text-[0.85rem] font-semibold transition-colors ' +
                (view === v ? 'bg-primary text-white' : 'bg-surface text-fg-muted hover:text-fg')
              }
            >
              {label}
            </button>
          ))}
        </div>

        {view === 'list' && <div className="hidden md:flex">{sortSelect}</div>}
      </div>

      {/* search + sort — shown here only on mobile (sidebar has them on desktop) */}
      <div className="flex items-center gap-2.5 md:hidden">
        <div className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-2.5 h-[15px] w-[15px] text-fg-muted" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nome/descrição"
            className="w-full rounded-[9px] border border-brd-strong bg-bg py-2 pl-8 pr-9 text-[0.9rem] placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Limpar busca"
              className="absolute right-1.5 grid h-7 w-7 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {view === 'list' && <div className="shrink-0">{sortSelect}</div>}
      </div>
    </div>
  );
}
