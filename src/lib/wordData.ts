import { resolveEntry, type Difficulty } from "./difficulty";
import type { RawWordEntry, WordEntry, WordsFile } from "@/types";

const WORDS_URL = "/words.json?v=2";

let cached: WordsFile | null = null;
let inflight: Promise<WordsFile> | null = null;

function isValidWordsFile(data: unknown): data is WordsFile {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<WordsFile>;
  if (!Array.isArray(d.answerPool) || !Array.isArray(d.validGuesses)) return false;
  const first = d.answerPool[0];
  return !!first && Array.isArray((first as RawWordEntry).definitions);
}

export async function loadWordsFile(): Promise<WordsFile> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch(WORDS_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`words.json: ${r.status}`);
      return r.json();
    })
    .then((data) => {
      if (!isValidWordsFile(data)) {
        throw new Error("words.json is outdated. Refresh the page.");
      }
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

export function pickRandomAnswer(
  pool: RawWordEntry[],
  difficulty: Difficulty,
): WordEntry {
  if (pool.length === 0) throw new Error("empty answer pool");
  const idx = Math.floor(Math.random() * pool.length);
  return resolveEntry(pool[idx], difficulty);
}

export function buildGuessSet(validGuesses: string[]): Set<string> {
  return new Set(validGuesses);
}
