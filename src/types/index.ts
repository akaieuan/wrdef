export type TileState = "empty" | "filled" | "correct" | "present" | "absent";

export type Blank = {
  index: number;
  length: number;
  answer: string;
};

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
  answerPool: WordEntry[];
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
