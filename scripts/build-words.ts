import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import pLimit from "p-limit";
import { pickBlanks } from "../src/lib/keywordBlanker";
import type { WordEntry, WordsFile } from "../src/types";

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
    definitions?: Array<{ definition?: string }>;
  }>;
};

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

function scoreDef(text: string, idxInList: number): number {
  const len = text.length;
  let score = 0;
  if (len >= 80 && len <= 260) {
    // Sweet spot; peak near 180 chars
    score += 100 - Math.min(80, Math.abs(len - 180)) * 0.4;
  } else if (len >= 40 && len <= 320) {
    score += 40;
  } else if (len >= 20 && len <= 360) {
    score += 10;
  } else {
    return Number.NEGATIVE_INFINITY;
  }
  // Earlier senses are usually the primary ones — light preference
  score -= idxInList * 6;
  return score;
}

function pickDefinition(data: unknown, target: string): string | null {
  if (!Array.isArray(data)) return null;
  const targetRe = new RegExp(`\\b${target}\\b`, "i");

  type Cand = { text: string; idx: number; flagged: boolean };
  const candidates: Cand[] = [];
  let idx = 0;
  for (const entry of data as DictEntry[]) {
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        const text = def.definition?.trim();
        if (!text) continue;
        if (targetRe.test(text)) {
          idx++;
          continue;
        }
        candidates.push({ text, idx, flagged: SPICY_PREFIX.test(text) });
        idx++;
      }
    }
  }
  if (candidates.length === 0) return null;

  const clean = candidates.filter((c) => !c.flagged);
  const pool = clean.length > 0 ? clean : candidates;

  let best: Cand | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const c of pool) {
    const s = scoreDef(c.text, c.idx);
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best && bestScore !== Number.NEGATIVE_INFINITY ? best.text : null;
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
  let dropped = { noDef: 0, fewBlanks: 0, rateLimited: 0 };

  console.log("→ fetching definitions (cached per-word)");
  const results: Array<WordEntry | null> = await Promise.all(
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
        const defText = pickDefinition(cached.data, c.word);
        if (!defText) {
          dropped.noDef++;
          return null;
        }
        const blanks = pickBlanks(defText, c.word);
        if (!blanks.ok) {
          dropped.fewBlanks++;
          return null;
        }
        return {
          word: c.word,
          occurrence: c.occurrence,
          definition: { text: defText, blanks: blanks.blanks },
        } satisfies WordEntry;
      }),
    ),
  );

  const answerPool: WordEntry[] = results.filter(
    (r): r is WordEntry => r !== null,
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
