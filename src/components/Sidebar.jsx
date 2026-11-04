import {
  Search,
  LayoutGrid,
  MapPin,
  Star,
  Calendar,
  Clock,
  Sunrise,
  Sun,
  Coffee,
  Moon,
  Trash2,
  UtensilsCrossed,
  X,
  ArrowLeft,
  Sparkles,
  Heart,
  CircleCheck,
  Award,
} from 'lucide-react';
import FilterSection from './ui/FilterSection.jsx';
import CheckList from './ui/CheckList.jsx';
import Pill from './ui/Pill.jsx';
import { DAY_NAMES } from '../lib/constants.js';

const MIN_NOTA_OPTIONS = [3, 3.5, 4, 4.5];

export default function Sidebar({
  filters,
  dispatch,
  subcatOptions,
  bairroOptions,
  caractOptions,
  resultCount,
  totalCount,
  novidadesCount = 0,
  onClose,
}) {
  const set = (key, value) => dispatch({ type: 'set', key, value });
  const toggleIn = (key, value) => dispatch({ type: 'toggleSet', key, value });

  const hasActiveFilter = Boolean(
    filters.abertoAgora ||
    filters.favorito ||
    filters.visitado ||
    filters.novidades ||
    filters.minNota !== null ||
    filters.selectedDays.size ||
    filters.activePresets.size ||
    filters.customTime !== null ||
    filters.search ||
    filters.subcats.size ||
    filters.bairros.size ||
    filters.caracts.size
  );

  return (
    <div className="flex h-full touch-pan-y flex-col gap-[18px] overflow-y-auto overflow-x-hidden overscroll-contain scroll-thin bg-surface px-4 pb-4">
      {/* brand — sticky so the close button stays visible while filters scroll */}
      <div className="header-bar sticky top-0 z-10 -mx-4 flex shrink-0 items-center gap-2.5 border-b border-brd bg-surface px-4">
        <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-gradient-to-br from-primary to-[#f87171] text-white">
          <UtensilsCrossed className="h-[19px] w-[19px]" />
        </span>
        <div>
          <h1 className="font-display text-[1.18rem] font-bold leading-none text-primary">
            POA Em Dobro+
          </h1>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar filtros"
            className="ml-auto grid h-10 w-10 place-items-center rounded-[9px] border border-brd-strong text-fg-muted md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <span className="self-start rounded-lg border border-[#f3e2c6] bg-[#fdf4e7] px-2.5 py-1.5 text-[0.74rem] font-semibold text-accent md:hidden">
        <span
          className="inline-block tabular-nums text-right"
          style={{ minWidth: `${String(totalCount).length}ch` }}
        >
          {resultCount}
        </span>{' '}
        resultados
      </span>

      <div className="grid grid-cols-2 gap-1.5">
        <PresetButton
          icon={Clock}
          label="Aberto agora"
          active={filters.abertoAgora}
          onClick={() => set('abertoAgora', !filters.abertoAgora)}
        />
        <PresetButton
          icon={Heart}
          label="Favorito"
          active={filters.favorito}
          onClick={() => set('favorito', !filters.favorito)}
        />
        <PresetButton
          icon={CircleCheck}
          label="Já fui"
          active={filters.visitado}
          onClick={() => set('visitado', !filters.visitado)}
          className={novidadesCount > 0 ? '' : 'col-span-2'}
        />
        {novidadesCount > 0 && (
          <PresetButton
            icon={Sparkles}
            label={`Novidades (${novidadesCount})`}
            active={filters.novidades}
            onClick={() => set('novidades', !filters.novidades)}
          />
        )}
      </div>

      <FilterSection
        icon={Award}
        label="Nota mínima"
        onClear={filters.minNota !== null ? () => set('minNota', null) : undefined}
      >
        <div className="grid grid-cols-4 gap-1.5">
          {MIN_NOTA_OPTIONS.map((n) => (
            <Pill
              key={n}
              active={filters.minNota === n}
              onClick={() => set('minNota', filters.minNota === n ? null : n)}
              className="px-1"
            >
              <span className="inline-flex items-center justify-center gap-1">
                <Star className="h-3 w-3" fill="currentColor" strokeWidth={1.8} />
                {n.toLocaleString('pt-BR')}+
              </span>
            </Pill>
          ))}
        </div>
      </FilterSection>

      <FilterSection
        icon={Calendar}
        label="Dia da semana"
        onClear={
          filters.selectedDays.size
            ? () => set('selectedDays', new Set())
            : undefined
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <Pill
              key={d}
              active={filters.selectedDays.has(d)}
              onClick={() => toggleIn('selectedDays', d)}
            >
              {DAY_NAMES[d]}
            </Pill>
          ))}
        </div>
      </FilterSection>

      <div
        className={`flex flex-col gap-2 transition-opacity ${
          filters.abertoAgora ? 'pointer-events-none opacity-40' : ''
        }`}
      >
        <FilterSection
          icon={Clock}
          label="Horário"
          onClear={
            filters.activePresets.size || filters.customTime !== null
              ? () => {
                  set('activePresets', new Set());
                  set('customTime', null);
                }
              : undefined
          }
        >
          <div className="flex flex-col gap-1.5">
            <PresetButton
              icon={Sunrise}
              label="Café da manhã"
              time="07:00–11:30"
              active={filters.activePresets.has('cafeManha')}
              onClick={() => dispatch({ type: 'preset', value: 'cafeManha' })}
            />
            <PresetButton
              icon={Sun}
              label="Almoço"
              time="11:30–15:00"
              active={filters.activePresets.has('almoco')}
              onClick={() => dispatch({ type: 'preset', value: 'almoco' })}
            />
            <PresetButton
              icon={Coffee}
              label="Lanche"
              time="15:00–19:00"
              active={filters.activePresets.has('lanche')}
              onClick={() => dispatch({ type: 'preset', value: 'lanche' })}
            />
            <PresetButton
              icon={Moon}
              label="Jantar"
              time="19:00–23:00"
              active={filters.activePresets.has('jantar')}
              onClick={() => dispatch({ type: 'preset', value: 'jantar' })}
            />
          </div>
          <div className="relative flex items-center">
            <Clock className="pointer-events-none absolute left-2.5 h-[15px] w-[15px] text-fg-muted" />
            <input
              type="time"
              aria-label="Horário personalizado"
              value={minutesToTime(filters.customTime)}
              onChange={(e) => {
                const v = e.target.value;
                if (v) {
                  const [h, m] = v.split(':').map(Number);
                  dispatch({ type: 'customTime', value: h * 60 + m });
                } else {
                  dispatch({ type: 'customTime', value: null });
                }
              }}
              className="block min-h-[40px] w-full min-w-0 max-w-full appearance-none rounded-[9px] border border-brd-strong bg-bg py-2 pl-8 pr-2.5 text-[0.9rem] text-fg focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:text-fg [&:not(:focus)]:[&::-webkit-datetime-edit]:text-fg-muted"
            />
          </div>
        </FilterSection>
      </div>

      <FilterSection icon={Search} label="Busca">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-2.5 h-[15px] w-[15px] text-fg-muted" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Nome/descrição"
            className="w-full rounded-[9px] border border-brd-strong bg-bg py-2 pl-8 pr-9 text-[0.9rem] placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => set('search', '')}
              aria-label="Limpar busca"
              className="absolute right-1.5 grid h-7 w-7 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </FilterSection>

      <FilterSection
        icon={LayoutGrid}
        label="Subcategoria"
        onClear={filters.subcats.size ? () => set('subcats', new Set()) : undefined}
      >
        <CheckList
          items={subcatOptions}
          selected={filters.subcats}
          onToggle={(v) => toggleIn('subcats', v)}
          searchable
        />
      </FilterSection>

      <FilterSection
        icon={MapPin}
        label="Bairro"
        onClear={filters.bairros.size ? () => set('bairros', new Set()) : undefined}
      >
        <CheckList
          items={bairroOptions}
          selected={filters.bairros}
          onToggle={(v) => toggleIn('bairros', v)}
          searchable
        />
      </FilterSection>

      <FilterSection
        icon={Star}
        label="Características"
        onClear={filters.caracts.size ? () => set('caracts', new Set()) : undefined}
      >
        <CheckList
          items={caractOptions}
          selected={filters.caracts}
          onToggle={(v) => toggleIn('caracts', v)}
        />
      </FilterSection>

      <hr className="border-brd" />

      <button
        type="button"
        onClick={() => dispatch({ type: 'clear' })}
        className="mt-auto flex min-h-[40px] items-center justify-center gap-1.5 rounded-[9px] border border-brd-strong bg-surface py-2.5 text-[0.85rem] font-semibold text-fg-muted transition-colors hover:border-primary hover:bg-[#fff5f5] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Trash2 className="h-4 w-4" /> Limpar filtros
      </button>

      {onClose && hasActiveFilter && (
        <button
          type="button"
          onClick={onClose}
          className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 mx-auto flex min-h-[48px] items-center justify-center gap-2 self-center rounded-full bg-primary px-6 text-[0.92rem] font-semibold text-white shadow-[0_6px_20px_rgba(0,0,0,.25)] md:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para lista ({resultCount})
        </button>
      )}
    </div>
  );
}

function PresetButton({ icon: Icon, label, time, active, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-[9px] border px-1 py-1.5 transition-colors duration-150 ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-brd-strong bg-surface text-fg hover:border-accent hover:text-accent'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${className}`}
    >
      <span className="flex items-center gap-1.5 text-[0.82rem] font-semibold">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      {time && (
        <span
          className={`text-[0.68rem] tabular-nums ${active ? 'text-white/85' : 'text-fg-muted'}`}
        >
          {time}
        </span>
      )}
    </button>
  );
}

function minutesToTime(min) {
  if (min === null || min === undefined) return '';
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}
