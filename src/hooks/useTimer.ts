"use client";

import { useEffect, useState } from "react";

export function useElapsedSeconds(startedAt: number | null, running: boolean): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!running || startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running, startedAt]);

  if (startedAt === null) return 0;
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

export function useCountdownSeconds(
  startedAt: number | null,
  durationSec: number,
  running: boolean,
): number {
  const elapsed = useElapsedSeconds(startedAt, running);
  return Math.max(0, durationSec - elapsed);
}
