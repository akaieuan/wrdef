import {
  LEADERBOARD_KEY,
  LEADERBOARD_MAX_ENTRIES,
  LEADERBOARD_TOP_N,
} from "./constants";
import type {
  LeaderboardEntry,
  LeaderboardStore,
  LeaderboardView,
} from "@/types";

function safeWindow(): Window | null {
  if (typeof window === "undefined") return null;
  return window;
}

export function readLeaderboard(): LeaderboardStore {
  const w = safeWindow();
  if (!w) return { version: 1, entries: [] };
  try {
    const raw = w.localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return { version: 1, entries: [] };
    const parsed = JSON.parse(raw) as LeaderboardStore;
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) {
      return { version: 1, entries: [] };
    }
    return parsed;
  } catch {
    return { version: 1, entries: [] };
  }
}

function writeLeaderboard(store: LeaderboardStore) {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded or disabled — silently ignore
  }
}

export function addLeaderboardEntry(entry: LeaderboardEntry): LeaderboardStore {
  const store = readLeaderboard();
  const next: LeaderboardStore = {
    version: 1,
    entries: [...store.entries, entry],
  };
  if (next.entries.length > LEADERBOARD_MAX_ENTRIES) {
    next.entries.sort((a, b) => b.points - a.points);
    next.entries = next.entries.slice(0, LEADERBOARD_MAX_ENTRIES);
  }
  writeLeaderboard(next);
  return next;
}

export function clearLeaderboard() {
  const w = safeWindow();
  if (!w) return;
  w.localStorage.removeItem(LEADERBOARD_KEY);
}

function isPerfectWrdef(e: LeaderboardEntry): boolean {
  return (
    e.bonusCompleted === true &&
    typeof e.blanksTotal === "number" &&
    e.blanksTotal > 0 &&
    typeof e.bonusCorrectCount === "number" &&
    e.bonusCorrectCount === e.blanksTotal &&
    typeof e.totalTimeSeconds === "number"
  );
}

export function sortView(
  entries: LeaderboardEntry[],
  view: LeaderboardView,
): LeaderboardEntry[] {
  let filtered = [...entries];
  switch (view) {
    case "fastest":
      filtered.sort((a, b) => a.timeSeconds - b.timeSeconds);
      break;
    case "points":
      filtered.sort((a, b) => b.points - a.points);
      break;
    case "wrdef":
      filtered = filtered.filter(isPerfectWrdef);
      filtered.sort(
        (a, b) => (a.totalTimeSeconds ?? Infinity) - (b.totalTimeSeconds ?? Infinity),
      );
      break;
  }
  return filtered.slice(0, LEADERBOARD_TOP_N);
}

export function qualifiesForLeaderboard(
  store: LeaderboardStore,
  candidate: Pick<
    LeaderboardEntry,
    | "timeSeconds"
    | "points"
    | "totalTimeSeconds"
    | "bonusCompleted"
    | "bonusCorrectCount"
    | "blanksTotal"
  >,
): boolean {
  const top = (v: LeaderboardView) => sortView(store.entries, v);

  const fastest = top("fastest");
  if (fastest.length < LEADERBOARD_TOP_N) return true;
  if (candidate.timeSeconds < fastest[fastest.length - 1].timeSeconds) return true;

  const points = top("points");
  if (points.length < LEADERBOARD_TOP_N) return true;
  if (candidate.points > points[points.length - 1].points) return true;

  const perfectCandidate =
    candidate.bonusCompleted &&
    typeof candidate.bonusCorrectCount === "number" &&
    typeof candidate.blanksTotal === "number" &&
    candidate.blanksTotal > 0 &&
    candidate.bonusCorrectCount === candidate.blanksTotal &&
    typeof candidate.totalTimeSeconds === "number";

  if (perfectCandidate) {
    const wrdef = top("wrdef");
    if (wrdef.length < LEADERBOARD_TOP_N) return true;
    const worstTotal = wrdef[wrdef.length - 1].totalTimeSeconds;
    if (
      typeof worstTotal === "number" &&
      (candidate.totalTimeSeconds as number) < worstTotal
    )
      return true;
  }

  return false;
}
