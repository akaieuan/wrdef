export type TileState = "empty" | "filled" | "correct" | "present" | "absent";

export type Blank = {
  index: number;
  length: number;
  answer: string;
};

export type WordDefinition = {
  text: string;
  blanks: Blank[];
  /**
   * 0 = most primary sense (first sense of first POS block), higher = more obscure.
   * Used to route definitions to difficulty modes.
   */
  primaryRank: number;
  /**
   * An example sentence demonstrating THIS sense, lifted from the dictionary
   * source when available. Used to build the post-solve sentence round (pick
   * the correct usage). May be missing for senses that shipped without one.
   */
  example?: string;
};

/**
 * A word as stored in words.json. May have 1–3 ranked definitions.
 */
export type RawWordEntry = {
  word: string;
  occurrence: number;
  definitions: WordDefinition[];
  /**
   * Example sentences from OTHER senses of this same word that didn't land in
   * the top 3 definitions. Used as distractor material for the sentence round
   * so words with thin example coverage on their top senses can still qualify.
   * Each entry carries its source definition so the player can see what sense
   * a distractor came from after the reveal.
   */
  extraExamples?: Array<{ example: string; definition: string }>;
};

/**
 * One multiple-choice option for the sentence round. `sourceDefinition` is
 * the dictionary sense this example illustrates — for the correct option it
 * matches the sense the player just learned; for distractors it's a different
 * sense of the same word. Shown after reveal so the player sees *why* each
 * option was right/wrong.
 */
export type SentenceOption = {
  text: string;
  sourceDefinition: string;
};

/**
 * Three example sentences — one correct for the current sense, two distractors
 * drawn from OTHER senses of the same word. The correct one's position is
 * randomized at resolve time so the player can't guess it from order.
 */
export type SentenceChoices = {
  options: SentenceOption[];
  correctIdx: number;
};

/**
 * A word as consumed by the game at runtime — one definition already picked
 * based on the player's selected difficulty.
 */
export type WordEntry = {
  word: string;
  occurrence: number;
  definition: {
    text: string;
    blanks: Blank[];
  };
  /**
   * Present only when the word has enough distinct example sentences across
   * its senses to build a 3-option multiple choice. When undefined, the
   * sentence round is skipped for this word.
   */
  sentenceChoices?: SentenceChoices;
};

export type WordsFile = {
  generatedAt: string;
  answerPool: RawWordEntry[];
  validGuesses: string[];
};

export type Phase =
  | "loading"
  | "playing"
  | "won"
  | "lost"
  | "lifeline_offer"
  | "lifeline"
  | "bonus"
  | "sentence"
  | "results";
