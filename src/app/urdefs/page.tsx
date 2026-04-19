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
        <h1 className="text-[28px] font-light tracking-[-0.01em] text-[color:var(--text)]">
          urdefs
        </h1>
        <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[color:var(--text-muted)]">
          Every word you&apos;ve unlocked lives here. On this device, no sign-in.
        </p>
      </div>

      <section className="mx-auto mt-8 w-full max-w-xl">
        <StatsCard stats={stats} />
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

function StatsCard({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const hasPlays = stats.gamesPlayed > 0;
  const winsCount = stats.wins;
  const padded = [
    ...stats.recentOutcomes,
    ...Array(Math.max(0, 12 - stats.recentOutcomes.length)).fill(null),
  ].slice(0, 12) as (boolean | null)[];

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-[64px] font-light leading-none tabular-nums text-[color:var(--text)] sm:text-[72px]">
          {winsCount}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
          definitions
          <br />
          unlocked
        </span>
      </div>

      <div className="mt-5 flex items-center gap-[5px]" aria-label="Recent plays">
        {padded.map((o, i) => (
          <span
            key={i}
            className="inline-block h-2.5 flex-1 rounded-full"
            style={{
              background:
                o === true
                  ? "var(--tile-correct)"
                  : o === false
                    ? "var(--tile-absent)"
                    : "var(--border)",
              opacity: o === null ? 0.45 : 1,
            }}
            aria-label={
              o === null ? "no play" : o ? "win" : "loss"
            }
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        last 12 · most recent right
      </p>

      <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-left">
        <Line
          big={hasPlays ? formatPct(stats.winRate) : "—"}
          label="win rate"
          small={hasPlays ? `${stats.wins} / ${stats.gamesPlayed} played` : ""}
        />
        <Line
          big={stats.currentStreak.toString()}
          label="current streak"
          small={stats.bestStreak ? `best ${stats.bestStreak}` : ""}
        />
        <Line
          big={
            stats.bestSeconds != null ? formatDuration(stats.bestSeconds) : "—"
          }
          label="fastest solve"
          small={
            stats.avgSeconds != null ? `avg ${formatDuration(stats.avgSeconds)}` : ""
          }
        />
        <Line
          big={stats.totalScore.toLocaleString()}
          label="total score"
          small={stats.bestScore ? `best ${stats.bestScore}` : ""}
        />
        <Line
          big={
            stats.sentenceAccuracy != null
              ? formatPct(stats.sentenceAccuracy)
              : "—"
          }
          label="sentence accuracy"
          small={
            stats.sentencesAttempted > 0
              ? `${stats.sentencesCorrect} / ${stats.sentencesAttempted} picked`
              : ""
          }
        />
      </div>

      {hasPlays && (
        <div className="mt-6 border-t border-[color:var(--border)] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
            By mode
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
            <DiffBadge
              label="Easy"
              wins={stats.byDifficulty.easy.wins}
              plays={stats.byDifficulty.easy.plays}
              color="var(--tile-correct)"
            />
            <DiffBadge
              label="Medium"
              wins={stats.byDifficulty.medium.wins}
              plays={stats.byDifficulty.medium.plays}
              color="var(--tile-present)"
            />
            <DiffBadge
              label="Hard"
              wins={stats.byDifficulty.hard.wins}
              plays={stats.byDifficulty.hard.plays}
              color="#8E3B7A"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Line({
  big,
  label,
  small,
}: {
  big: string;
  label: string;
  small?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[22px] font-semibold leading-none tabular-nums text-[color:var(--text)]">
        {big}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        {label}
      </span>
      {small && (
        <span className="mt-0.5 text-[11px] text-[color:var(--text-muted)]">
          {small}
        </span>
      )}
    </div>
  );
}

function DiffBadge({
  label,
  wins,
  plays,
  color,
}: {
  label: string;
  wins: number;
  plays: number;
  color: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-[color:var(--text)]">{label}</span>
      <span className="tabular-nums text-[color:var(--text-muted)]">
        {wins}
        <span className="text-[color:var(--text-muted)]">/{plays}</span>
      </span>
    </span>
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

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
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
        {record.sentenceOffered && (
          <>
            <span>·</span>
            <span
              style={{
                color: !record.sentenceAnswered
                  ? "var(--text-muted)"
                  : record.sentenceCorrect
                    ? "var(--tile-correct)"
                    : "var(--tile-absent)",
              }}
            >
              {!record.sentenceAnswered
                ? "Sentence skipped"
                : record.sentenceCorrect
                  ? "Sentence ✓"
                  : "Sentence ✗"}
            </span>
          </>
        )}
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
