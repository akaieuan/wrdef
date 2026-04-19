"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import type { Blank, WordEntry } from "@/types";
import { Definition } from "./Definition";
import { computeScore } from "@/lib/scoring";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";

type Props = {
  target: WordEntry;
  guessCount: number;
  didSolve: boolean;
  elapsedSeconds: number;
  bonusTimeSeconds: number;
  bonusAnswers: string[];
  bonusCompleted: boolean;
  hintsUsed: number;
  hintedIndices: number[];
  sentenceAnswered: boolean;
  sentenceCorrect: boolean;
  onPlayAgain: () => void;
};

export function ResultsPanel({
  target,
  guessCount,
  didSolve,
  elapsedSeconds,
  bonusAnswers,
  bonusCompleted,
  hintsUsed,
  hintedIndices,
  sentenceAnswered,
  sentenceCorrect,
  onPlayAgain,
}: Props) {
  const blanks: Blank[] = target.definition.blanks;

  const correctFlags = useMemo(
    () =>
      blanks.map((b, i) => {
        const given = (bonusAnswers[i] ?? "").trim().toLowerCase();
        return given.length > 0 && given === b.answer.toLowerCase();
      }),
    [bonusAnswers, blanks],
  );

  const bonusCorrect = correctFlags.filter(Boolean).length;
  const score = computeScore({
    guessCount: didSolve ? guessCount : 0,
    seconds: elapsedSeconds,
    bonusCorrect: didSolve ? bonusCorrect : 0,
    sentenceCorrect: didSolve && sentenceCorrect,
    hintCount: hintsUsed,
  });

  const { progress, isDone } = useRevealAnimation(blanks, hintedIndices, true);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto px-5 py-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)" }}
    >
      <div className="w-full max-w-sm rounded-[16px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow-lg)]">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
          {didSolve ? "Round complete" : "Out of guesses"}
        </p>
        <h2 className="mt-1 text-center text-2xl font-semibold uppercase tracking-[0.06em] text-[color:var(--text)]">
          {target.word}
        </h2>

        <div className="mt-4">
          <Definition
            text={target.definition.text}
            blanks={blanks}
            mode={{ kind: "typing", progress, hintedIndices }}
            className="text-left text-[13px] leading-[1.7] text-[color:var(--text-muted)]"
          />
        </div>

        <AnimatePresence>
          {isDone && didSolve && (
            <motion.div
              key="score"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className="mt-5 space-y-1.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3"
            >
              <Row label={`Solve · ${guessCount}/6`} value={score.solve} />
              <Row label={`Time · ${formatTime(elapsedSeconds)}`} value={score.time} />
              {bonusCompleted && (
                <Row
                  label={`Bonus · ${bonusCorrect}/${blanks.length}`}
                  value={score.bonus}
                  accent={bonusCorrect > 0}
                />
              )}
              {target.sentenceChoices && sentenceAnswered && (
                <Row
                  label={`Sentence · ${sentenceCorrect ? "correct" : "wrong"}`}
                  value={score.sentence}
                  accent={sentenceCorrect}
                />
              )}
              {hintsUsed > 0 && (
                <Row
                  label={`Hints · ${hintsUsed}`}
                  value={-score.hints}
                  warn
                />
              )}
              <div className="my-2 border-t border-[color:var(--border)]" />
              <Row label="Total" value={score.total} bold />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isDone && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="mt-6 flex justify-center"
            >
              <button
                type="button"
                onClick={onPlayAgain}
                className="flex h-10 w-40 items-center justify-center rounded-xl bg-[color:var(--accent)] text-[13px] font-medium text-[color:var(--accent-text)] shadow-[var(--shadow-sm)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
              >
                Play again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  bold = false,
  accent = false,
  warn = false,
}: {
  label: string;
  value: number;
  bold?: boolean;
  accent?: boolean;
  warn?: boolean;
}) {
  const valueColor = bold
    ? "text-[color:var(--text)]"
    : accent
      ? "text-[color:var(--accent)]"
      : warn
        ? "text-[color:var(--tile-present)]"
        : "text-[color:var(--text)]";
  return (
    <div className="flex items-center justify-between px-1">
      <span
        className={`text-[12px] ${
          bold
            ? "font-semibold text-[color:var(--text)]"
            : "text-[color:var(--text-muted)]"
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          bold
            ? "text-base font-semibold"
            : accent || warn
              ? "text-[13px] font-semibold"
              : "text-[13px] font-medium"
        } ${valueColor}`}
      >
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
