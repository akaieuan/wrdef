import { STOPWORDS } from "@/data/stopwords";
import type { Blank } from "@/types";

export type BlankResult =
  | { ok: true; blanks: Blank[] }
  | { ok: false; reason: "too_few_candidates" };

type Token = {
  text: string;
  start: number;
  end: number;
};

const WORD_RE = /[A-Za-z][A-Za-z'-]*/g;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index ?? 0;
    tokens.push({ text: m[0], start, end: start + m[0].length });
  }
  return tokens;
}

function isCandidate(token: Token, target: string): boolean {
  const lower = token.text.toLowerCase();
  if (lower.length < 4) return false;
  if (STOPWORDS.has(lower)) return false;
  if (lower.includes(target)) return false;
  if (target.length >= 4 && lower.startsWith(target.slice(0, 4))) return false;
  return true;
}

export function pickBlanks(
  text: string,
  target: string,
  max = 6,
  min = 2,
): BlankResult {
  const targetLower = target.toLowerCase();
  const tokens = tokenize(text);

  const candidates = tokens.filter((t) => isCandidate(t, targetLower));

  if (candidates.length < min) return { ok: false, reason: "too_few_candidates" };

  const seenWords = new Set<string>();
  const unique: Token[] = [];
  for (const c of candidates) {
    const key = c.text.toLowerCase();
    if (seenWords.has(key)) continue;
    seenWords.add(key);
    unique.push(c);
  }

  if (unique.length < min) return { ok: false, reason: "too_few_candidates" };

  const ranked = [...unique].sort((a, b) => b.text.length - a.text.length);
  const picks = ranked.slice(0, Math.min(max, Math.max(min, ranked.length)));

  picks.sort((a, b) => a.start - b.start);

  const blanks: Blank[] = picks.map((t) => ({
    index: t.start,
    length: t.text.length,
    answer: t.text,
  }));

  return { ok: true, blanks };
}
