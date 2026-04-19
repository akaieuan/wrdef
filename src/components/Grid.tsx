"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MAX_GUESSES, WORD_LEN } from "@/lib/constants";
import type { TileState } from "@/types";
import { Tile } from "./Tile";

type Props = {
  guesses: string[];
  currentGuess: string;
  evaluations: TileState[][];
  invalidShakeKey: number;
};

export function Grid({
  guesses,
  currentGuess,
  evaluations,
  invalidShakeKey,
}: Props) {
  const [shakeTick, setShakeTick] = useState(0);

  useEffect(() => {
    if (invalidShakeKey > 0) setShakeTick((t) => t + 1);
  }, [invalidShakeKey]);

  const rows: Array<{
    letters: string[];
    states: TileState[];
    reveal: boolean;
    isCurrent: boolean;
  }> = [];

  for (let r = 0; r < MAX_GUESSES; r++) {
    if (r < guesses.length) {
      rows.push({
        letters: guesses[r].split(""),
        states: evaluations[r],
        reveal: true,
        isCurrent: false,
      });
    } else if (r === guesses.length) {
      const letters = currentGuess.padEnd(WORD_LEN, " ").split("");
      const states: TileState[] = letters.map((c) =>
        c === " " ? "empty" : "filled",
      );
      rows.push({ letters, states, reveal: false, isCurrent: true });
    } else {
      rows.push({
        letters: "     ".split(""),
        states: new Array(WORD_LEN).fill("empty"),
        reveal: false,
        isCurrent: false,
      });
    }
  }

  return (
    <div className="flex h-full w-full flex-col gap-1.5">
      {rows.map((row, r) => (
        <motion.div
          key={r}
          animate={row.isCurrent && shakeTick > 0 ? { x: [0, -8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          className="grid grid-cols-5 gap-1.5"
        >
          {row.letters.map((ch, i) => (
            <Tile
              key={`${r}-${i}-${shakeTick}`}
              letter={ch.trim()}
              state={row.states[i] ?? "empty"}
              revealIndex={i}
              reveal={row.reveal}
            />
          ))}
        </motion.div>
      ))}
    </div>
  );
}
