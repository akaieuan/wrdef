import type {
  RawWordEntry,
  SentenceChoices,
  SentenceOption,
  WordDefinition,
  WordEntry,
} from "@/types";

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
    sentenceChoices: buildSentenceChoices(entry, def),
  };
}

/**
 * Build the 3-option multiple-choice for the post-solve sentence round.
 *
 * Returns undefined when we can't assemble 3 distinct sentences:
 * - the chosen sense has no example → nothing to test
 * - fewer than 2 other examples exist on this word → no distractors
 *
 * Distractor pool = example sentences from this word's *other* senses (the
 * ones in `definitions` the player didn't see, plus any harvested in
 * `extraExamples` that didn't make the top-3 cut at build time). Same-word
 * distractors are the pedagogical win — the player has to identify the
 * specific sense they just learned, not just the word itself.
 */
function buildSentenceChoices(
  entry: RawWordEntry,
  picked: WordDefinition,
): SentenceChoices | undefined {
  const correctText = picked.example?.trim();
  if (!correctText) return undefined;

  const correct: SentenceOption = {
    text: correctText,
    sourceDefinition: picked.text,
  };

  const candidates: SentenceOption[] = [];
  const seen = new Set([correctText]);

  for (const d of entry.definitions) {
    const ex = d.example?.trim();
    if (!ex || seen.has(ex)) continue;
    candidates.push({ text: ex, sourceDefinition: d.text });
    seen.add(ex);
  }
  for (const extra of entry.extraExamples ?? []) {
    const ex = extra.example.trim();
    if (!ex || seen.has(ex)) continue;
    candidates.push({ text: ex, sourceDefinition: extra.definition });
    seen.add(ex);
  }

  if (candidates.length < 2) return undefined;

  // Prefer distractors of a similar length so one option doesn't stand out as
  // obviously different. Cheap proxy: sort by absolute length delta, take 2.
  const byCloseness = [...candidates].sort(
    (a, b) =>
      Math.abs(a.text.length - correctText.length) -
      Math.abs(b.text.length - correctText.length),
  );
  const distractors = byCloseness.slice(0, 2);

  // Fisher–Yates shuffle so the correct answer isn't always at index 0.
  const options: SentenceOption[] = [correct, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    options,
    correctIdx: options.findIndex((o) => o.text === correctText),
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
