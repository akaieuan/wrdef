import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import pLimit from "p-limit";
import { pickBlanks } from "../src/lib/keywordBlanker";
import type { RawWordEntry, WordDefinition, WordsFile } from "../src/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CACHE_DIR = join(ROOT, ".cache/defs");
const OUT_PATH = join(ROOT, "public/words.json");
const CSV_URL =
  "https://raw.githubusercontent.com/steve-kasica/wordle-words/master/wordle.csv";
const DICT_URL = (w: string) =>
  `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`;

type CsvRow = { word: string; occurrence: number | string | null; day: number | string | null };

type CachedOk = { status: "ok"; data: unknown };
type CachedMissing = { status: "missing" };
type RateLimited = { status: "rate_limited" };
type Cached = CachedOk | CachedMissing;
type FetchResult = Cached | RateLimited;

type DictEntry = {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{ definition?: string }>;
  }>;
};

// The senses you actually want as game clues. Verbs/nouns/adjectives/adverbs
// are what people reach for when explaining a word to a friend.
const PREFERRED_POS = new Set([
  "verb",
  "noun",
  "adjective",
  "adverb",
]);

// Function words and labels that rarely make satisfying definitions for a
// word-guessing game. If a word has a preferred POS entry, we'll use it;
// these are only picked if nothing else is available.
const DEPRIORITIZED_POS = new Set([
  "interjection",
  "exclamation",
  "abbreviation",
  "contraction",
  "article",
  "determiner",
  "preposition",
  "conjunction",
  "particle",
  "pronoun",
  "prefix",
  "suffix",
  "letter",
  "symbol",
]);

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function readCache(word: string): Promise<Cached | null> {
  const p = join(CACHE_DIR, `${word}.json`);
  if (!(await pathExists(p))) return null;
  try {
    const raw = await readFile(p, "utf-8");
    return JSON.parse(raw) as Cached;
  } catch {
    return null;
  }
}

async function writeCache(word: string, value: Cached): Promise<void> {
  const p = join(CACHE_DIR, `${word}.json`);
  await writeFile(p, JSON.stringify(value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchDictionary(word: string): Promise<FetchResult> {
  const url = DICT_URL(word);
  const delays = [0, 1500, 5000, 15000, 45000];
  let lastStatus: number | null = null;
  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      const jitter = Math.floor(Math.random() * 400);
      await sleep(delays[attempt] + jitter);
    }
    try {
      const res = await fetch(url);
      lastStatus = res.status;
      if (res.status === 404) return { status: "missing" };
      if (res.ok) {
        const data = await res.json();
        return { status: "ok", data };
      }
      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        if (retryAfter) {
          const secs = Number(retryAfter);
          if (Number.isFinite(secs) && secs > 0) {
            await sleep(Math.min(60000, secs * 1000));
          }
        }
        continue;
      }
      if (res.status >= 500) continue;
      return { status: "missing" };
    } catch {
      continue;
    }
  }
  if (lastStatus === 429) return { status: "rate_limited" };
  return { status: "missing" };
}

// Prefix markers we want to avoid for a casual word game — slang, obsolete senses,
// vulgar/offensive/dialect variants, etc. Most dictionary entries label these at the
// very start of the definition like "(British slang) ..." or "(obsolete) ...".
const SPICY_PREFIX = new RegExp(
  "^\\(\\s*(?:" +
    [
      "slang",
      "british\\s+slang",
      "us\\s+slang",
      "archaic",
      "obsolete",
      "dated",
      "historical",
      "vulgar",
      "dialect",
      "dialectal",
      "colloquial",
      "informal",
      "rare",
      "offensive",
      "derogatory",
      "pejorative",
      "euphemistic",
      "euphemism",
      "humorous",
      "poetic",
      "taboo",
      "nonstandard",
    ].join("|") +
    ")(?:[^)]*)?\\)",
  "i",
);

type Candidate = {
  text: string;
  posIdx: number;
  senseIdx: number;
  pos: string;
  flagged: boolean;
};

function posRank(pos: string): number {
  if (PREFERRED_POS.has(pos)) return 0;
  if (DEPRIORITIZED_POS.has(pos)) return 2;
  return 1;
}

