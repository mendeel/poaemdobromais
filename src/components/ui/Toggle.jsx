import { motion } from 'motion/react';

// Accessible switch: a real checkbox visually hidden behind a track/knob.
export default function Toggle({
  icon: Icon,
  label,
  checked,
  onChange,
  stacked = false,
  className = '',
}) {
  return (
    <label
      className={`flex min-h-[34px] cursor-pointer ${
        stacked
          ? 'flex-col items-stretch gap-1.5'
          : 'items-center justify-between'
      } ${className}`}
    >
      <span className="flex items-center gap-2 text-[0.9rem]">
        {Icon && <Icon className="h-4 w-4 text-accent" strokeWidth={2} />}
        {label}
      </span>
      <span className={`relative h-6 w-[42px] shrink-0 ${stacked ? 'self-end' : ''}`}>
        <input
          type="checkbox"
          className="peer absolute h-0 w-0 opacity-0"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label}
        />
        <span
          className="absolute inset-0 rounded-full bg-brd-strong transition-colors duration-200 peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40"
        />
        <motion.span
          className="pointer-events-none absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white shadow"
          animate={{ x: checked ? 18 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      </span>
    </label>
  );
}
