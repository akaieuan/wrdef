# wrdef

A word game where the definition comes first.

Wordle hands you a grid. **wrdef** hands you a dictionary clue with a few words blanked out, and asks you to guess the five-letter word that fits. Solve it, then fill the blanks for bonus points. Every round you win is saved to your device — so you walk away knowing what the word actually *means*.

Built with Next.js 15, React 19, TypeScript, Tailwind v4, and framer-motion.

## Why

Wordle is great at letters, silent on meaning. I kept winning and then googling the word to figure out what it was — the spelling stuck, the definition slipped. wrdef keeps both.

Four consequences in the loop:

1. **Definition-first** — every round opens with a short clue, key words masked as blanks. You're decoding meaning → spelling, not guessing in the dark.
2. **Bonus round** — solve cleanly and a 90s timed round asks you to fill the definition's blanks for extra points. You're actively encoding the definition, not just reading it.
3. **Sentence round** — multiple choice: pick which of three example sentences uses the word in the sense you just learned. The distractors are real example sentences from *other senses of the same word*, so it tests that you retained the specific meaning, not just the word. Optional and skippable. Only shown for words with enough example data.
4. **Lifeline** — run out of guesses and the game *doesn't reveal the answer yet*. Instead it asks: can you fill any one blank in the definition? If yes, you earn one more guess at the word. If no (or skip), then the answer is shown.

## urdefs — your local definition tracker

Every finished round saves to your device under `wrdef:history:v1`. Visit [`/urdefs`](/urdefs) to see:

- Stats across all plays (plays, wins, win rate, current/best streak, best time, total score, sentence-round accuracy).
- Every word you've won, with the **fully revealed definition** below it, plus difficulty, outcome flags (lifeline used, bonus filled/skipped, sentence correct/wrong/skipped), and score.

No sign-in, no account, no server. Clear your browser data and it's gone — that's the tradeoff for no-friction tracking. Cloud sync is a future opt-in; the local schema will keep working.

## Difficulty modes

At build time, each word is given up to three *ranked senses* — rank 0 is the most primary meaning (the one you reach for first), rank 2 is the most obscure one the dictionary offers. Difficulty routes you to a rank:

- **Easy** — rank 0. The meaning everyone knows.
- **Medium** — rank 1. A secondary sense.
- **Hard** — rank 2. The deepest sense the word has.

The pool for each tier is also filtered by word rarity, so "hard" skews toward rare words with multiple documented senses — not just common words with a long clue.

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
6. **Sentence round** — multiple choice on the word's usage. Three dictionary example sentences; pick the one that matches the sense shown. Skippable. Only offered when the word has ≥3 distinct example sentences across its senses.
7. **Results** — score breakdown (solve + time bonus + bonus keywords + sentence − hints) and *Play again*.
8. **urdefs** (`/urdefs`) — stats grid + list of every win with its full definition.

## Scoring

Small, legible numbers:

- **Solve** — 500 / 400 / 300 / 200 / 100 / 50 by guess count.
- **Time bonus** — 1 pt per second under 60 (cap 60).
- **Bonus keywords** — 100 per correctly-filled blank.
- **Sentence** — 150 for a correct pick, 0 otherwise.
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
│   ├── SentenceRound.tsx     Post-solve multiple-choice on word usage
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
- **State machine** — all game transitions live in a single `useReducer` (`useGame.ts`) with an explicit `Phase` type: `loading` → `playing` → (`bonus` | `lifeline_offer` → `lifeline` → `playing` | `lost`) → (`sentence` | `results`). The bonus and sentence phases are independent and each skippable; the round only short-circuits past the sentence phase when the word doesn't have enough example data to build a 3-option choice.

## Data pipeline

`scripts/build-words.ts`:

1. Downloads the wordle-words CSV.
2. Splits rows into `validGuesses` (~12,971) and `answerCandidates` (~2,314 with non-null `day`).
3. Calls the Free Dictionary API per candidate with retry + exponential backoff. Caches per-word JSON under `.cache/defs/` — re-runs are free.
4. Collects every sense as a candidate, scores each on length + part-of-speech + sense-ordering, and keeps up to 3 ranked definitions per word. Verb / noun / adjective / adverb senses are preferred over interjection / preposition / pronoun / prefix, where definitions tend to be circular.
5. Drops senses the dictionary labels `(slang)`, `(vulgar)`, `(taboo)`, etc., and any sense whose text contains an explicit NSFW term (a small curated denylist). If every sense of a word is NSFW, the word itself falls out of the pool.
6. Captures the `example` sentence on each sense. Example sentences from senses that didn't make the top-3 are kept separately as distractor material for the sentence round.
7. Runs `keywordBlanker` to pick 2–6 content words per surviving definition (length ≥ 4, non-stopword, doesn't share a 4-char prefix with the target) as blanks.
8. Drops words that don't yield enough blanks on any sense.
9. Writes `public/words.json` (~2,226 final entries, ~1,700 with 3 ranked senses).

## Known limitations

- Free Dictionary API has gaps and occasionally oddly-phrased definitions.
- The sentence round only appears for words with enough distinct example sentences (~23% of the pool). The rest skip straight to the results screen — the feature degrades gracefully rather than showing a degraded round.
- History is device-local and not portable. By design, for now.
- Adding a new word corpus requires rerunning the pipeline and refreshing the cache.
