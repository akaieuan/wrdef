import type { HistoryRecord } from "./history";

export type Stats = {
  gamesPlayed: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  avgSeconds: number | null;
  bestSeconds: number | null;
  totalScore: number;
  bestScore: number;
  bonusCompletionRate: number;
};

function isWin(r: HistoryRecord): boolean {
  return r.outcome === "solved" || r.outcome === "solved_with_lifeline";
}

export function computeStats(records: HistoryRecord[]): Stats {
  const gamesPlayed = records.length;
  if (gamesPlayed === 0) {
    return {
      gamesPlayed: 0,
      wins: 0,
      winRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      avgSeconds: null,
      bestSeconds: null,
      totalScore: 0,
      bestScore: 0,
      bonusCompletionRate: 0,
    };
  }

  const chronological = [...records].sort((a, b) => a.solvedAt - b.solvedAt);
  const winRecords = chronological.filter(isWin);

  const wins = winRecords.length;
  const winRate = wins / gamesPlayed;

  let current = 0;
  for (let i = chronological.length - 1; i >= 0; i--) {
    if (isWin(chronological[i])) current++;
    else break;
  }

  let best = 0;
  let run = 0;
  for (const r of chronological) {
    if (isWin(r)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  const winSeconds = winRecords.map((r) => Math.round(r.elapsedMs / 1000));
  const avgSeconds =
    winSeconds.length > 0
      ? Math.round(winSeconds.reduce((a, b) => a + b, 0) / winSeconds.length)
      : null;
  const bestSeconds = winSeconds.length > 0 ? Math.min(...winSeconds) : null;

  const totalScore = winRecords.reduce((sum, r) => sum + r.score, 0);
  const bestScore = winRecords.reduce((m, r) => (r.score > m ? r.score : m), 0);

  const bonusEligible = winRecords.length;
  const bonusDone = winRecords.filter((r) => r.bonusCompleted).length;
  const bonusCompletionRate = bonusEligible > 0 ? bonusDone / bonusEligible : 0;

  return {
    gamesPlayed,
    wins,
    winRate,
    currentStreak: current,
    bestStreak: best,
    avgSeconds,
    bestSeconds,
    totalScore,
    bestScore,
    bonusCompletionRate,
  };
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}
