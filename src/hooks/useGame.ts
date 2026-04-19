"use client";

import { useReducer, useCallback } from "react";
import type { Phase, TileState, WordEntry } from "@/types";
import { MAX_GUESSES, WORD_LEN } from "@/lib/constants";
import { computeKeyStates, evaluateGuess } from "@/lib/guessEvaluator";

export type GameState = {
  phase: Phase;
  target: WordEntry | null;
  guesses: string[];
  currentGuess: string;
  evaluations: TileState[][];
  keyStates: Record<string, TileState>;
  startedAt: number | null;
  solvedAt: number | null;
  bonusAnswers: string[];
  bonusStartedAt: number | null;
  bonusSubmittedAt: number | null;
  hintedBlanks: number[];
  invalidShakeKey: number;
  lifelineUsed: boolean;
  lifelineGrantedExtra: boolean;
  sentenceStartedAt: number | null;
  sentenceSubmittedAt: number | null;
  sentencePickedIdx: number | null;
  sentenceAnswered: boolean;
  sentenceCorrect: boolean;
};

export type GameAction =
  | { type: "INIT"; target: WordEntry }
  | { type: "KEY"; key: string }
  | { type: "BACKSPACE" }
  | { type: "SUBMIT"; validGuesses: Set<string> }
  | { type: "USE_HINT" }
  | { type: "START_BONUS" }
  | { type: "SUBMIT_BONUS"; answers: string[] }
  | { type: "FINISH_BONUS" }
  | { type: "SKIP_BONUS" }
  | { type: "SUBMIT_SENTENCE"; pickedIdx: number }
  | { type: "SKIP_SENTENCE" }
  | { type: "OPEN_LIFELINE" }
  | { type: "DECLINE_LIFELINE" }
  | { type: "LIFELINE_SUCCESS" }
  | { type: "LIFELINE_FAIL" }
  | { type: "RESET" };

function initialState(): GameState {
  return {
    phase: "loading",
    target: null,
    guesses: [],
    currentGuess: "",
    evaluations: [],
    keyStates: {},
    startedAt: null,
    solvedAt: null,
    bonusAnswers: [],
    bonusStartedAt: null,
    bonusSubmittedAt: null,
    hintedBlanks: [],
    invalidShakeKey: 0,
    lifelineUsed: false,
    lifelineGrantedExtra: false,
    sentenceStartedAt: null,
    sentenceSubmittedAt: null,
    sentencePickedIdx: null,
    sentenceAnswered: false,
    sentenceCorrect: false,
  };
}

/**
 * After a solve or bonus exit, go to the sentence round if this word has
 * multiple-choice sentence options available — otherwise straight to results.
 */
function phaseAfterBonus(target: WordEntry | null): Phase {
  if (target?.sentenceChoices) return "sentence";
  return "results";
}

function maxGuesses(state: GameState): number {
  return MAX_GUESSES + (state.lifelineGrantedExtra ? 1 : 0);
}

