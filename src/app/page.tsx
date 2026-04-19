import Link from "next/link";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WordRain } from "@/components/WordRain";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <Link
        href="/"
        className="fixed left-5 top-5 z-10 text-[26px] font-light tracking-[0.02em] text-[color:var(--text)]"
      >
        wr<span className="text-[color:var(--accent)]">def</span>
      </Link>

      <div className="fixed right-5 top-5 z-10 flex items-center gap-3">
        <Link
          href="/urdefs"
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
        >
          urdefs
        </Link>
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <div className="min-h-[1em] text-6xl leading-[1] sm:text-7xl">
          <WordRain />
        </div>

        <p className="mt-6 max-w-[22rem] text-[13px] leading-relaxed text-[color:var(--text-muted)]">
          A definition. Five letters.
          <br />
          Guess the word — <span className="text-[color:var(--text)]">fill the blanks</span> for bonus.
          <br />
          wordle, but with definitions
        </p>

        <div className="mt-10 flex flex-col items-center gap-5">
          <DifficultyPicker />

          <Link
            href="/play"
            className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-[color:var(--accent)] px-8 text-[13px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-text)] shadow-[var(--shadow-sm)] transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]"
          >
            <PlayIcon />
            <span>Play</span>
          </Link>
        </div>
      </div>

      <footer className="absolute bottom-6 z-10 flex flex-col items-center gap-1 text-[11px] text-[color:var(--text-muted)]">
        <span>word · definition</span>
        <a
          href="https://aka4uh.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[color:var(--text-muted)] transition-colors duration-150 hover:text-[color:var(--accent)]"
        >
          built by
          <span className="font-medium text-[color:var(--text)] transition-colors group-hover:text-[color:var(--accent)]">
            aka ieuan
          </span>
        </a>
      </footer>
    </main>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 10 10"
      fill="currentColor"
      width="10"
      height="10"
      aria-hidden
      className="shrink-0"
    >
      <path d="M2.5 1.2 L8.5 5 L2.5 8.8 Z" />
    </svg>
  );
}

