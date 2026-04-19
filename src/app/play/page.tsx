"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BonusRound, type BonusRoundHandle } from "@/components/BonusRound";
import { DefinitionPanel } from "@/components/DefinitionPanel";
import { Grid } from "@/components/Grid";
import { HintButton } from "@/components/HintButton";
import { Keyboard } from "@/components/Keyboard";
import { LifelineOffer } from "@/components/LifelineOffer";
import { LifelineRound, type LifelineRoundHandle } from "@/components/LifelineRound";
import { ResultsPanel } from "@/components/ResultsPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Toast } from "@/components/Toast";
import { useDifficulty } from "@/hooks/useDifficulty";
import { useGame } from "@/hooks/useGame";
import { usePhysicalKeyboard } from "@/hooks/useKeyboard";
import { useElapsedSeconds } from "@/hooks/useTimer";
import { WORD_LEN } from "@/lib/constants";
import { poolForDifficulty } from "@/lib/difficulty";
import { makeRecordId, saveRecord, type HistoryRecord } from "@/lib/history";
import { computeScore } from "@/lib/scoring";
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
    openLifeline,
    declineLifeline,
    lifelineSuccess,
    lifelineFail,
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
  const lifelineRef = useRef<LifelineRoundHandle | null>(null);

  const handleSubmit = useCallback(() => {
    onSubmit(validGuessSet);
  }, [onSubmit, validGuessSet]);

  const isBonusPhase = state.phase === "bonus";
  const isLifelinePhase = state.phase === "lifeline";

  const handleKey = useCallback(
    (key: string) => {
      if (isBonusPhase) bonusRef.current?.pressLetter(key);
      else if (isLifelinePhase) lifelineRef.current?.pressLetter(key);
      else onKey(key);
    },
    [isBonusPhase, isLifelinePhase, onKey],
  );

  const handleBackspace = useCallback(() => {
    if (isBonusPhase) bonusRef.current?.pressBackspace();
    else if (isLifelinePhase) lifelineRef.current?.pressBackspace();
    else onBackspace();
  }, [isBonusPhase, isLifelinePhase, onBackspace]);

  const handleEnter = useCallback(() => {
    if (isBonusPhase) bonusRef.current?.submit();
    else if (isLifelinePhase) lifelineRef.current?.submit();
    else onSubmit(validGuessSet);
  }, [isBonusPhase, isLifelinePhase, onSubmit, validGuessSet]);

  const handlePlayAgain = useCallback(() => {
    if (!words) return;
    hasInitialized.current = false;
    savedIdRef.current = null;
    reset();
    setTimeout(() => {
      hasInitialized.current = true;
      const pool = poolForDifficulty(words.answerPool, difficulty);
      init(pickRandomAnswer(pool));
    }, 0);
  }, [words, reset, init, difficulty]);

  const savedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!state.target) return;
    if (state.phase !== "results" && state.phase !== "lost") return;

    const lastGuess = state.guesses[state.guesses.length - 1];
    const solved = lastGuess === state.target.word;
    const endedAt = solved
      ? state.solvedAt ?? Date.now()
      : Date.now();
    const id =
      savedIdRef.current ?? makeRecordId(state.target.word, endedAt);
    savedIdRef.current = id;

    const elapsedMs =
      state.startedAt != null ? Math.max(0, endedAt - state.startedAt) : 0;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const bonusCorrect = state.target.definition.blanks.reduce(
      (n, b, i) => {
        const given = (state.bonusAnswers[i] ?? "").trim().toLowerCase();
        return n + (given.length > 0 && given === b.answer.toLowerCase() ? 1 : 0);
      },
      0,
    );
    const score = solved
      ? computeScore({
          guessCount: state.guesses.length,
          seconds: elapsedSeconds,
          bonusCorrect,
          hintCount: state.hintedBlanks.length,
        }).total
      : 0;

    const outcome: HistoryRecord["outcome"] = solved
      ? state.lifelineGrantedExtra
        ? "solved_with_lifeline"
        : "solved"
      : "lost";

    const record: HistoryRecord = {
      id,
      word: state.target.word,
      definition: state.target.definition,
      difficulty,
      outcome,
      solvedAt: endedAt,
      elapsedMs,
      guessCount: state.guesses.length,
      hintsUsed: state.hintedBlanks.length,
      lifelineUsed: state.lifelineUsed,
      bonusCompleted: state.bonusSubmittedAt !== null,
      bonusAnswers: state.bonusAnswers,
      score,
    };
    saveRecord(record);
  }, [
    state.phase,
    state.bonusSubmittedAt,
    state.target,
    state.guesses,
    state.solvedAt,
    state.startedAt,
    state.bonusAnswers,
    state.hintedBlanks.length,
    state.lifelineUsed,
    state.lifelineGrantedExtra,
    difficulty,
  ]);

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

  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const update = () => setGridWidth(el.getBoundingClientRect().width);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.phase]);

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

  const centerPhase: "play" | "bonus" | "lifeline" = isBonusPhase
    ? "bonus"
    : isLifelinePhase
      ? "lifeline"
      : "play";

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
          <ThemeToggle />
        </div>
      </header>

      <section className="relative flex min-h-0 flex-1 flex-col items-center gap-3 px-4 pb-4 pt-1 sm:gap-4 sm:pt-2">
        <Toast message={toast} />

        <motion.div
          key={centerPhase}
          className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
        >
          {centerPhase === "play" && (
            <>
              <div
                className="mx-auto w-full shrink-0"
                style={gridWidth ? { maxWidth: `${gridWidth}px` } : undefined}
              >
                <DefinitionPanel
                  text={state.target.definition.text}
                  blanks={state.target.definition.blanks}
                  hintedIndices={state.hintedBlanks}
                />
              </div>
              <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                <div
                  ref={gridRef}
                  style={{
                    aspectRatio: "5 / 6",
                    width: "min(100%, 22rem, calc((100dvh - 400px) * 5 / 6))",
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
            </>
          )}
          {centerPhase === "bonus" && (
            <BonusRound
              ref={bonusRef}
              word={state.target.word}
              text={state.target.definition.text}
              blanks={state.target.definition.blanks}
              startedAt={state.bonusStartedAt}
              onSubmit={submitBonus}
              onSkip={skipBonus}
            />
          )}
          {centerPhase === "lifeline" && (
            <LifelineRound
              ref={lifelineRef}
              word={state.target.word}
              text={state.target.definition.text}
              blanks={state.target.definition.blanks}
              onSuccess={lifelineSuccess}
              onFail={lifelineFail}
              onDecline={declineLifeline}
            />
          )}
        </motion.div>

        <div className="mx-auto w-full max-w-xl shrink-0 px-1">
          <Keyboard
            keyStates={centerPhase === "play" ? state.keyStates : {}}
            onKey={handleKey}
            onBackspace={handleBackspace}
            onEnter={handleEnter}
            disabled={
              state.phase !== "playing" &&
              state.phase !== "bonus" &&
              state.phase !== "lifeline"
            }
          />
        </div>
      </section>

      <AnimatePresence>
        {state.phase === "lifeline_offer" && state.target && (
          <LifelineOffer
            key="lifeline_offer"
            text={state.target.definition.text}
            blanks={state.target.definition.blanks}
            hintedIndices={state.hintedBlanks}
            onUse={openLifeline}
            onSkip={declineLifeline}
          />
        )}
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
