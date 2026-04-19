"use client";

import { useCallback, useEffect, useState } from "react";
import { DIFFICULTY_KEY, type Difficulty } from "@/lib/difficulty";

function readStored(): Difficulty | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(DIFFICULTY_KEY);
    if (v === "easy" || v === "medium" || v === "hard") return v;
  } catch {}
  return null;
}

export function useDifficulty() {
  const [difficulty, setDifficultyState] = useState<Difficulty>("medium");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStored();
    if (stored) setDifficultyState(stored);
    setHydrated(true);
  }, []);

  const setDifficulty = useCallback((next: Difficulty) => {
    setDifficultyState(next);
    try {
      window.localStorage.setItem(DIFFICULTY_KEY, next);
    } catch {}
  }, []);

  return { difficulty, setDifficulty, hydrated };
}
