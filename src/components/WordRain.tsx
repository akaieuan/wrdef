"use client";

import { useEffect, useRef, useState } from "react";
import { loadWordsFile } from "@/lib/wordData";

const TYPE_STEP_MS = 150;
const SUBMIT_PAUSE_MS = 280;
const HOLD_WRONG_MS = 1100;
const CORRECTED_HOLD_MS = 900;
const SETTLE_MS = 550;
const ERASE_STEP_MS = 70;
const NEXT_WORD_DELAY_MS = 350;

const FALLBACK_WORDS = [
  "ember", "haven", "prose", "flint", "oasis", "drift", "noble", "quilt",
  "mirth", "ivory", "scope", "raven", "latch", "vivid", "ghost", "clasp",
];

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

type Phase = "typing" | "holding_wrong" | "corrected" | "settling" | "erasing";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function randWord(list: string[], avoid?: string): string {
  for (let i = 0; i < 6; i++) {
    const w = list[Math.floor(Math.random() * list.length)];
    if (w !== avoid) return w;
  }
  return list[0];
}
function pickTypos(word: string): { idxs: Set<number>; chars: Record<number, string> } {
  const n = Math.random() < 0.4 ? 2 : 1;
  const idxs = new Set<number>();
  while (idxs.size < n) idxs.add(Math.floor(Math.random() * word.length));
  const chars: Record<number, string> = {};
  idxs.forEach((i) => {
    let c = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    while (c === word[i]) {
      c = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    chars[i] = c;
  });
  return { idxs, chars };
}

export function WordRain() {
  const [wordList, setWordList] = useState<string[]>(FALLBACK_WORDS);
  const [word, setWord] = useState<string>("");
  const [typoChars, setTypoChars] = useState<Record<number, string>>({});
  const [typoIdxs, setTypoIdxs] = useState<Set<number>>(new Set());
  const [visible, setVisible] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const wordListRef = useRef<string[]>(FALLBACK_WORDS);
  const mountedRef = useRef(false);

  useEffect(() => {
    wordListRef.current = wordList;
  }, [wordList]);

  useEffect(() => {
    let cancelled = false;
    loadWordsFile()
      .then((f) => {
        if (cancelled) return;
        const list =
          f.answerPool.length > 0
            ? f.answerPool.map((e) => e.word)
            : f.validGuesses.length > 0
              ? f.validGuesses
              : FALLBACK_WORDS;
        setWordList(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const first = randWord(wordListRef.current);
    const tp = pickTypos(first);
    setWord(first);
    setTypoIdxs(tp.idxs);
    setTypoChars(tp.chars);
    setVisible(0);
    setPhase("typing");
  }, []);

  useEffect(() => {
    if (!word) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (phase === "typing") {
      if (visible < word.length) {
        timer = setTimeout(() => setVisible((v) => v + 1), TYPE_STEP_MS);
      } else {
        timer = setTimeout(() => setPhase("holding_wrong"), SUBMIT_PAUSE_MS);
      }
    } else if (phase === "holding_wrong") {
      timer = setTimeout(() => setPhase("corrected"), HOLD_WRONG_MS);
    } else if (phase === "corrected") {
      timer = setTimeout(() => setPhase("settling"), CORRECTED_HOLD_MS);
    } else if (phase === "settling") {
      timer = setTimeout(() => setPhase("erasing"), SETTLE_MS);
    } else if (phase === "erasing") {
      if (visible > 0) {
        timer = setTimeout(() => setVisible((v) => v - 1), ERASE_STEP_MS);
      } else {
        timer = setTimeout(() => {
          const next = randWord(wordListRef.current, word);
          const tp = pickTypos(next);
          setWord(next);
          setTypoIdxs(tp.idxs);
          setTypoChars(tp.chars);
          setVisible(0);
          setPhase("typing");
        }, NEXT_WORD_DELAY_MS);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [phase, visible, word]);

  const charAt = (i: number): string => {
    if (phase === "typing" || phase === "holding_wrong") {
      return typoIdxs.has(i) ? typoChars[i] ?? word[i] : word[i];
    }
    return word[i];
  };

  const colorAt = (i: number): string | undefined => {
    const isTypo = typoIdxs.has(i);
    if (phase === "holding_wrong") {
      return isTypo ? "var(--tile-present)" : "var(--accent)";
    }
    if (phase === "corrected") return "var(--accent)";
    if (phase === "settling") return isTypo ? "var(--accent)" : undefined;
    return undefined;
  };

  return (
    <div
      className="pointer-events-none block select-none"
      aria-hidden
    >
      <span
        className="block font-thin lowercase text-[color:var(--text)]"
        style={{
          letterSpacing: "0.02em",
          lineHeight: "1",
        }}
      >
        {word.split("").map((_, i) => {
          if (i >= visible) return null;
          const color = colorAt(i);
          return (
            <span
              key={`${word}-${i}`}
              style={{
                color,
                transition: "color 420ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {charAt(i)}
            </span>
          );
        })}
        {phase === "typing" && visible < word.length && (
          <span
            style={{
              color: "var(--accent)",
              marginLeft: "2px",
              animation: "blink 1.1s ease-in-out infinite",
            }}
          >
            |
          </span>
        )}
      </span>
    </div>
  );
}
