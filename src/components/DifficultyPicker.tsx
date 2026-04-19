"use client";

import { useDifficulty } from "@/hooks/useDifficulty";
import type { Difficulty } from "@/lib/difficulty";

const OPTIONS: Array<{ value: Difficulty; label: string }> = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function DifficultyPicker() {
  const { difficulty, setDifficulty, hydrated } = useDifficulty();

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[11px] font-medium"
      role="radiogroup"
      aria-label="Difficulty"
    >
      {OPTIONS.map((opt) => {
        const active = hydrated && opt.value === difficulty;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setDifficulty(opt.value)}
            className={`rounded-full px-3 py-1.5 uppercase tracking-[0.14em] transition-colors duration-150 ${
              active
                ? "bg-[color:var(--accent)] text-[color:var(--accent-text)] shadow-[var(--shadow-xs)]"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
