import {
  BONUS_KEYWORD_POINTS,
  HINT_COST,
  SOLVE_POINTS_BY_GUESS,
  TIME_BONUS_CAP_SECONDS,
  TIME_BONUS_MULTIPLIER,
} from "./constants";

export function solvePoints(guessCount: number): number {
  const idx = Math.max(0, Math.min(SOLVE_POINTS_BY_GUESS.length - 1, guessCount - 1));
  return SOLVE_POINTS_BY_GUESS[idx];
}

export function timeBonus(seconds: number): number {
  return Math.max(0, TIME_BONUS_CAP_SECONDS - seconds) * TIME_BONUS_MULTIPLIER;
}

export function bonusKeywordPoints(correctCount: number): number {
  return correctCount * BONUS_KEYWORD_POINTS;
}

export function hintPenalty(hintCount: number): number {
  return hintCount * HINT_COST;
}

export type ScoreBreakdown = {
  solve: number;
  time: number;
  bonus: number;
  hints: number;
  total: number;
};

export function computeScore(input: {
  guessCount: number;
  seconds: number;
  bonusCorrect: number;
  hintCount?: number;
}): ScoreBreakdown {
  const solve = solvePoints(input.guessCount);
  const time = timeBonus(input.seconds);
  const bonus = bonusKeywordPoints(input.bonusCorrect);
  const hints = hintPenalty(input.hintCount ?? 0);
  return { solve, time, bonus, hints, total: Math.max(0, solve + time + bonus - hints) };
}
