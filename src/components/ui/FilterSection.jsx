// onClear: when provided, shows a "Limpar" button on the right of the header
// (pass it only when the filter actually has something to clear).
export default function FilterSection({ icon: Icon, label, children, onClear }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-[0.66rem] font-bold uppercase tracking-[0.09em] text-fg-muted">
        {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />}
        {label}
        <button
          type="button"
          onClick={onClear}
          aria-hidden={!onClear}
          className={`ml-auto rounded px-1.5 py-0.5 text-[0.62rem] font-bold tracking-normal text-primary transition-colors hover:bg-[#fff1f0] ${
            onClear ? '' : 'invisible'
          }`}
        >
          Limpar
        </button>
      </div>
      {children}
    </div>
  );
}
