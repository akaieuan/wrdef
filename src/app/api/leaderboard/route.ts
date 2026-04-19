import { NextResponse } from "next/server";
import {
  addEntry,
  clearAll,
  isRemoteConfigured,
  topEntries,
} from "@/lib/leaderboard-remote";
import type { LeaderboardEntry, LeaderboardView } from "@/types";

export const runtime = "edge";

function isView(x: unknown): x is LeaderboardView {
  return x === "fastest" || x === "points" || x === "wrdef";
}

function sanitizeEntry(raw: unknown): LeaderboardEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Partial<LeaderboardEntry>;

  const str = (v: unknown) => typeof v === "string";
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const bool = (v: unknown) => typeof v === "boolean";

  if (!str(e.initials) || !str(e.word) || !str(e.createdAt)) return null;
  if (!num(e.occurrence) || !num(e.timeSeconds) || !num(e.points)) return null;
  if (!num(e.guessCount) || !bool(e.bonusCompleted)) return null;

  return {
    id: typeof e.id === "string" ? e.id : crypto.randomUUID(),
    initials: (e.initials as string).toUpperCase().slice(0, 4),
    word: (e.word as string).toLowerCase(),
    occurrence: e.occurrence as number,
    timeSeconds: e.timeSeconds as number,
    totalTimeSeconds:
      typeof e.totalTimeSeconds === "number" ? e.totalTimeSeconds : undefined,
    points: e.points as number,
    guessCount: e.guessCount as number,
    bonusCompleted: e.bonusCompleted as boolean,
    bonusCorrectCount:
      typeof e.bonusCorrectCount === "number" ? e.bonusCorrectCount : undefined,
    blanksTotal: typeof e.blanksTotal === "number" ? e.blanksTotal : undefined,
    createdAt: e.createdAt as string,
  };
}

export async function GET(req: Request) {
  if (!isRemoteConfigured()) {
    return NextResponse.json({ configured: false, entries: [] });
  }

  const url = new URL(req.url);
  const viewParam = url.searchParams.get("view");
  const views: LeaderboardView[] = isView(viewParam)
    ? [viewParam]
    : ["fastest", "points", "wrdef"];

  const out: Partial<Record<LeaderboardView, LeaderboardEntry[]>> = {};
  for (const v of views) out[v] = await topEntries(v);

  return NextResponse.json({ configured: true, views: out });
}

export async function POST(req: Request) {
  if (!isRemoteConfigured()) {
    return NextResponse.json(
      { configured: false, error: "leaderboard not configured" },
      { status: 503 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const entry = sanitizeEntry(raw);
  if (!entry) return NextResponse.json({ error: "invalid entry" }, { status: 400 });

  try {
    await addEntry(entry);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "store error" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!isRemoteConfigured()) {
    return NextResponse.json(
      { configured: false, error: "leaderboard not configured" },
      { status: 503 },
    );
  }
  const token = process.env.LEADERBOARD_ADMIN_TOKEN;
  const provided = req.headers.get("x-admin-token");
  if (!token || !provided || provided !== token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await clearAll();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "clear error" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
