"use client";

import { useRef } from "react";

const LEN = 4;

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function InitialsInput({ value, onChange }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const chars = value.padEnd(LEN, " ").split("").slice(0, LEN);

  const setChar = (i: number, ch: string) => {
    const next = chars.slice();
    next[i] = ch;
    const joined = next.join("").trim().toUpperCase().slice(0, LEN);
    onChange(joined);
  };

  const handleChange = (i: number, v: string) => {
    const clean = v.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (!clean) {
      setChar(i, " ");
      return;
    }
    setChar(i, clean[clean.length - 1]);
    if (i < LEN - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i].trim() && i > 0) {
      refs.current[i - 1]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: LEN }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="text"
          maxLength={1}
          value={chars[i].trim()}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-10 rounded-lg border-2 border-[color:var(--border-strong)] bg-[color:var(--surface)] text-center text-xl font-semibold uppercase tracking-tight text-[color:var(--text)] outline-none transition-colors focus:border-[color:var(--text)] sm:h-14 sm:w-12 sm:text-2xl"
          aria-label={`Letter ${i + 1}`}
        />
      ))}
    </div>
  );
}
