"use client";

import { useEffect } from "react";

type Handlers = {
  onKey: (key: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  enabled: boolean;
};

export function usePhysicalKeyboard({ onKey, onBackspace, onEnter, enabled }: Handlers) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onEnter();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onBackspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        onKey(e.key.toLowerCase());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey, onBackspace, onEnter, enabled]);
}
