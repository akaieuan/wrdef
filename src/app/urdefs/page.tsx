"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Definition } from "@/components/Definition";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useHistory } from "@/hooks/useHistory";
import type { HistoryRecord } from "@/lib/history";
import { computeStats, formatDuration, formatPct } from "@/lib/stats";

function isWin(r: HistoryRecord): boolean {
  return r.outcome === "solved" || r.outcome === "solved_with_lifeline";
}

const DIFFICULTY_ACCENT: Record<HistoryRecord["difficulty"], string> = {
  easy: "var(--tile-correct)",
  medium: "var(--tile-present)",
  hard: "#8E3B7A",
};

export default function UrDefsPage() {
  const { records, hydrated } = useHistory();

  const wins = useMemo(
    () =>
      [...records]
        .filter(isWin)
        .sort((a, b) => b.solvedAt - a.solvedAt),
    [records],
  );

  const stats = useMemo(() => computeStats(records), [records]);

  return (
    <main className="relative flex min-h-[100dvh] flex-col px-5 pb-16 pt-5">
      <header className="mx-auto flex w-full max-w-xl items-center justify-between">
        <Link
          href="/"
          className="text-[26px] font-light tracking-[0.02em] text-[color:var(--text)]"
        >
          wr<span className="text-[color:var(--accent)]">def</span>
        </Link>
        <ThemeToggle />
      </header>

      <div className="mx-auto mt-10 w-full max-w-xl">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
          Your definitions
        </p>
        <h1 className="mt-1 text-[28px] font-light tracking-[-0.01em] text-[color:var(--text)]">
          urdefs
        </h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[color:var(--text-muted)]">
          Every word you&apos;ve unlocked lives here — on this device, no sign-in.
        </p>
      </div>

      <section className="mx-auto mt-8 grid w-full max-w-xl grid-cols-3 gap-2 sm:grid-cols-6">
        <StatCell label="Plays" value={stats.gamesPlayed.toString()} />
        <StatCell label="Wins" value={stats.wins.toString()} />
        <StatCell
          label="Win rate"
          value={stats.gamesPlayed ? formatPct(stats.winRate) : "—"}
        />
        <StatCell
          label="Streak"
          value={stats.currentStreak.toString()}
          sub={stats.bestStreak ? `best ${stats.bestStreak}` : undefined}
        />
        <StatCell
          label="Best time"
          value={stats.bestSeconds != null ? formatDuration(stats.bestSeconds) : "—"}
        />
        <StatCell
          label="Score"
          value={stats.totalScore.toLocaleString()}
          sub={stats.bestScore ? `best ${stats.bestScore}` : undefined}
        />
      </section>

      <section className="mx-auto mt-10 w-full max-w-xl">
        {!hydrated ? (
          <ListSkeleton />
        ) : wins.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-2">
            {wins.map((r) => (
              <li key={r.id}>
                <WinRow record={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-start rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
      <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        {label}
      </span>
      <span className="mt-1 text-[18px] font-semibold tabular-nums text-[color:var(--text)]">
        {value}
      </span>
      {sub && (
        <span className="mt-0.5 text-[10px] text-[color:var(--text-muted)]">
          {sub}
        </span>
      )}
    </div>
  );
}

function WinRow({ record }: { record: HistoryRecord }) {
  const seconds = Math.round(record.elapsedMs / 1000);
  const diffColor = DIFFICULTY_ACCENT[record.difficulty];
  return (
    <article className="rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[18px] font-semibold uppercase tracking-[0.04em] text-[color:var(--text)]">
            {record.word}
          </h2>
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-white"
            style={{ background: diffColor }}
          >
            {record.difficulty}
          </span>
          {record.outcome === "solved_with_lifeline" && (
            <span className="rounded-full border border-[color:var(--tile-present)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--tile-present)]">
              Lifeline
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] tabular-nums text-[color:var(--text-muted)]">
          <span>{formatDuration(seconds)}</span>
          <span>{record.score.toLocaleString()} pts</span>
        </div>
      </div>

      <div className="mt-2">
        <Definition
          text={record.definition.text}
          blanks={record.definition.blanks}
          mode={{ kind: "revealed" }}
          className="text-left text-[13px] leading-[1.65] text-[color:var(--text-muted)]"
        />
      </div>

      <div className="mt-3 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
        <span>{formatDate(record.solvedAt)}</span>
        <span>·</span>
        <span>{record.guessCount}/6</span>
        {record.hintsUsed > 0 && (
          <>
            <span>·</span>
            <span>{record.hintsUsed} hint{record.hintsUsed === 1 ? "" : "s"}</span>
          </>
        )}
        <span>·</span>
        <span
          style={{
            color: record.bonusCompleted
              ? "var(--accent)"
              : "var(--text-muted)",
          }}
        >
          {record.bonusCompleted ? "Bonus filled" : "Bonus skipped"}
        </span>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[14px] border border-dashed border-[color:var(--border-strong)] bg-transparent p-8 text-center">
      <p className="text-[13px] text-[color:var(--text-muted)]">
        No wins yet. Play a round and your definitions will land here.
      </p>
      <Link
        href="/play"
        className="mt-4 inline-flex h-9 items-center rounded-full bg-[color:var(--accent)] px-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-text)]"
      >
        Start
      </Link>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-24 animate-pulse rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)]"
        />
      ))}
    </ul>
  );
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
