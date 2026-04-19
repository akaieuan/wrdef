import type { WordEntry, WordsFile } from "@/types";

let cached: WordsFile | null = null;
let inflight: Promise<WordsFile> | null = null;

export async function loadWordsFile(): Promise<WordsFile> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch("/words.json", { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(`words.json: ${r.status}`);
      return r.json() as Promise<WordsFile>;
    })
    .then((data) => {
      cached = data;
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

export function pickRandomAnswer(pool: WordEntry[]): WordEntry {
  if (pool.length === 0) throw new Error("empty answer pool");
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export function buildGuessSet(validGuesses: string[]): Set<string> {
  return new Set(validGuesses);
}
