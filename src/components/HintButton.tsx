"use client";

import { HINT_COST } from "@/lib/constants";

type Props = {
  hintsUsed: number;
  totalBlanks: number;
  onUse: () => void;
  disabled?: boolean;
};

export function HintButton({ hintsUsed, totalBlanks, onUse, disabled }: Props) {
  const remaining = totalBlanks - hintsUsed;
  const exhausted = remaining <= 0;

  return (
    <button
      type="button"
      onClick={onUse}
      disabled={disabled || exhausted}
      className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[color:var(--text-muted)] transition-all duration-150 hover:border-[color:var(--tile-present)] hover:text-[color:var(--tile-present)] disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={
        exhausted
          ? "All hints used"
          : `Reveal a definition word, costs ${HINT_COST} points`
      }
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${
          exhausted ? "bg-[color:var(--border-strong)]" : "bg-[color:var(--tile-present)]"
        }`}
      />
      <span className="uppercase tracking-[0.12em]">
        {exhausted ? "No hints left" : `Hint · −${HINT_COST}`}
      </span>
      {totalBlanks > 0 && !exhausted && (
        <span className="tabular-nums text-[color:var(--text-muted)] opacity-70">
          {remaining}/{totalBlanks}
        </span>
      )}
    </button>
  );
}
