"use client";

import type { TileState } from "@/types";

type Props = {
  keyStates: Record<string, TileState>;
  onKey: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  disabled?: boolean;
};

const ROWS = [
  "qwertyuiop".split(""),
  "asdfghjkl".split(""),
  ["Enter", ..."zxcvbnm".split(""), "Back"],
];

const STATE_CLASS: Record<TileState, string> = {
  empty: "bg-[color:var(--surface)] text-[color:var(--text)] border border-[color:var(--border)]",
  filled: "bg-[color:var(--surface)] text-[color:var(--text)] border border-[color:var(--border)]",
  correct: "bg-[color:var(--tile-correct)] text-white border border-transparent",
  present: "bg-[color:var(--tile-present)] text-white border border-transparent",
  absent: "bg-[color:var(--tile-absent)] text-white border border-transparent",
};

export function Keyboard({ keyStates, onKey, onBackspace, onEnter, disabled }: Props) {
  const handle = (k: string) => {
    if (disabled) return;
    if (k === "Enter") onEnter();
    else if (k === "Back") onBackspace();
    else onKey(k);
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      {ROWS.map((row, r) => (
        <div key={r} className="flex w-full justify-center gap-1 sm:gap-1.5">
          {row.map((k) => {
            const isAction = k === "Enter" || k === "Back";
            const state = keyStates[k.toLowerCase()] ?? "empty";
            const label = k === "Back" ? "⌫" : k === "Enter" ? "Enter" : k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => handle(k)}
                disabled={disabled}
                className={`flex h-12 shrink-0 items-center justify-center rounded-lg text-sm font-medium uppercase tracking-wide transition-transform duration-100 active:scale-95 sm:h-14 ${
                  isAction ? "px-3 text-xs sm:px-4" : "w-8 sm:w-10"
                } ${isAction ? STATE_CLASS.empty : STATE_CLASS[state]} ${
                  disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
