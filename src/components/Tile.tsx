"use client";

import { motion } from "framer-motion";
import type { TileState } from "@/types";

type Props = {
  letter: string;
  state: TileState;
  revealIndex?: number;
  reveal?: boolean;
};

const STATE_CLASS: Record<TileState, string> = {
  empty:
    "border-[color:var(--tile-empty-border)] bg-transparent text-[color:var(--text)]",
  filled:
    "border-[color:var(--border-strong)] bg-transparent text-[color:var(--text)]",
  correct:
    "border-[color:var(--tile-correct)] bg-[color:var(--tile-correct)] text-white",
  present:
    "border-[color:var(--tile-present)] bg-[color:var(--tile-present)] text-white",
  absent:
    "border-[color:var(--tile-absent)] bg-[color:var(--tile-absent)] text-white",
};

export function Tile({ letter, state, revealIndex = 0, reveal = false }: Props) {
  const isRevealing = reveal && state !== "empty" && state !== "filled";
  const delay = revealIndex * 0.12;

  return (
    <motion.div
      initial={false}
      animate={
        isRevealing
          ? { rotateX: [0, 90, 0] }
          : { rotateX: 0 }
      }
      transition={{
        duration: isRevealing ? 0.5 : 0,
        ease: [0.22, 0.61, 0.36, 1],
        delay,
      }}
      className={`flex aspect-square w-full items-center justify-center rounded-[8px] border-2 text-2xl font-semibold uppercase tracking-tight transition-colors duration-0 sm:text-3xl ${STATE_CLASS[state]}`}
      style={{ transformStyle: "preserve-3d" }}
    >
      {letter}
    </motion.div>
  );
}
