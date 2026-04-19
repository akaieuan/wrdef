"use client";

import { useDifficulty } from "@/hooks/useDifficulty";
import type { Difficulty } from "@/lib/difficulty";

type Option = {
  value: Difficulty;
  label: string;
  description: string;
  activeBg: string;
  activeText: string;
};

const OPTIONS: Option[] = [
  {
    value: "easy",
    label: "Easy",
    description: "Common words. Short clue.",
    activeBg: "#5FB87A",
    activeText: "#FFFFFF",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Trickier words. Longer clue.",
    activeBg: "#EB7D00",
    activeText: "#FFFFFF",
  },
  {
    value: "hard",
    label: "Hard",
    description: "Rare words. Dense clue, more blanks.",
    activeBg: "#E31B23",
    activeText: "#FFFFFF",
  },
];

export function DifficultyPicker() {
  const { difficulty, setDifficulty, hydrated } = useDifficulty();
  const selected = OPTIONS.find((o) => o.value === difficulty) ?? OPTIONS[1];

  return (
    <div className="flex flex-col items-center gap-2">
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
                  ? "shadow-[var(--shadow-xs)]"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              }`}
              style={
                active
                  ? { background: opt.activeBg, color: opt.activeText }
                  : undefined
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p
        className="min-h-[1em] text-[11px] leading-none text-[color:var(--text-muted)] transition-opacity duration-150"
        aria-live="polite"
      >
        {hydrated ? selected.description : ""}
      </p>
    </div>
  );
}
