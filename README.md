# wrdef

A word game where the definition comes first.

Wordle hands you a grid. **wrdef** hands you a dictionary clue with a few words blanked out, and asks you to guess the five-letter word that fits. Solve it, then fill the blanks for bonus points. Every round you win is saved to your device — so you walk away knowing what the word actually *means*.

Built with Next.js 15, React 19, TypeScript, Tailwind v4, and framer-motion.

## Why

Wordle is great at letters, silent on meaning. I kept winning and then googling the word to figure out what it was — the spelling stuck, the definition slipped. wrdef keeps both.

Three consequences in the loop:

1. **Definition-first** — every round opens with a short clue, key words masked as blanks. You're decoding meaning → spelling, not guessing in the dark.
2. **Bonus round** — solve cleanly and a 90s timed round asks you to fill the definition's blanks for extra points. You're actively encoding the definition, not just reading it.
3. **Lifeline** — run out of guesses and the game *doesn't reveal the answer yet*. Instead it asks: can you fill any one blank in the definition? If yes, you earn one more guess at the word. If no (or skip), then the answer is shown.

## urdefs — your local definition tracker

Every finished round saves to your device under `wrdef:history:v1`. Visit [`/urdefs`](/urdefs) to see:

- Stats across all plays (plays, wins, win rate, current/best streak, best time, total score).
- Every word you've won, with the **fully revealed definition** below it, plus difficulty, outcome flags (lifeline used, bonus filled/skipped), and score.

No sign-in, no account, no server. Clear your browser data and it's gone — that's the tradeoff for no-friction tracking. Cloud sync is a future opt-in; the local schema will keep working.

## Difficulty modes

Each word is classified from definition length, blank count, and how common it is in the corpus:

- **Easy** — common words, short clue.
- **Medium** — trickier words, longer clue.
- **Hard** — rare words, dense clue with more blanks.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

The answer pool is pre-baked in `public/words.json` (~2,200 five-letter words with curated definitions). To regenerate it from source:

```bash
npm run build:words
```