function isLetter(key: string): boolean {
  return /^[a-z]$/.test(key);
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "INIT": {
      return {
        ...initialState(),
        phase: "playing",
        target: action.target,
        bonusAnswers: new Array(action.target.definition.blanks.length).fill(""),
      };
    }

    case "OPEN_LIFELINE": {
      if (state.phase !== "lifeline_offer") return state;
      return { ...state, phase: "lifeline" };
    }

    case "DECLINE_LIFELINE": {
      if (state.phase !== "lifeline_offer" && state.phase !== "lifeline")
        return state;
      return { ...state, phase: "lost", lifelineUsed: true };
    }

    case "LIFELINE_SUCCESS": {
      if (state.phase !== "lifeline" || !state.target) return state;
      return {
        ...state,
        phase: "playing",
        lifelineUsed: true,
        lifelineGrantedExtra: true,
      };
    }

    case "LIFELINE_FAIL": {
      if (state.phase !== "lifeline") return state;
      return { ...state, phase: "lost", lifelineUsed: true };
    }

    case "KEY": {
      if (state.phase !== "playing" || !state.target) return state;
      const key = action.key.toLowerCase();
      if (!isLetter(key)) return state;
      if (state.currentGuess.length >= WORD_LEN) return state;
      return {
        ...state,
        currentGuess: state.currentGuess + key,
        startedAt: state.startedAt ?? Date.now(),
      };
    }

    case "USE_HINT": {
      if (state.phase !== "playing" || !state.target) return state;
      const total = state.target.definition.blanks.length;
      const used = new Set(state.hintedBlanks);
      const remaining: number[] = [];
      for (let i = 0; i < total; i++) if (!used.has(i)) remaining.push(i);
      if (remaining.length === 0) return state;
      const next = remaining[Math.floor(Math.random() * remaining.length)];
      return {
        ...state,
        hintedBlanks: [...state.hintedBlanks, next],
        startedAt: state.startedAt ?? Date.now(),
      };
    }

    case "BACKSPACE": {
      if (state.phase !== "playing") return state;
      if (state.currentGuess.length === 0) return state;
      return { ...state, currentGuess: state.currentGuess.slice(0, -1) };
    }

    case "SUBMIT": {
      if (state.phase !== "playing" || !state.target) return state;
      const guess = state.currentGuess;
      if (guess.length !== WORD_LEN) {
        return { ...state, invalidShakeKey: state.invalidShakeKey + 1 };
      }
      if (!action.validGuesses.has(guess)) {
        return { ...state, invalidShakeKey: state.invalidShakeKey + 1 };
      }
      const evaluation = evaluateGuess(guess, state.target.word);
      const nextGuesses = [...state.guesses, guess];
      const nextEvals = [...state.evaluations, evaluation];
      const nextKeys = computeKeyStates(nextGuesses, nextEvals);
      const solved = guess === state.target.word;
      const outOfGuesses = nextGuesses.length >= maxGuesses(state);
      const now = Date.now();
      // If the player took any hints, they forfeit the bonus round — go straight
      // to the reveal / results. Clean solves still earn the fill-in-the-blanks.
      const usedHints = state.hintedBlanks.length > 0;
      const eligibleForBonus = solved && !usedHints;
      const phase: Phase = solved
        ? eligibleForBonus
          ? "bonus"
          : phaseAfterBonus(state.target)
        : outOfGuesses
          ? state.lifelineUsed
            ? "lost"
            : "lifeline_offer"
          : "playing";
      return {
        ...state,
        guesses: nextGuesses,
        evaluations: nextEvals,
        keyStates: nextKeys,
        currentGuess: "",
        phase,
        solvedAt: solved ? now : state.solvedAt,
        bonusStartedAt: eligibleForBonus ? now : state.bonusStartedAt,
      };
    }

    case "START_BONUS": {
      if (state.phase === "bonus") return state;
      return {
        ...state,
        phase: "bonus",
        bonusStartedAt: state.bonusStartedAt ?? Date.now(),
      };
    }

    case "SUBMIT_BONUS": {
      if (state.phase !== "bonus") return state;
      const nextPhase = phaseAfterBonus(state.target);
      return {
        ...state,
        bonusAnswers: action.answers,
        bonusSubmittedAt: Date.now(),
        phase: nextPhase,
        sentenceStartedAt:
          nextPhase === "sentence" ? Date.now() : state.sentenceStartedAt,
      };
    }

    case "FINISH_BONUS": {
      if (state.phase !== "bonus") return state;
      const nextPhase = phaseAfterBonus(state.target);
      return {
        ...state,
        bonusSubmittedAt: Date.now(),
        phase: nextPhase,
        sentenceStartedAt:
          nextPhase === "sentence" ? Date.now() : state.sentenceStartedAt,
      };
    }

    case "SKIP_BONUS": {
      if (state.phase !== "won" && state.phase !== "bonus") return state;
      const nextPhase = phaseAfterBonus(state.target);
      return {
        ...state,
        phase: nextPhase,
        sentenceStartedAt:
          nextPhase === "sentence" ? Date.now() : state.sentenceStartedAt,
      };
    }

    case "SUBMIT_SENTENCE": {
      if (state.phase !== "sentence" || !state.target?.sentenceChoices) {
        return state;
      }
      const correctIdx = state.target.sentenceChoices.correctIdx;
      return {
        ...state,
        phase: "results",
        sentenceSubmittedAt: Date.now(),
        sentencePickedIdx: action.pickedIdx,
        sentenceAnswered: true,
        sentenceCorrect: action.pickedIdx === correctIdx,
      };
    }

    case "SKIP_SENTENCE": {
      if (state.phase !== "sentence") return state;
      return {
        ...state,
        phase: "results",
        sentenceSubmittedAt: Date.now(),
        sentenceAnswered: false,
        sentenceCorrect: false,
      };
    }

    case "RESET":
      return initialState();

    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const init = useCallback((target: WordEntry) => {
    dispatch({ type: "INIT", target });
  }, []);

  const onKey = useCallback((key: string) => {
    dispatch({ type: "KEY", key });
  }, []);

  const onBackspace = useCallback(() => {
    dispatch({ type: "BACKSPACE" });
  }, []);

  const onSubmit = useCallback((validGuesses: Set<string>) => {
    dispatch({ type: "SUBMIT", validGuesses });
  }, []);

  const useHint = useCallback(() => dispatch({ type: "USE_HINT" }), []);

  const startBonus = useCallback(() => dispatch({ type: "START_BONUS" }), []);
  const submitBonus = useCallback(
    (answers: string[]) => dispatch({ type: "SUBMIT_BONUS", answers }),
    [],
  );
  const finishBonus = useCallback(() => dispatch({ type: "FINISH_BONUS" }), []);
  const skipBonus = useCallback(() => dispatch({ type: "SKIP_BONUS" }), []);
  const submitSentence = useCallback(
    (pickedIdx: number) => dispatch({ type: "SUBMIT_SENTENCE", pickedIdx }),
    [],
  );
  const skipSentence = useCallback(
    () => dispatch({ type: "SKIP_SENTENCE" }),
    [],
  );
  const openLifeline = useCallback(() => dispatch({ type: "OPEN_LIFELINE" }), []);
  const declineLifeline = useCallback(
    () => dispatch({ type: "DECLINE_LIFELINE" }),
    [],
  );
  const lifelineSuccess = useCallback(
    () => dispatch({ type: "LIFELINE_SUCCESS" }),
    [],
  );
  const lifelineFail = useCallback(
    () => dispatch({ type: "LIFELINE_FAIL" }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    init,
    onKey,
    onBackspace,
    onSubmit,
    useHint,
    startBonus,
    submitBonus,
    finishBonus,
    skipBonus,
    submitSentence,
    skipSentence,
    openLifeline,
    declineLifeline,
    lifelineSuccess,
    lifelineFail,
    reset,
  };
}
