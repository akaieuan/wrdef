"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BonusRound, type BonusRoundHandle } from "@/components/BonusRound";
import { DefinitionPanel } from "@/components/DefinitionPanel";
import { Grid } from "@/components/Grid";
import { HintButton } from "@/components/HintButton";
import { Keyboard } from "@/components/Keyboard";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toast } from "@/components/Toast";
import { useDifficulty } from "@/hooks/useDifficulty";
import { useGame } from "@/hooks/useGame";
import { usePhysicalKeyboard } from "@/hooks/useKeyboard";
import { useElapsedSeconds } from "@/hooks/useTimer";
import { WORD_LEN } from "@/lib/constants";
import { poolForDifficulty } from "@/lib/difficulty";
import { buildGuessSet, loadWordsFile, pickRandomAnswer } from "@/lib/wordData";
import type { WordsFile } from "@/types";

export default function PlayPage() {
  const {
    state,
    init,
    onKey,
    onBackspace,
    onSubmit,
    useHint,
    submitBonus,
    skipBonus,
    reset,
  } = useGame();
  const [words, setWords] = useState<WordsFile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const { difficulty, hydrated: difficultyReady } = useDifficulty();

  useEffect(() => {
    let cancelled = false;
    loadWordsFile()
      .then((w) => {
        if (cancelled) return;
        setWords(w);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Couldn't load the word list.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!words || !difficultyReady || hasInitialized.current) return;
    if (words.answerPool.length === 0) {
      setLoadError("The answer pool is empty. Run `npm run build:words`.");
      return;
    }
    hasInitialized.current = true;
    const pool = poolForDifficulty(words.answerPool, difficulty);
    init(pickRandomAnswer(pool));
  }, [words, difficultyReady, difficulty, init]);

  const validGuessSet = useMemo(
    () => (words ? buildGuessSet(words.validGuesses) : new Set<string>()),
    [words],
  );

  const bonusRef = useRef<BonusRoundHandle | null>(null);

  const handleSubmit = useCallback(() => {
    onSubmit(validGuessSet);
  }, [onSubmit, validGuessSet]);

  const isBonusPhase = state.phase === "bonus";

  const handleKey = useCallback(
    (key: string) => {
      if (isBonusPhase) {
        bonusRef.current?.pressLetter(key);
      } else {
        onKey(key);
      }
    },
    [isBonusPhase, onKey],
  );

  const handleBackspace = useCallback(() => {
    if (isBonusPhase) {
      bonusRef.current?.pressBackspace();
    } else {
      onBackspace();
    }
  }, [isBonusPhase, onBackspace]);

  const handleEnter = useCallback(() => {
    if (isBonusPhase) {
      bonusRef.current?.submit();
    } else {
      onSubmit(validGuessSet);
    }
  }, [isBonusPhase, onSubmit, validGuessSet]);

  const handlePlayAgain = useCallback(() => {
    if (!words) return;
    hasInitialized.current = false;
    reset();
    setTimeout(() => {
      hasInitialized.current = true;
      const pool = poolForDifficulty(words.answerPool, difficulty);
      init(pickRandomAnswer(pool));
    }, 0);
  }, [words, reset, init, difficulty]);

  const elapsed = useElapsedSeconds(state.startedAt, state.phase === "playing");
  const solveSeconds =
    state.startedAt && state.solvedAt
      ? Math.max(0, Math.floor((state.solvedAt - state.startedAt) / 1000))
      : elapsed;
  const bonusSeconds =
    state.bonusStartedAt && state.bonusSubmittedAt
      ? Math.max(
          0,
          Math.floor((state.bonusSubmittedAt - state.bonusStartedAt) / 1000),
        )
      : 0;

  const [toast, setToast] = useState<string | null>(null);
  const currentGuessRef = useRef(state.currentGuess);
  currentGuessRef.current = state.currentGuess;

  useEffect(() => {
    if (state.invalidShakeKey === 0) return;
    const g = currentGuessRef.current;
    const msg = g.length < WORD_LEN ? "Not enough letters" : "Not in word list";
    setToast(msg);
    const id = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(id);
  }, [state.invalidShakeKey]);

  // Physical keyboard is enabled only during "playing" — during "bonus",
  // the focused <input> handles native key events directly.
  usePhysicalKeyboard({
    onKey: handleKey,
    onBackspace: handleBackspace,
    onEnter: handleEnter,
    enabled: state.phase === "playing",
  });

  if (loadError) {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium text-[color:var(--text)]">
          Couldn&apos;t load the game.
        </p>
        <p className="mt-2 max-w-sm text-xs text-[color:var(--text-muted)]">{loadError}</p>
        <Link
          href="/"
          className="mt-6 text-sm font-medium text-[color:var(--text)] underline underline-offset-4"
        >
          Back home
        </Link>
      </main>
    );
  }

  if (!words || !state.target || state.phase === "loading") {
    return (
      <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--border-strong)] border-t-[color:var(--accent)]" />
      </main>
    );
  }

  const isBonus = isBonusPhase;

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            ← Home
          </Link>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-muted)] tabular-nums">
            {elapsed}s
          </span>
        </div>

        <HintButton
          hintsUsed={state.hintedBlanks.length}
          totalBlanks={state.target.definition.blanks.length}
          onUse={useHint}
          disabled={state.phase !== "playing"}
        />

        <div className="flex items-center gap-3">
          <Link
            href="/leaderboard"
            aria-label="Leaderboard"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] transition-all duration-200 hover:border-[color:var(--border-strong)] active:scale-95"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 2h8v3a4 4 0 0 1-8 0V2z" />
              <path d="M4 3.5H2v1.5a2 2 0 0 0 2 2M12 3.5h2v1.5a2 2 0 0 1-2 2" />
              <path d="M6.5 9.5h3v2h-3zM5 14h6" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="relative flex min-h-0 flex-1 flex-col items-center gap-3 px-4 pb-4 pt-1 sm:gap-4 sm:pt-2">
        <Toast message={toast} />

        <AnimatePresence mode="wait" initial={false}>
          {!isBonus ? (
            <motion.div
              key="play"
              className="flex min-h-0 w-full flex-1 flex-col items-center gap-3 sm:gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div className="w-full shrink-0">
                <DefinitionPanel
                  text={state.target.definition.text}
                  blanks={state.target.definition.blanks}
                  hintedIndices={state.hintedBlanks}
                />
              </div>
              <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                <div
                  className="h-full w-auto"
                  style={{
                    aspectRatio: "5 / 6",
                    // Scale with viewport height so we fill more space on tall
                    // desktops without ever overflowing the header/keyboard.
                    maxWidth: "min(42rem, 100%, calc((100dvh - 300px) * 5 / 6))",
                    maxHeight: "100%",
                  }}
                >
                  <Grid
                    guesses={state.guesses}
                    currentGuess={state.currentGuess}
                    evaluations={state.evaluations}
                    invalidShakeKey={state.invalidShakeKey}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="bonus"
              className="flex min-h-0 w-full flex-1 flex-col items-center justify-center"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <BonusRound
                ref={bonusRef}
                word={state.target.word}
                text={state.target.definition.text}
                blanks={state.target.definition.blanks}
                startedAt={state.bonusStartedAt}
                onSubmit={submitBonus}
                onSkip={skipBonus}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="w-full max-w-xl shrink-0 px-1">
          <Keyboard
            keyStates={isBonus ? {} : state.keyStates}
            onKey={handleKey}
            onBackspace={handleBackspace}
            onEnter={handleEnter}
            disabled={state.phase !== "playing" && state.phase !== "bonus"}
          />
        </div>
      </section>

      <AnimatePresence>
        {state.phase === "results" && state.target && (
          <ResultsPanel
            key="results"
            target={state.target}
            guessCount={state.guesses.length}
            didSolve={state.guesses[state.guesses.length - 1] === state.target.word}
            elapsedSeconds={solveSeconds}
            bonusTimeSeconds={bonusSeconds}
            bonusAnswers={state.bonusAnswers}
            bonusCompleted={state.bonusSubmittedAt !== null}
            hintsUsed={state.hintedBlanks.length}
            hintedIndices={state.hintedBlanks}
            onPlayAgain={handlePlayAgain}
          />
        )}
        {state.phase === "lost" && state.target && (
          <ResultsPanel
            key="lost"
            target={state.target}
            guessCount={state.guesses.length}
            didSolve={false}
            elapsedSeconds={solveSeconds}
            bonusTimeSeconds={bonusSeconds}
            bonusAnswers={state.bonusAnswers}
            bonusCompleted={false}
            hintsUsed={state.hintedBlanks.length}
            hintedIndices={state.hintedBlanks}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
