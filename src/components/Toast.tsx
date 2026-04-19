"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  message: string | null;
};

export function Toast({ message }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex justify-center px-4">
      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            className="rounded-full bg-[color:var(--text)] px-4 py-2 text-xs font-medium text-[color:var(--bg)] shadow-[var(--shadow-sm)]"
            role="status"
            aria-live="polite"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
