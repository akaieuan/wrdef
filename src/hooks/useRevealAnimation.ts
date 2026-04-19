"use client";

import { useEffect, useRef, useState } from "react";
import type { Blank } from "@/types";

const LETTER_STEP_MS = 70;
const BLANK_GAP_MS = 260;

/**
 * Drives a "typewriter" reveal of the definition blanks, one blank at a time.
 * Hinted blanks are skipped (they're already revealed, left as-is).
 * Returns per-blank visible letter count and an `isDone` flag.
 */
export function useRevealAnimation(
  blanks: Blank[],
  hintedIndices: number[],
  enabled: boolean,
): { progress: number[]; isDone: boolean } {
  const [progress, setProgress] = useState<number[]>(() =>
    new Array(blanks.length).fill(0),
  );
  const [isDone, setIsDone] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    cancelledRef.current = false;
    setProgress(new Array(blanks.length).fill(0));
    setIsDone(false);

    const hinted = new Set(hintedIndices);
    const order = blanks
      .map((_, i) => i)
      .filter((i) => !hinted.has(i));

    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      for (const idx of order) {
        if (cancelledRef.current) return;
        const answer = blanks[idx].answer;
        for (let c = 1; c <= answer.length; c++) {
          if (cancelledRef.current) return;
          await new Promise<void>((r) => {
            timer = setTimeout(() => r(), LETTER_STEP_MS);
          });
          if (cancelledRef.current) return;
          setProgress((prev) => {
            const next = [...prev];
            next[idx] = c;
            return next;
          });
        }
        await new Promise<void>((r) => {
          timer = setTimeout(() => r(), BLANK_GAP_MS);
        });
      }
      if (!cancelledRef.current) setIsDone(true);
    };

    run();

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, blanks.length, hintedIndices.join(",")]);

  return { progress, isDone };
}
