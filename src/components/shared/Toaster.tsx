import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "../../store/useToastStore";
import { useAppearanceStore } from "../../store/useAppearanceStore";

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const glass = useAppearanceStore((state) => state.glass);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-8 left-1/2 z-[300] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -8,
              transition: { duration: 0.25, ease: EASE },
            }}
            transition={{ duration: 0.35, ease: EASE }}
            className={`flex items-center gap-2.5 rounded-ctl px-4 py-2.5 text-sm text-ink ${
              glass ? "glass-surface" : "border border-hairline bg-surface"
            }`}
          >
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                toast.tone === "success" ? "bg-accent" : "bg-ink-dim"
              }`}
            />
            {toast.title}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default Toaster;
