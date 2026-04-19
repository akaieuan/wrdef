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

/**
 * Does `token` share enough of a stem with `target` that leaving it visible
 * would hand the answer to the player? Catches three cases:
 *   - token contains the target (houseboat ⊃ house, abortion ⊃ abort)
 *   - target contains the token (houses ⊂ house once lowercased trivially;
 *     more useful for irregular short forms)
 *   - token and target share a 4+ character prefix (abort/aborted/aborting)
 */
function sharesStemWith(token: string, target: string): boolean {
  if (token.length < 3 || target.length < 3) return false;
  if (token === target) return true;
  if (token.includes(target)) return true;
  if (target.includes(token)) return true;
  const prefixLen = 4;
  if (
    token.length >= prefixLen &&
    target.length >= prefixLen &&
    token.slice(0, prefixLen) === target.slice(0, prefixLen)
  ) {
    return true;
  }
  return false;
}

function isKeywordCandidate(token: Token): boolean {
  const lower = token.text.toLowerCase();
  if (lower.length < 4) return false;
  if (STOPWORDS.has(lower)) return false;
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

  // Tokens that share a stem with the target MUST be blanked — otherwise a
  // definition that mentions "abortion" (target "abort") or "housekeeper"
  // (target "house") gives the answer away. These are "forced" regardless of
  // length or stopword status.
  const forced: Token[] = [];
  const keywordCandidates: Token[] = [];
  const seenForced = new Set<string>();
  for (const t of tokens) {
    const lower = t.text.toLowerCase();
    if (sharesStemWith(lower, targetLower)) {
      if (!seenForced.has(lower)) {
        seenForced.add(lower);
        forced.push(t);
      }
      continue;
    }
    if (isKeywordCandidate(t)) keywordCandidates.push(t);
  }

  // Dedupe keyword candidates by text so we don't pick the same word twice.
  const seenKeyword = new Set<string>();
  const uniqueKeywords: Token[] = [];
  for (const c of keywordCandidates) {
    const key = c.text.toLowerCase();
    if (seenKeyword.has(key)) continue;
    seenKeyword.add(key);
    uniqueKeywords.push(c);
  }

  // Forced blanks count against the budget. Rank remaining keywords by
  // length (longer words are juicier clues to hide) and take up to the
  // remaining budget.
  const keywordBudget = Math.max(0, max - forced.length);
  const rankedKeywords = [...uniqueKeywords].sort(
    (a, b) => b.text.length - a.text.length,
  );
  const keywordPicks = rankedKeywords.slice(0, keywordBudget);

  const allPicks = [...forced, ...keywordPicks].sort((a, b) => a.start - b.start);
  if (allPicks.length < min) return { ok: false, reason: "too_few_candidates" };

  const blanks: Blank[] = allPicks.map((t) => ({
    index: t.start,
    length: t.text.length,
    answer: t.text,
  }));

  return { ok: true, blanks };
}
