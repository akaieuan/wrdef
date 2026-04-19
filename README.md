# wrdef

A Wordle-style word game with a twist: above the guess grid, the dictionary **definition** of the target word is shown with a few keywords blanked out. Solve the word, then fill in the definition's blanks for bonus points. Track your best runs on a local leaderboard (fastest · most points · hardest).

Built with Next.js 16, React 19, TypeScript, Tailwind v4, and Framer Motion.

## Quick start

```bash
npm install
npm run dev       # http://localhost:3000
```

The answer pool is pre-baked in `public/words.json` (~2,200 five-letter words with curated definitions). If that file is missing or you want to refresh it:

```bash
npm run build:words
```

This downloads the [steve-kasica/wordle-words](https://github.com/steve-kasica/wordle-words) CSV, fetches definitions from the [Free Dictionary API](https://dictionaryapi.dev), picks keywords to blank out, and writes the combined data file. Cached per-word under `.cache/defs/` so re-runs are fast. The full first run takes ~20 minutes at the polite concurrency of 1 request at a time — the API rate-limits hard; re-run if any `rate-limited` > 0 appears in the summary.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server. |
| `npm run build` | Production build. |
| `npm start` | Run the production build. |
| `npm run lint` | ESLint. |
| `npm test` | Run the unit test suite (vitest). |
| `npm run test:watch` | Tests in watch mode. |
| `npm run build:words` | (Re)generate `public/words.json` from source. |

## Game flow

1. **Home** (`/`) — Title, Play / Leaderboard buttons, theme toggle, subtle typing animation in the top-left (mistypes then self-corrects in moss green, hinting at the mechanic).
2. **Play** (`/play`) — Definition with blanks above the 6×5 guess grid and keyboard. Invalid guesses trigger a toast ("Not enough letters" / "Not in word list") and a shake. Solve in ≤6 guesses to auto-enter the bonus round.
3. **Bonus round** — Grid is replaced by the definition with inline inputs for the blanks. 90-second countdown, on-screen keyboard stays connected and types into the focused blank. Submit or Skip.
4. **Results** — Point breakdown: solve (500/400/300/200/100/50) + time bonus (1 pt per second under 60s, cap 60) + bonus keywords (100 each). If the run qualifies for any leaderboard top-10, you're prompted for initials.
5. **Leaderboard** (`/leaderboard`) — Three tabs:
   - **Fastest** — best solve times.
   - **Most Points** — highest total scores.
   - **wrdef** — runs where you solved the word *and* filled every definition blank, sorted by combined solve + bonus time.

   Backed by `localStorage` under `wrdle:leaderboard:v1`.

## Architecture

```
src/
├── app/
│   ├── layout.tsx            Fonts, pre-hydration theme init, metadata
│   ├── globals.css           Tailwind + CSS variables (light/dark tokens)
│   ├── page.tsx              Home
│   ├── play/page.tsx         Play screen (client)
│   └── leaderboard/page.tsx  Leaderboard screen
├── components/
│   ├── Grid.tsx, Tile.tsx    6×5 grid + tile with flip animation
│   ├── Keyboard.tsx          On-screen keyboard + key state
│   ├── Definition.tsx        Renders a definition with blanks (mask/input/reveal modes)
│   ├── DefinitionPanel.tsx   The masked definition above the grid
│   ├── BonusRound.tsx        Centered definition with input blanks + timer + skip
│   ├── ResultsPanel.tsx      Score breakdown + leaderboard entry
│   ├── Leaderboard.tsx       3-tab leaderboard view
│   ├── InitialsInput.tsx     3-char arcade-style initials
│   ├── Toast.tsx             Auto-dismissing status toast
│   ├── ThemeToggle.tsx       Light/dark switch
│   └── WordRain.tsx          Background typing animation (typo → fix)
├── hooks/
│   ├── useGame.ts            useReducer game state
│   ├── useKeyboard.ts        Physical keyboard bridge
│   ├── useTimer.ts           Elapsed + countdown seconds
│   ├── useLeaderboard.ts     localStorage-backed leaderboard
│   └── useTheme.ts           Theme state + toggle
├── lib/
│   ├── scoring.ts            Pure score functions
│   ├── guessEvaluator.ts     Tile evaluation + key-state aggregation
│   ├── keywordBlanker.ts     Picks which definition tokens to blank (pure, tested)
│   ├── wordData.ts           Loads words.json; random answer picker
│   ├── storage.ts            SSR-safe localStorage wrapper + leaderboard sort/prune
│   └── constants.ts          Scoring weights, timer caps, storage key
├── data/stopwords.ts         Stopword set for keyword filtering
└── types/index.ts            Shared types
scripts/
└── build-words.ts            Data pipeline (CSV → dictionary API → words.json)
tests/
├── scoring.test.ts
├── guessEvaluator.test.ts    (covers the double-letter edge case)
└── keywordBlanker.test.ts
```

## Design notes

- **Palette.** Neutral off-white / near-black surfaces, moss-green accent, muted tile colors (sage `#5EAA7B` · amber `#D4A84B` · graphite `#5A5A5F`). Colors live as CSS variables keyed off `data-theme` and exposed to Tailwind via `@theme inline`.
- **Typography.** Inter via `next/font`. The `wrdef` title is `font-thin` lowercase with slight tracking — the background animation uses the same style.
- **Motion.** `framer-motion` for tile flips, invalid-row shake, and phase transitions. Respects `prefers-reduced-motion`.
- **Scoring.** Small round numbers so a round's breakdown reads intuitively:
  - Solve: 500 / 400 / 300 / 200 / 100 / 50
  - Time bonus: `max(0, 60 − seconds)`
  - Bonus keywords: 100 each
  - Max possible: 960 (solve in 1 + instant + 4/4 bonus)
- **Timer.** Starts on the first keystroke, not on page load — tab-switching before you're ready doesn't cost you.
- **Leaderboard.** Local only. Max 100 entries; prunes lowest-scoring on overflow. Prompts for initials only when a run qualifies for a top-10 board — no nagging on every round.

## Data pipeline

`scripts/build-words.ts`:

1. Downloads the wordle-words CSV.
2. Splits rows into `validGuesses` (~12,971) and `answerCandidates` (~2,314 with non-null `day`).
3. For each answer candidate, calls the Free Dictionary API with retry + exponential backoff. Caches per-word JSON under `.cache/defs/`.
4. Picks the first definition in the 30–180 char sweet spot; prefers ones that don't leak the target word.
5. Runs `keywordBlanker` to pick 2–4 content words (length > 3, non-stopword, doesn't contain the target) as blanks.
6. Drops words that don't yield enough blanks.
7. Writes `public/words.json`.

Final output has ~2,214 entries (≈96% of candidates, losing the rest to missing definitions or unblankable text).

## Known limitations

- The dictionary source is the Free Dictionary API, which has occasional gaps and sometimes oddly-phrased definitions.
- No cross-device leaderboard sync. By design.
- Entries saved before the `wrdef` tab existed won't appear in that view — they're missing the bonus-correct-count / total-time fields. They still show in Fastest and Most Points.
