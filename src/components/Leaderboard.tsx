"use client";

import { useMemo, useState } from "react";
import type { LeaderboardEntry, LeaderboardView } from "@/types";
import { sortView } from "@/lib/storage";
import { useLeaderboard } from "@/hooks/useLeaderboard";

const TABS: Array<{ view: LeaderboardView; label: string; subtitle: string }> = [
  { view: "fastest", label: "Fastest", subtitle: "Solve time" },
  { view: "points", label: "Most Points", subtitle: "Total score" },
  { view: "wrdef", label: "wrdef", subtitle: "Word + full definition · total time" },
];

export function Leaderboard() {
  const { store, clear, mode } = useLeaderboard();
  const [view, setView] = useState<LeaderboardView>("fastest");

  const rows = useMemo(() => sortView(store.entries, view), [store.entries, view]);
  const subtitle = TABS.find((t) => t.view === view)?.subtitle;

  return (
    <div className="w-full max-w-xl">
      <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            mode === "remote"
              ? "bg-[color:var(--accent)]"
              : mode === "local"
                ? "bg-[color:var(--tile-present)]"
                : "bg-[color:var(--border-strong)]"
          }`}
        />
        <span>
          {mode === "remote"
            ? "Global"
            : mode === "local"
              ? "Local · this device"
              : "Connecting…"}
        </span>
      </div>

      <div
        className="mb-6 flex items-center gap-1 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] p-1 text-[13px] font-medium"
      >
        {TABS.map((t) => {
          const active = view === t.view;
          return (
            <button
              key={t.view}
              type="button"
              onClick={() => setView(t.view)}
              className={`flex-1 rounded-full px-3 py-2 transition-all duration-200 ${
                active
                  ? "bg-[color:var(--accent)] text-[color:var(--accent-text)] shadow-[var(--shadow-xs)]"
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
              }`}
            >
              {t.view === "wrdef" ? (
                <span className="font-thin lowercase tracking-[0.04em]">
                  wr<span className={active ? "" : "text-[color:var(--accent)]"}>def</span>
                </span>
              ) : (
                t.label
              )}
            </button>
          );
        })}
      </div>

      <p className="mb-3 text-center text-[11px] uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
        {subtitle}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-[color:var(--border-strong)] px-6 py-10 text-center">
          <p className="text-sm font-medium text-[color:var(--text)]">
            {view === "wrdef" ? "No perfect wrdefs yet." : "No runs yet."}
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            {view === "wrdef"
              ? "Solve the word and fill in every blank."
              : "Play a round to claim a spot."}
          </p>
        </div>
      ) : (
        <ol className="overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)]">
          {rows.map((entry, i) => (
            <Row key={entry.id} entry={entry} rank={i + 1} view={view} />
          ))}
        </ol>
      )}

      {mode === "local" && store.entries.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (confirm("Clear your local leaderboard entries?")) clear();
            }}
            className="text-[11px] text-[color:var(--text-muted)] underline underline-offset-4 transition-colors hover:text-[color:var(--text)]"
          >
            Clear local entries
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  entry,
  rank,
  view,
}: {
  entry: LeaderboardEntry;
  rank: number;
  view: LeaderboardView;
}) {
  const isTop = rank === 1;
  return (
    <li className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`w-5 text-right text-xs font-semibold tabular-nums ${
            isTop
              ? "text-[color:var(--accent)]"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          {rank}
        </span>
        <span
          className="rounded-md bg-[color:var(--accent-soft)] px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--accent)]"
        >
          {entry.initials}
        </span>
        <span className="truncate text-[13px] font-semibold uppercase tracking-[0.06em] text-[color:var(--text)]">
          {entry.word}
        </span>
      </div>
      <span
        className={`shrink-0 text-[13px] font-semibold tabular-nums ${
          isTop ? "text-[color:var(--accent)]" : "text-[color:var(--text)]"
        }`}
      >
        {formatValue(entry, view)}
      </span>
    </li>
  );
}

function formatValue(entry: LeaderboardEntry, view: LeaderboardView): string {
  if (view === "fastest") return `${entry.timeSeconds}s`;
  if (view === "points") return entry.points.toLocaleString();
  // wrdef
  return `${entry.totalTimeSeconds ?? entry.timeSeconds}s`;
}
