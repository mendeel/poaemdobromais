import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check } from 'lucide-react';
import { RatingForm } from './RatingSection.jsx';

const THANKS_MS = 1400;

// Opened by a card's "Já fui" so places can be rated straight from the list.
// Same form as the cupom modal: "Agora não" closes it and the visit stays marked.
export default function RateModal({ cupom, onRate, onClose }) {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!cupom) return;
    const prevActive = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [cupom, onClose]);

  return (
    <AnimatePresence>
      {cupom && (
        <motion.div
          className="fixed inset-0 z-[1900] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Avaliar ${cupom.nome}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-t-[18px] bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl outline-none sm:max-w-[400px] sm:rounded-[18px] sm:pb-5"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <RateContent key={cupom.id} cupom={cupom} onRate={onRate} onClose={onClose} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RateContent({ cupom: c, onRate, onClose }) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, THANKS_MS);
    return () => clearTimeout(t);
  }, [done, onClose]);

  return (
    <>
      <div className="mb-3.5 flex items-center gap-3">
        {c.logo && (
          <img
            src={c.logo}
            alt=""
            className="h-11 w-11 shrink-0 rounded-[10px] border border-brd bg-white p-1 object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div className="min-w-0">
          <h2 className="truncate font-display text-[1.1rem] font-bold text-primary">{c.nome}</h2>
          <span className="inline-flex items-center gap-1 text-[0.75rem] font-bold text-[#166534]">
            <Check className="h-3.5 w-3.5" strokeWidth={2.6} />
            Você já foi aqui
          </span>
        </div>
      </div>

      {done ? (
        <p
          aria-live="polite"
          className="flex items-center justify-center gap-1.5 rounded-[9px] bg-[#dcfce7] py-3 text-[0.88rem] font-bold text-[#166534]"
        >
          <Check className="h-4 w-4" strokeWidth={2.6} />
          Obrigado pela avaliação!
        </p>
      ) : (
        <RatingForm
          onCancel={onClose}
          onSubmit={async (scores) => {
            await onRate(c.id, scores);
            setDone(true);
          }}
        />
      )}
    </>
  );
}