// Scoring is dominated by *sense ordering* so we reach for the primary
// meaning (which dictionaries list first), with length as a tiebreaker.
// Previously length dominated, which gave us things like `check → "A
// situation in which the king is directly threatened by an opposing piece"`
// because that definition happened to hit the char-count sweet spot while
// the common "to inspect/verify" sense was shorter.
function scoreDef(c: Candidate): number {
  const len = c.text.length;

  if (len < 20 || len > 380) return Number.NEGATIVE_INFINITY;

  let score = 0;

  // Mild preference for a readable length, peaked around 110 chars.
  const centerDist = Math.abs(len - 110);
  score += 30 - Math.min(30, centerDist * 0.12);

  // Part-of-speech bias. Verbs/nouns first.
  const rank = posRank(c.pos);
  if (rank === 0) score += 50;
  else if (rank === 2) score -= 80;

  // Sense ordering: the FIRST sense of the FIRST POS block is almost always
  // the primary meaning. Penalties here dominate the length tiebreaker.
  score -= c.posIdx * 70;
  score -= c.senseIdx * 22;

  if (c.flagged) score -= 40;

  return score;
}

// Up to this many definitions per word, ranked from most-primary (rank 0) to
// most-obscure. The game routes ranks to difficulty tiers: rank 0 → easy, the
// middle → medium, the last → hard. Words with fewer ranks fall back to the
// lowest available rank.
const MAX_DEFS_PER_WORD = 3;

// Soft blocklist for flat-out bad definition content (e.g. see-other-entry
// redirects that sometimes sneak through).
const BAD_DEF_PATTERNS = [
  /^see\s+[a-z]+$/i,
  /^alternative\s+(form|spelling)\s+of/i,
  /^obsolete\s+form\s+of/i,
  /^misspelling\s+of/i,
  /^archaic\s+form\s+of/i,
];

function isBadDef(text: string): boolean {
  return BAD_DEF_PATTERNS.some((re) => re.test(text));
}

// Explicit sexual/anatomical terms that make a definition unfit for a casual
// word game, no matter how the source tagged it. SPICY_PREFIX handles entries
// the dictionary itself labels (slang)/(vulgar)/(taboo), but some senses come
// in as plain text — e.g. "woody" rank 2 = "an erection of the penis". We
// match whole words case-insensitively and drop the sense outright. If every
// sense of a word is NSFW, the whole word falls out of the answer pool.
const NSFW_TERMS = [
  "penis",
  "penises",
  "vagina",
  "vaginas",
  "vaginal",
  "genital",
  "genitals",
  "genitalia",
  "erection",
  "erections",
  "masturbate",
  "masturbation",
  "orgasm",
  "orgasms",
  "ejaculate",
  "ejaculation",
  "semen",
  "intercourse",
  "copulation",
  "copulate",
  "testicle",
  "testicles",
  "testicular",
  "scrotum",
  "scrotal",
  "clitoris",
  "clitoral",
  "vulva",
  "labia",
  "anus",
  "sodomy",
  "sodomize",
  "fornicate",
  "fornication",
  "coitus",
  "coital",
  "pubic",
];
const NSFW_RE = new RegExp(`\\b(?:${NSFW_TERMS.join("|")})\\b`, "i");

function isNsfwDef(text: string): boolean {
  return NSFW_RE.test(text);
}

function pickRankedDefinitions(
  data: unknown,
  target: string,
): WordDefinition[] {
  if (!Array.isArray(data)) return [];
  const targetRe = new RegExp(`\\b${target}\\b`, "i");

  const candidates: Candidate[] = [];

  for (const entry of data as DictEntry[]) {
    let posIdx = 0;
    for (const meaning of entry.meanings ?? []) {
      const pos = (meaning.partOfSpeech ?? "").toLowerCase();
      let senseIdx = 0;
      for (const def of meaning.definitions ?? []) {
        const text = def.definition?.trim();
        if (!text) continue;
        if (targetRe.test(text) || isBadDef(text) || isNsfwDef(text)) {
          senseIdx++;
          continue;
        }
        candidates.push({
          text,
          posIdx,
          senseIdx,
          pos,
          flagged: SPICY_PREFIX.test(text),
        });
        senseIdx++;
      }
      posIdx++;
    }
  }
  if (candidates.length === 0) return [];

  const clean = candidates.filter((c) => !c.flagged);
  const pool = clean.length > 0 ? clean : candidates;

  // Score + sort candidates from most-primary to least.
  type Scored = { cand: Candidate; score: number };
  const scored: Scored[] = pool
    .map((cand) => ({ cand, score: scoreDef(cand) }))
    .filter((s) => s.score !== Number.NEGATIVE_INFINITY)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return [];

  // Greedy pick: take the best scoring definition that also passes the
  // keyword-blanker, then the next-best that is meaningfully different, etc.
  const picked: WordDefinition[] = [];
  for (const { cand } of scored) {
    if (picked.length >= MAX_DEFS_PER_WORD) break;
    const blanks = pickBlanks(cand.text, target);
    if (!blanks.ok) continue;
    // Skip duplicates or near-duplicates of already-picked definitions.
    if (picked.some((p) => p.text === cand.text)) continue;
    picked.push({
      text: cand.text,
      blanks: blanks.blanks,
      primaryRank: picked.length,
    });
  }

  return picked;
}

