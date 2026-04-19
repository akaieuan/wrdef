"use client";

import { motion } from "framer-motion";
import type { Blank } from "@/types";
import { Definition } from "./Definition";

type Props = {
  text: string;
  blanks: Blank[];
  hintedIndices: number[];
  onUse: () => void;
  onSkip: () => void;
};

export function LifelineOffer({
  text,
  blanks,
  hintedIndices,
  onUse,
  onSkip,
}: Props) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center px-5 py-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)" }}
    >
      <div className="w-full max-w-sm rounded-[16px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--tile-present)]">
          Out of guesses
        </p>
        <h2 className="mt-1 text-center text-[18px] font-semibold text-[color:var(--text)]">
          Try a lifeline?
        </h2>
        <p className="mt-2 text-center text-[12px] leading-relaxed text-[color:var(--text-muted)]">
          Fill any blank in the definition to earn one more guess.
        </p>

        <div className="mt-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
          <Definition
            text={text}
            blanks={blanks}
            mode={{ kind: "masked", hintedIndices }}
            className="text-left text-[13px] leading-[1.7] text-[color:var(--text-muted)]"
          />
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onUse}
            className="flex h-10 w-44 items-center justify-center rounded-xl bg-[color:var(--tile-present)] text-[13px] font-medium text-white shadow-[var(--shadow-sm)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
          >
            Use lifeline
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            Show answer
          </button>
        </div>
      </div>
    </motion.div>
  );
}
