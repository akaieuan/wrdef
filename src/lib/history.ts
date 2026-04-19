import type { Blank } from "@/types";
import type { Difficulty } from "./difficulty";

export type Outcome = "solved" | "solved_with_lifeline" | "lost";

export type HistoryRecord = {
  id: string;
  word: string;
  definition: {
    text: string;
    blanks: Blank[];
  };
  difficulty: Difficulty;
  outcome: Outcome;
  solvedAt: number;
  elapsedMs: number;
  guessCount: number;
  hintsUsed: number;
  lifelineUsed: boolean;
  bonusCompleted: boolean;
  bonusAnswers: string[];
  score: number;
};

const KEY = "wrdef:history:v1";
const EVENT = "wrdef:history:changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadHistory(): HistoryRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryRecord[];
  } catch {
    return [];
  }
}

function writeHistory(records: HistoryRecord[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

export function saveRecord(record: HistoryRecord): void {
  const records = loadHistory();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) records[idx] = record;
  else records.unshift(record);
  writeHistory(records);
}

export function updateRecord(
  id: string,
  patch: Partial<HistoryRecord>,
): void {
  const records = loadHistory();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return;
  records[idx] = { ...records[idx], ...patch };
  writeHistory(records);
}

export function clearHistory(): void {
  writeHistory([]);
}

export function subscribeHistory(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => listener();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function makeRecordId(word: string, solvedAt: number): string {
  return `${word}-${solvedAt}`;
}
