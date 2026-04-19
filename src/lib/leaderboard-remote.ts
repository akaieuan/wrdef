import { Redis } from "@upstash/redis";
import { LEADERBOARD_TOP_N } from "./constants";
import type { LeaderboardEntry, LeaderboardView } from "@/types";

const NAMESPACE = "wrdef:lb:v1";
const MAX_STORED = 100;

// Vercel's Upstash integration and Vercel KV use different env-var names.
// Accept either naming convention so "Vercel Marketplace → Upstash Redis"
// and "Vercel KV" both work without code changes.
function credentials(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

export function isRemoteConfigured(): boolean {
  return credentials() !== null;
}

function client(): Redis {
  const creds = credentials();
  if (!creds) throw new Error("remote leaderboard not configured");
  return new Redis({ url: creds.url, token: creds.token });
}

function keyFor(view: LeaderboardView): string {
  return `${NAMESPACE}:${view}`;
}

/**
 * Each leaderboard is a Redis sorted set.
 * - fastest: score = timeSeconds (ascending)
 * - points: score = -points (ascending sort → descending points)
 * - wrdef: score = totalTimeSeconds (ascending), only perfect runs
 * Member is the JSON-stringified entry.
 */
function scoreFor(view: LeaderboardView, entry: LeaderboardEntry): number {
  switch (view) {
    case "fastest":
      return entry.timeSeconds;
    case "points":
      return -entry.points;
    case "wrdef":
      return entry.totalTimeSeconds ?? Number.POSITIVE_INFINITY;
  }
}

function isPerfect(entry: LeaderboardEntry): boolean {
  return (
    entry.bonusCompleted === true &&
    typeof entry.blanksTotal === "number" &&
    entry.blanksTotal > 0 &&
    typeof entry.bonusCorrectCount === "number" &&
    entry.bonusCorrectCount === entry.blanksTotal &&
    typeof entry.totalTimeSeconds === "number"
  );
}

function parseEntry(raw: unknown): LeaderboardEntry | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as LeaderboardEntry;
  } catch {
    return null;
  }
}

export async function addEntry(entry: LeaderboardEntry): Promise<void> {
  if (!isRemoteConfigured()) throw new Error("remote leaderboard not configured");
  const redis = client();
  const json = JSON.stringify(entry);
  const pipeline = redis.pipeline();

  const views: LeaderboardView[] = ["fastest", "points"];
  if (isPerfect(entry)) views.push("wrdef");

  for (const view of views) {
    const key = keyFor(view);
    pipeline.zadd(key, { score: scoreFor(view, entry), member: json });
    // Keep each board capped — keep the top-scoring first MAX_STORED members.
    // For ZSETs sorted ascending by our score convention, top entries are at
    // the start, so we drop the tail from MAX_STORED onward.
    pipeline.zremrangebyrank(key, MAX_STORED, -1);
  }

  await pipeline.exec();
}

export async function topEntries(
  view: LeaderboardView,
  limit = LEADERBOARD_TOP_N,
): Promise<LeaderboardEntry[]> {
  if (!isRemoteConfigured()) return [];
  const redis = client();
  const members = (await redis.zrange(keyFor(view), 0, limit - 1)) as unknown[];
  return members
    .map(parseEntry)
    .filter((e): e is LeaderboardEntry => e !== null);
}

export async function clearAll(): Promise<void> {
  if (!isRemoteConfigured()) throw new Error("remote leaderboard not configured");
  const redis = client();
  const views: LeaderboardView[] = ["fastest", "points", "wrdef"];
  await Promise.all(views.map((v) => redis.del(keyFor(v))));
}
