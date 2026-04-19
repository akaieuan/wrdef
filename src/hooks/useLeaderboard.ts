"use client";

import { useCallback, useEffect, useState } from "react";
import type { LeaderboardEntry, LeaderboardStore, LeaderboardView } from "@/types";
import {
  addLeaderboardEntry,
  readLeaderboard,
  clearLeaderboard as clearStorage,
  qualifiesForLeaderboard,
} from "@/lib/storage";

type Mode = "loading" | "remote" | "local";

type RemotePayload = {
  configured: boolean;
  views?: Partial<Record<LeaderboardView, LeaderboardEntry[]>>;
};

function mergeRemoteViews(
  views: Partial<Record<LeaderboardView, LeaderboardEntry[]>>,
): LeaderboardEntry[] {
  const out: LeaderboardEntry[] = [];
  const seen = new Set<string>();
  const keys: LeaderboardView[] = ["fastest", "points", "wrdef"];
  for (const v of keys) {
    const arr = views[v] ?? [];
    for (const e of arr) {
      if (e && typeof e.id === "string" && !seen.has(e.id)) {
        seen.add(e.id);
        out.push(e);
      }
    }
  }
  return out;
}

export function useLeaderboard() {
  const [store, setStore] = useState<LeaderboardStore>({ version: 1, entries: [] });
  const [mode, setMode] = useState<Mode>("loading");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as RemotePayload;
        if (data.configured && data.views) {
          setStore({ version: 1, entries: mergeRemoteViews(data.views) });
          setMode("remote");
          return;
        }
      }
    } catch {
      // ignore, fall back
    }
    setStore(readLeaderboard());
    setMode("local");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (entry: LeaderboardEntry) => {
      // Optimistic local cache — shows the entry immediately even offline.
      addLeaderboardEntry(entry);

      if (mode === "remote") {
        try {
          await fetch("/api/leaderboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry),
          });
        } catch {
          // swallow — local cache already has the entry
        }
        await refresh();
      } else {
        setStore(readLeaderboard());
      }
    },
    [mode, refresh],
  );

  const clear = useCallback(() => {
    clearStorage();
    setStore({ version: 1, entries: [] });
  }, []);

  const qualifies = useCallback(
    (
      c: Pick<
        LeaderboardEntry,
        | "timeSeconds"
        | "points"
        | "totalTimeSeconds"
        | "bonusCompleted"
        | "bonusCorrectCount"
        | "blanksTotal"
      >,
    ) => qualifiesForLeaderboard(store, c),
    [store],
  );

  return { store, mode, add, clear, qualifies, refresh };
}
