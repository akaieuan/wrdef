import Link from "next/link";
import { Leaderboard } from "@/components/Leaderboard";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LeaderboardPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col">
      <header className="flex items-center justify-between px-5 py-4">
        <Link
          href="/"
          className="text-sm font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
        >
          ← Home
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/play"
            className="text-sm font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
          >
            Play
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center px-6 pb-10 pt-4">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Your best runs
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[color:var(--text)]">
            Leaderboard
          </h1>
        </div>
        <Leaderboard />
      </section>
    </main>
  );
}
