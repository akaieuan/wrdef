"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useReducer } from "react";
import { evaluateGuess } from "@/lib/guessEvaluator";
import type { TileState } from "@/types";

type Sequence = { target: string; guesses: string[] };

const SEQUENCES: Sequence[] = [
  { target: "plane", guesses: ["crane", "plane"] },
  { target: "storm", guesses: ["stork", "storm"] },
  { target: "flint", guesses: ["print", "flint"] },
  { target: "light", guesses: ["least", "light"] },
  { target: "haven", guesses: ["hover", "haven"] },
  { target: "noble", guesses: ["noise", "noble"] },
  { target: "prose", guesses: ["spore", "prose"] },
  { target: "drift", guesses: ["trick", "drift"] },
  { target: "quilt", guesses: ["guilt", "quilt"] },
  { target: "thumb", guesses: ["crumb", "thumb"] },
];

const TYPE_STEP = 110;
const PRE_REVEAL = 260;
const REVEAL_STEP = 130;
const HOLD_MS = 900;
const MORPH_MS = 380;
const CELEBRATE_MS = 750;
const FADE_MS = 450;
const GAP_MS = 320;

type Phase =
  | "typing"
  | "pre-reveal"
  | "revealing"
  | "holding"
  | "morphing"
  | "celebrating"
  | "fading";

type State = {
  seqIdx: number;
  guessIdx: number;
  typed: number;
  phase: Phase;
  tick: number;
};

function reducer(state: State, action: { wordLen: number; isLast: boolean }): State {
  const { phase } = state;
  if (phase === "typing") {
    if (state.typed < action.wordLen) {
      return { ...state, typed: state.typed + 1, tick: state.tick + 1 };
    }
    return { ...state, phase: "pre-reveal", tick: state.tick + 1 };
  }
  if (phase === "pre-reveal") {
    return { ...state, phase: "revealing", tick: state.tick + 1 };
  }
  if (phase === "revealing") {
    return { ...state, phase: "holding", tick: state.tick + 1 };
  }
  if (phase === "holding") {
    if (action.isLast) {
      return { ...state, phase: "celebrating", tick: state.tick + 1 };
    }
    return { ...state, phase: "morphing", tick: state.tick + 1 };
  }
  if (phase === "morphing") {
    return {
      ...state,
      guessIdx: state.guessIdx + 1,
      phase: "revealing",
      tick: state.tick + 1,
    };
  }
  if (phase === "celebrating") {
    return { ...state, phase: "fading", tick: state.tick + 1 };
  }
  // fading → advance to next sequence
  return {
    seqIdx: (state.seqIdx + 1) % SEQUENCES.length,
    guessIdx: 0,
    typed: 0,
    phase: "typing",
    tick: state.tick + 1,
  };
}

function colorFor(s: TileState): string {
  if (s === "correct") return "var(--tile-correct)";
  if (s === "present") return "var(--tile-present)";
  if (s === "absent") return "var(--text-muted)";
  return "var(--text)";
}

export function WordRain() {
  const [state, dispatch] = useReducer(reducer, {
    seqIdx: 0,
    guessIdx: 0,
    typed: 0,
    phase: "typing" as Phase,
    tick: 0,
  });

  const seq = SEQUENCES[state.seqIdx];
  const currentGuess = seq.guesses[state.guessIdx] ?? "";
  const isLast = state.guessIdx >= seq.guesses.length - 1;

  const evaluation = useMemo(
    () => evaluateGuess(currentGuess, seq.target),
    [currentGuess, seq.target],
  );

  useEffect(() => {
    let delay = 0;
    if (state.phase === "typing") delay = TYPE_STEP;
    else if (state.phase === "pre-reveal") delay = PRE_REVEAL;
    else if (state.phase === "revealing")
      delay = REVEAL_STEP * currentGuess.length + 120;
    else if (state.phase === "holding") delay = HOLD_MS;
    else if (state.phase === "morphing") delay = MORPH_MS;
    else if (state.phase === "celebrating") delay = CELEBRATE_MS;
    else if (state.phase === "fading") delay = FADE_MS + GAP_MS;

    const timer = setTimeout(() => {
      dispatch({ wordLen: currentGuess.length, isLast });
    }, delay);
    return () => clearTimeout(timer);
  }, [state.tick, state.phase, currentGuess, isLast]);

  const showColors =
    state.phase === "revealing" ||
    state.phase === "holding" ||
    state.phase === "morphing" ||
    state.phase === "celebrating" ||
    state.phase === "fading";
  const fading = state.phase === "fading";
  const celebrating = state.phase === "celebrating";

  return (
    <div
      className="pointer-events-none block select-none"
      aria-hidden
    >
      <motion.span
        className="inline-flex items-end font-thin lowercase"
        style={{ letterSpacing: "0.02em", lineHeight: 1 }}
        animate={{ opacity: fading ? 0 : 1 }}
        transition={{ duration: FADE_MS / 1000, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {Array.from({ length: currentGuess.length }, (_, i) => {
          const letter = i < state.typed ? currentGuess[i] : "";
          const color =
            showColors && i < state.typed
              ? colorFor(evaluation[i])
              : "var(--text)";
          const revealDelay =
            state.phase === "revealing" ? (i * REVEAL_STEP) / 1000 : 0;
          return (
            <span
              key={`pos-${state.seqIdx}-${i}`}
              className="relative inline-flex"
              style={{ width: "0.62em", justifyContent: "center" }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={letter || "blank"}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{
                    duration: 0.24,
                    ease: [0.22, 0.61, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  <motion.span
                    animate={{
                      color,
                      y: celebrating ? [0, -6, 0] : 0,
                      scale: celebrating ? [1, 1.08, 1] : 1,
                    }}
                    transition={{
                      color: { duration: 0.3, delay: revealDelay },
                      y: {
                        duration: 0.5,
                        delay: celebrating ? i * 0.06 : 0,
                        ease: [0.22, 0.61, 0.36, 1],
                      },
                      scale: {
                        duration: 0.5,
                        delay: celebrating ? i * 0.06 : 0,
                        ease: [0.22, 0.61, 0.36, 1],
                      },
                    }}
                    className="inline-block"
                  >
                    {letter || "\u00A0"}
                  </motion.span>
                </motion.span>
              </AnimatePresence>
            </span>
          );
        })}
        {state.phase === "typing" && state.typed < currentGuess.length && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.1, 0.9, 0.1] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            style={{
              color: "var(--accent)",
              marginLeft: "2px",
            }}
          >
            |
          </motion.span>
        )}
      </motion.span>
    </div>
  );
}
