import { motion } from 'motion/react';

export default function Pill({ active, onClick, children, className = '' }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.94 }}
      aria-pressed={active}
      className={`min-h-[32px] whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[0.8rem] transition-colors duration-150 ${
        active
          ? 'border-primary bg-primary font-bold text-white'
          : 'border-brd-strong bg-surface text-fg hover:border-primary hover:text-primary'
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      {children}
    </motion.button>
  );
}