This downloads the [steve-kasica/wordle-words](https://github.com/steve-kasica/wordle-words) CSV, fetches definitions from the [Free Dictionary API](https://dictionaryapi.dev) (cached per-word under `.cache/defs/`), picks 2–4 content words to blank, and writes the combined file. First full run is slow (~20 min) because the API rate-limits hard — the cache makes re-runs cheap.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit suite |
| `npm run build:words` | Regenerate `public/words.json` |

## Game flow

1. **Home** (`/`) — animated text hero showing scripted guess sequences with real green/orange/grey feedback, difficulty picker, Play button, link to `/urdefs`.
2. **Play** (`/play`) — the masked definition sits above a 6×5 grid. Physical and on-screen keyboards both work. Invalid guesses toast + shake. Hints reveal one blank but cost 50 points and forfeit the bonus round.
3. **Lifeline offer** — on loss, a modal appears with the definition still masked and two choices: *Use lifeline* or *Show answer*.
4. **Lifeline active** — the definition becomes an input form. Fill any blank correctly to earn one extra guess row. Fail or skip → reveal.
5. **Bonus round** — solve cleanly, 90s countdown, fill every blank.
6. **Results** — score breakdown (solve + time bonus + bonus keywords − hints) and *Play again*.
7. **urdefs** (`/urdefs`) — stats grid + list of every win with its full definition.

## Scoring

Small, legible numbers:

- **Solve** — 500 / 400 / 300 / 200 / 100 / 50 by guess count.
- **Time bonus** — 1 pt per second under 60 (cap 60).
- **Bonus keywords** — 100 per correctly-filled blank.
- **Hint penalty** — −50 per hint.

Lifeline wins count as wins in your stats but come with a smaller solve score (they take an extra row).

## Architecture

```
src/
├── app/
│   ├── layout.tsx            Fonts, pre-hydration theme init
│   ├── globals.css           Tailwind + CSS variables (light/dark)
│   ├── page.tsx              Home
│   ├── play/page.tsx         Play screen (client)
│   └── urdefs/page.tsx       Stats + saved definitions list
├── components/
│   ├── Grid.tsx, Tile.tsx    6×5 grid with flip animation
│   ├── Keyboard.tsx          On-screen keyboard + key state
│   ├── Definition.tsx        Renders a definition w/ blanks in any of:
│   │                         masked · typing · revealed · input
│   ├── DefinitionPanel.tsx   The masked definition above the grid
│   ├── BonusRound.tsx        Timed fill-the-blanks after a win
│   ├── LifelineOffer.tsx     Modal: Use lifeline / Show answer
│   ├── LifelineRound.tsx     Input form for the comeback round
│   ├── ResultsPanel.tsx      Score breakdown + Play again
│   ├── DifficultyPicker.tsx  Segmented picker w/ live description
│   ├── WordRain.tsx          Home hero animation (scripted guess sequences)
│   ├── Toast.tsx             Auto-dismissing status toast
│   └── ThemeToggle.tsx       Light/dark switch
├── hooks/
│   ├── useGame.ts            useReducer game state machine
│   ├── useHistory.ts         Reactive wrapper over local history
│   ├── useDifficulty.ts      Persisted difficulty preference
│   ├── useKeyboard.ts        Physical keyboard bridge
│   └── useTimer.ts           Elapsed + countdown seconds
├── lib/
│   ├── scoring.ts            Pure score functions
│   ├── guessEvaluator.ts     Tile evaluation + key-state aggregation
│   ├── keywordBlanker.ts     Picks which tokens to blank (pure, tested)
│   ├── difficulty.ts         Classification + pool filter
│   ├── history.ts            localStorage CRUD for HistoryRecord
│   ├── stats.ts              Derived stats from history
│   ├── wordData.ts           Loads words.json; random answer picker
│   └── constants.ts          Scoring weights, timer caps
├── data/stopwords.ts         Stopword set for keyword filtering
└── types/index.ts            Shared types (Phase, TileState, WordEntry, Blank)
scripts/
└── build-words.ts            Data pipeline (CSV → dictionary API → words.json)
tests/
├── scoring.test.ts
├── guessEvaluator.test.ts
└── keywordBlanker.test.ts
```

## Design notes

- **Palette** — neutral off-white / near-black surfaces, moss-green accent, muted tile colors (sage `#5EAA7B`, amber `#D4A84B`, graphite `#5A5A5F`). Tokens keyed off `data-theme`, exposed to Tailwind via `@theme inline`.
- **Typography** — Inter via `next/font`. Lowercase thin "wrdef" logo + matching hero animation style.
- **Motion** — framer-motion for tile flips, row shakes, phase transitions, and the home animation. Respects `prefers-reduced-motion`.
- **Timer** — starts on the first keystroke, not on page load.
- **State machine** — all game transitions live in a single `useReducer` (`useGame.ts`) with an explicit `Phase` type: `loading` → `playing` → (`bonus` | `lifeline_offer` → `lifeline` → `playing` | `lost`) → `results`.

## Data pipeline

`scripts/build-words.ts`:

1. Downloads the wordle-words CSV.
2. Splits rows into `validGuesses` (~12,971) and `answerCandidates` (~2,314 with non-null `day`).
3. Calls the Free Dictionary API per candidate with retry + exponential backoff. Caches per-word JSON.
4. Picks the first definition in the 30–180 char sweet spot; prefers ones that don't leak the target word.
5. Runs `keywordBlanker` to pick 2–4 content words (length > 3, non-stopword, doesn't contain the target) as blanks.
6. Drops words that don't yield enough blanks.
7. Writes `public/words.json` (~2,214 final entries).

## Known limitations

- Free Dictionary API has gaps and occasionally oddly-phrased definitions.
- History is device-local and not portable. By design, for now.
- Adding a new word corpus requires rerunning the pipeline and refreshing the cache.
