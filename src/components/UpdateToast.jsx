import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X } from 'lucide-react';

const AUTO_HIDE_MS = 10000;

export default function UpdateToast({ show, onDismiss, onOpenChanges }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDismiss, AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[1400] flex justify-center px-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-2 rounded-full bg-fg py-1.5 pl-4 pr-1.5 text-[0.88rem] text-white shadow-[0_8px_28px_rgba(0,0,0,.28)]">
            <Sparkles className="h-4 w-4 shrink-0 text-[#fbbf24]" />
            <span className="whitespace-nowrap font-semibold">Cupons atualizados</span>
            <button
              type="button"
              onClick={onOpenChanges}
              className="whitespace-nowrap rounded-full bg-white/15 px-3 py-1.5 font-semibold transition-colors hover:bg-white/25"
            >
              Ver novidades
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Fechar aviso"
              className="grid h-8 w-8 place-items-center rounded-full text-white/70 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
