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
};

/**
 * A word as stored in words.json. May have 1–3 ranked definitions.
 */
export type RawWordEntry = {
  word: string;
  occurrence: number;
  definitions: WordDefinition[];
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
  | "results";
