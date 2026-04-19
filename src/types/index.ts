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
  | "bonus"
  | "results";

export type LeaderboardEntry = {
  id: string;
  initials: string;
  word: string;
  occurrence: number;
  timeSeconds: number;
  totalTimeSeconds?: number;
  points: number;
  guessCount: number;
  bonusCompleted: boolean;
  bonusCorrectCount?: number;
  blanksTotal?: number;
  createdAt: string;
};

export type LeaderboardStore = {
  version: 1;
  entries: LeaderboardEntry[];
};

export type LeaderboardView = "fastest" | "points" | "wrdef";
