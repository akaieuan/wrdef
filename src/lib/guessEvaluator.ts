import type { TileState } from "@/types";

export function evaluateGuess(guess: string, target: string): TileState[] {
  const len = guess.length;
  const result: TileState[] = new Array(len).fill("absent");
  const remaining: Array<string | null> = target.split("");

  for (let i = 0; i < len; i++) {
    if (guess[i] === target[i]) {
      result[i] = "correct";
      remaining[i] = null;
    }
  }

  for (let i = 0; i < len; i++) {
    if (result[i] === "correct") continue;
    const idx = remaining.indexOf(guess[i]);
    if (idx >= 0) {
      result[i] = "present";
      remaining[idx] = null;
    }
  }

  return result;
}

const KEY_RANK: Record<TileState, number> = {
  empty: 0,
  filled: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

export function computeKeyStates(
  guesses: string[],
  evaluations: TileState[][],
): Record<string, TileState> {
  const out: Record<string, TileState> = {};
  for (let g = 0; g < guesses.length; g++) {
    const word = guesses[g];
    const evals = evaluations[g];
    if (!evals) continue;
    for (let i = 0; i < word.length; i++) {
      const ch = word[i];
      const s = evals[i];
      if (!out[ch] || KEY_RANK[s] > KEY_RANK[out[ch]]) {
        out[ch] = s;
      }
    }
  }
  return out;
}