async function main() {
  console.log("→ downloading wordle.csv");
  const csvRes = await fetch(CSV_URL);
  if (!csvRes.ok) throw new Error(`CSV fetch failed: ${csvRes.status}`);
  const csvText = await csvRes.text();

  console.log("→ parsing");
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    console.warn("parse warnings:", parsed.errors.slice(0, 3));
  }

  const validGuesses: string[] = [];
  const answerCandidates: Array<{ word: string; occurrence: number }> = [];

  for (const row of parsed.data) {
    const w = typeof row.word === "string" ? row.word.trim().toLowerCase() : "";
    if (!w || w.length !== 5) continue;
    validGuesses.push(w);
    const dayVal = row.day;
    const hasDay =
      typeof dayVal === "number" && !Number.isNaN(dayVal) && dayVal !== null;
    if (hasDay) {
      const occ =
        typeof row.occurrence === "number" ? row.occurrence : Number(row.occurrence);
      answerCandidates.push({
        word: w,
        occurrence: Number.isFinite(occ) ? occ : 0,
      });
    }
  }

  console.log(
    `  valid guesses: ${validGuesses.length} | answer candidates: ${answerCandidates.length}`,
  );

  await mkdir(CACHE_DIR, { recursive: true });
  await mkdir(dirname(OUT_PATH), { recursive: true });

  const limit = pLimit(1);
  let done = 0;
  const dropped = { noDef: 0, fewBlanks: 0, rateLimited: 0 };
  const defCountHistogram: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

  console.log("→ fetching definitions (cached per-word)");
  const results: Array<RawWordEntry | null> = await Promise.all(
    answerCandidates.map((c) =>
      limit(async () => {
        let cached: Cached | null = await readCache(c.word);
        if (!cached) {
          const fetched = await fetchDictionary(c.word);
          if (fetched.status === "rate_limited") {
            done++;
            dropped.rateLimited++;
            if (done % 100 === 0) {
              console.log(`  ${done}/${answerCandidates.length} (rate-limited: ${dropped.rateLimited})`);
            }
            return null;
          }
          cached = fetched;
          await writeCache(c.word, cached);
        }
        done++;
        if (done % 100 === 0) {
          console.log(`  ${done}/${answerCandidates.length}`);
        }
        if (cached.status === "missing") {
          dropped.noDef++;
          return null;
        }
        const definitions = pickRankedDefinitions(cached.data, c.word);
        if (definitions.length === 0) {
          dropped.fewBlanks++;
          return null;
        }
        defCountHistogram[definitions.length] =
          (defCountHistogram[definitions.length] ?? 0) + 1;
        return {
          word: c.word,
          occurrence: c.occurrence,
          definitions,
        } satisfies RawWordEntry;
      }),
    ),
  );

  const answerPool: RawWordEntry[] = results.filter(
    (r): r is RawWordEntry => r !== null,
  );

  const uniqueValidGuesses = [...new Set(validGuesses)].sort();

  const file: WordsFile = {
    generatedAt: new Date().toISOString(),
    answerPool,
    validGuesses: uniqueValidGuesses,
  };

  await writeFile(OUT_PATH, JSON.stringify(file));

  console.log("── summary ───────────────────────");
  console.log(`  candidates         : ${answerCandidates.length}`);
  console.log(`  dropped no def     : ${dropped.noDef}`);
  console.log(`  dropped few blanks : ${dropped.fewBlanks}`);
  console.log(`  rate-limited       : ${dropped.rateLimited} (rerun to retry)`);
  console.log(`  final answerPool   : ${answerPool.length}`);
  console.log(`  with 1 def         : ${defCountHistogram[1] ?? 0}`);
  console.log(`  with 2 defs        : ${defCountHistogram[2] ?? 0}`);
  console.log(`  with 3 defs        : ${defCountHistogram[3] ?? 0}`);
  console.log(`  valid guesses      : ${uniqueValidGuesses.length}`);
  console.log(`  output             : ${OUT_PATH}`);

  if (dropped.rateLimited > 0) {
    console.log("  → rerun `npm run build:words` to fetch the remaining words.");
  }
  if (answerPool.length < 1500 && dropped.rateLimited === 0) {
    console.warn(
      "! answerPool < 1500 — consider a secondary definition source (wordsapi).",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
