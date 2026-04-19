import type { RawWordEntry, WordDefinition, WordEntry } from "@/types";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTY_KEY = "wrdef:difficulty:v1";

/**
 * Pick the definition within an entry that best matches the target difficulty.
 *
 * - easy   → most primary sense (rank 0)
 * - medium → a secondary sense if available, else primary
 * - hard   → the most obscure sense available, else best-available
 *
 * Words with only a single definition fall back to that single definition at
 * every difficulty — the player still sees content, just without a
 * difficulty-specific twist on that word.
 */
export function pickDefinitionForDifficulty(
  entry: RawWordEntry,
  difficulty: Difficulty,
): WordDefinition {
  const defs = [...entry.definitions].sort(
    (a, b) => a.primaryRank - b.primaryRank,
  );
  if (defs.length === 0) {
    throw new Error(`entry ${entry.word} has no definitions`);
  }
  if (defs.length === 1) return defs[0];

  if (difficulty === "easy") return defs[0];
  if (difficulty === "hard") return defs[defs.length - 1];

  // medium: prefer rank 1 if it exists, else the middle
  if (defs.length >= 2) return defs[1];
  return defs[Math.floor(defs.length / 2)];
}

/**
 * Resolve a raw entry down to the `WordEntry` shape the game consumes (with a
 * single `definition` field).
 */
export function resolveEntry(
  entry: RawWordEntry,
  difficulty: Difficulty,
): WordEntry {
  const def = pickDefinitionForDifficulty(entry, difficulty);
  return {
    word: entry.word,
    occurrence: entry.occurrence,
    definition: { text: def.text, blanks: def.blanks },
  };
}

/**
 * Classifies an *entry* (full word + all its definitions) into a difficulty
 * bucket. Used to shape the pool so that medium/hard tiers skew toward words
 * that actually benefit from the tier — rare words, words with more obscure
 * senses available, etc.
 */
export function classifyDifficulty(entry: RawWordEntry): Difficulty {
  const occ = entry.occurrence;
  const defsCount = entry.definitions.length;

  // Very rare word, or has a meaningfully obscure sense available → hard bucket.
  if (occ < 1e-8 || (defsCount >= 3 && occ < 1e-7)) return "hard";

  // Common word with just one obvious sense → easy bucket.
  if (occ > 1e-6 && defsCount === 1) return "easy";

  return "medium";
}

/**
 * Returns the subset of the raw pool that matches the given difficulty.
 * Falls back to the full pool if the filtered set would be too small.
 */
export function poolForDifficulty(
  pool: RawWordEntry[],
  difficulty: Difficulty,
): RawWordEntry[] {
  // For medium/hard we prefer entries that HAVE a definition at that rank —
  // otherwise the difficulty selector is just a recolor. Easy can draw from
  // anything since every entry has rank 0.
  const filtered = pool.filter((e) => {
    if (difficulty === "easy") return true;
    const need = difficulty === "hard" ? 3 : 2;
    if (e.definitions.length >= need) return true;
    // Allow words classified as this difficulty by rarity, even if they only
    // have one definition (their obscurity does the work).
    return classifyDifficulty(e) === difficulty;
  });
  return filtered.length >= 20 ? filtered : pool;
}
