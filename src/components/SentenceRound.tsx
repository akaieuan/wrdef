"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { SentenceChoices } from "@/types";

type Props = {
  word: string;
  definitionText: string;
  choices: SentenceChoices;
  onSubmit: (pickedIdx: number) => void;
  onSkip: () => void;
};

/**
 * Post-solve multiple-choice: "which sentence matches the sense you just
 * learned?". The correct option is the dictionary example for the sense shown
 * in this round; distractors are pulled from OTHER senses of the same word at
 * resolve time. Optional — always skippable.
 */
export function SentenceRound({
  word,
  definitionText,
  choices,
  onSubmit,
  onSkip,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Match the target word and its close inflections so we can bold them in
  // each option. e.g. for "write" we also highlight "writes", "writing",
  // "wrote". Case-insensitive, whole-word. This is a cheap approximation —
  // irregular forms like "wrote" won't be caught, which is fine; the goal is
  // visual anchoring, not linguistic precision.
  const targetRe = useMemo(() => {
    const w = word.toLowerCase();
    const stem = w.endsWith("e") ? w.slice(0, -1) : w;
    const parts = new Set<string>([
      w,
      `${w}s`,
      `${w}ed`,
      `${w}ing`,
      `${stem}ing`,
      `${stem}ed`,
    ]);
    const pattern = `\\b(?:${Array.from(parts).join("|")})\\b`;
    return new RegExp(pattern, "gi");
  }, [word]);

  const handlePick = (idx: number) => {
    if (revealed) return;
    setSelectedIdx(idx);
  };

  const handleSubmit = () => {
    if (selectedIdx === null || revealed) return;
    setRevealed(true);
    // Small delay so the player sees the right/wrong coloring before the
    // results panel takes over.
    window.setTimeout(() => onSubmit(selectedIdx), 900);
  };

  return (
    <motion.div
      className="mx-auto flex w-full max-w-md flex-col"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
          Sentence · <span className="text-[color:var(--text)]">{word}</span>
        </p>
      </div>

      <div className="rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
          This meaning
        </p>
        <p className="mt-1 text-left text-[14px] leading-[1.55] text-[color:var(--text)]">
          {definitionText}
        </p>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        Which sentence matches it?
      </p>

      <ul className="mt-3 flex flex-col gap-2">
        {choices.options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === choices.correctIdx;
          const showCorrect = revealed && isCorrect;
          const showWrong = revealed && isSelected && !isCorrect;
          // Show the sense each DISTRACTOR came from post-reveal — this is
          // the pedagogical payoff. (The correct option already matches the
          // definition card at the top, no need to repeat.)
          const showSense = revealed && !isCorrect;
          return (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handlePick(idx)}
                disabled={revealed}
                className={[
                  "w-full rounded-[14px] border px-4 py-3 text-left text-[14px] leading-[1.5] transition-colors",
                  showCorrect
                    ? "border-[color:var(--tile-correct)] bg-[color:var(--tile-correct)]/10 text-[color:var(--text)]"
                    : showWrong
                      ? "border-[color:var(--tile-absent)] bg-[color:var(--tile-absent)]/10 text-[color:var(--text-muted)]"
                      : isSelected
                        ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--text)]"
                        : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] hover:border-[color:var(--border-strong)]",
                  "disabled:cursor-not-allowed",
                ].join(" ")}
              >
                <span className="flex items-start gap-3">
                  <span
                    className={[
                      "mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold",
                      showCorrect
                        ? "border-[color:var(--tile-correct)] bg-[color:var(--tile-correct)] text-white"
                        : showWrong
                          ? "border-[color:var(--tile-absent)] bg-[color:var(--tile-absent)] text-white"
                          : isSelected
                            ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-text)]"
                            : "border-[color:var(--border-strong)] text-[color:var(--text-muted)]",
                    ].join(" ")}
                    aria-hidden
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="flex flex-1 flex-col gap-1">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightTarget(opt.text, targetRe),
                      }}
                    />
                    {showSense && (
                      <span className="text-[11px] italic text-[color:var(--text-muted)]">
                        sense: {opt.sourceDefinition}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex w-full flex-col items-center gap-2">
        <AnimatePresence mode="wait">
          {revealed ? (
            <motion.p
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                selectedIdx === choices.correctIdx
                  ? "text-[color:var(--tile-correct)]"
                  : "text-[color:var(--tile-absent)]"
              }`}
            >
              {selectedIdx === choices.correctIdx ? "Nice" : "Not quite"}
            </motion.p>
          ) : (
            <motion.button
              key="submit"
              type="button"
              onClick={handleSubmit}
              disabled={selectedIdx === null}
              className="flex h-10 w-40 items-center justify-center rounded-xl bg-[color:var(--accent)] text-[13px] font-medium text-[color:var(--accent-text)] shadow-[var(--shadow-sm)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Submit
            </motion.button>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={onSkip}
          disabled={revealed}
          className="text-xs font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
}

/** Escape HTML then bold occurrences of the target word and its inflections. */
function highlightTarget(text: string, re: RegExp): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(
    re,
    (m) => `<strong class="font-semibold text-[color:var(--text)]">${m}</strong>`,
  );
}
