import type { WordEntry } from "@/types";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTY_KEY = "wrdef:difficulty:v1";

/**
 * Classifies a word entry into one of three difficulty buckets.
 * Tuned against the baked corpus to roughly produce 15% / 70% / 15%.
 */
export function classifyDifficulty(entry: WordEntry): Difficulty {
  const len = entry.definition.text.length;
  const blanks = entry.definition.blanks.length;
  const occ = entry.occurrence;

  // Hard: long, many blanks, or very rare word
  if ((len >= 150 && blanks >= 5) || occ < 1e-8) return "hard";

  // Easy: short definition, few blanks, common word
  if (len <= 90 && blanks <= 4 && occ > 1e-6) return "easy";

  return "medium";
}

/**
 * Returns the subset of the answer pool that matches the given difficulty.
 * Falls back to the full pool if the filtered set would be too small to
 * feel random (< 20 words).
 */
export function poolForDifficulty(
  pool: WordEntry[],
  difficulty: Difficulty,
): WordEntry[] {
  const filtered = pool.filter((e) => classifyDifficulty(e) === difficulty);
  return filtered.length >= 20 ? filtered : pool;
}
