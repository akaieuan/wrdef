"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { Blank, WordEntry } from "@/types";
import { Definition } from "./Definition";
import { computeScore } from "@/lib/scoring";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";
import { InitialsInput } from "./InitialsInput";

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
  onPlayAgain: () => void;
};

export function ResultsPanel({
  target,
  guessCount,
  didSolve,
  elapsedSeconds,
  bonusTimeSeconds,
  bonusAnswers,
  bonusCompleted,
  hintsUsed,
  hintedIndices,
  onPlayAgain,
}: Props) {
  const { add, qualifies } = useLeaderboard();
  const [initials, setInitials] = useState("");
  const [saved, setSaved] = useState(false);

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
    hintCount: hintsUsed,
  });

  const totalTimeSeconds = elapsedSeconds + (bonusCompleted ? bonusTimeSeconds : 0);

  const eligible =
    didSolve &&
    qualifies({
      timeSeconds: elapsedSeconds,
      points: score.total,
      totalTimeSeconds,
      bonusCompleted,
      bonusCorrectCount: bonusCorrect,
      blanksTotal: blanks.length,
    });

  // Run reveal animation whenever the panel mounts. We play it whether solved
  // or not — on a loss, seeing the answers still completes the loop.
  const { progress, isDone } = useRevealAnimation(blanks, hintedIndices, true);

  const handleSave = () => {
    if (!eligible) return;
    const clean = initials.trim().toUpperCase();
    if (clean.length === 0) return;
    add({
      id: crypto.randomUUID(),
      initials: clean.padEnd(4, "-").slice(0, 4),
      word: target.word,
      occurrence: target.occurrence,
      timeSeconds: elapsedSeconds,
      totalTimeSeconds,
      points: score.total,
      guessCount,
      bonusCompleted,
      bonusCorrectCount: bonusCorrect,
      blanksTotal: blanks.length,
      createdAt: new Date().toISOString(),
    });
    setSaved(true);
  };

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
          {isDone && eligible && !saved && (
            <motion.div
              key="save"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-5 rounded-xl border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)] p-4"
            >
              <p className="text-center text-[13px] font-semibold text-[color:var(--text)]">
                You made the leaderboard.
              </p>
              <div className="mt-3">
                <InitialsInput value={initials} onChange={setInitials} />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={initials.trim().length === 0}
                className="mt-3 flex h-9 w-full items-center justify-center rounded-lg bg-[color:var(--accent)] text-[12px] font-semibold text-[color:var(--accent-text)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {saved && (
          <p className="mt-5 text-center text-[13px] font-medium text-[color:var(--accent)]">
            Saved to leaderboard.
          </p>
        )}

        <AnimatePresence>
          {isDone && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="mt-6 flex flex-col items-center gap-1.5"
            >
              <button
                type="button"
                onClick={onPlayAgain}
                className="flex h-10 w-40 items-center justify-center rounded-xl bg-[color:var(--accent)] text-[13px] font-medium text-[color:var(--accent-text)] shadow-[var(--shadow-sm)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
              >
                Play again
              </button>
              <Link
                href="/leaderboard"
                className="text-[12px] font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
              >
                View leaderboard
              </Link>
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
