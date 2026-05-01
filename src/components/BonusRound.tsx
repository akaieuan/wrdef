"use client";

import { motion } from "framer-motion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Blank } from "@/types";
import { Definition } from "./Definition";
import { BONUS_TIME_SECONDS } from "@/lib/constants";
import { useCountdownSeconds } from "@/hooks/useTimer";

export type BonusRoundHandle = {
  pressLetter: (key: string) => void;
  pressBackspace: () => void;
  submit: () => void;
};

type Props = {
  word: string;
  text: string;
  blanks: Blank[];
  startedAt: number | null;
  onSubmit: (answers: string[]) => void;
  onSkip: () => void;
};

export const BonusRound = forwardRef<BonusRoundHandle, Props>(function BonusRound(
  { word, text, blanks, startedAt, onSubmit, onSkip },
  ref,
) {
  const [values, setValues] = useState<string[]>(() =>
    new Array(blanks.length).fill(""),
  );
  const [submitted, setSubmitted] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const valuesRef = useRef(values);
  const focusedIdxRef = useRef(focusedIdx);
  const submittedRef = useRef(submitted);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  valuesRef.current = values;
  focusedIdxRef.current = focusedIdx;
  submittedRef.current = submitted;

  const remaining = useCountdownSeconds(startedAt, BONUS_TIME_SECONDS, !submitted);

  // Auto-focus first input when mounted
  useEffect(() => {
    const t = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!submitted && remaining === 0 && startedAt !== null) {
      setSubmitted(true);
      onSubmit(valuesRef.current);
    }
  }, [remaining, submitted, onSubmit, startedAt]);

  const handleChange = (i: number, v: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[i] = v.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
      return next;
    });
  };

  const handleSubmit = () => {
    if (submittedRef.current) return;
    setSubmitted(true);
    onSubmit(valuesRef.current);
  };

  useImperativeHandle(
    ref,
    () => ({
      pressLetter(key) {
        if (submittedRef.current) return;
        const idx = focusedIdxRef.current;
        if (idx == null || idx < 0) return;
        setValues((prev) => {
          const next = [...prev];
          next[idx] = (next[idx] || "") + key.toLowerCase();
          return next;
        });
      },
      pressBackspace() {
        if (submittedRef.current) return;
        const idx = focusedIdxRef.current;
        if (idx == null || idx < 0) return;
        setValues((prev) => {
          const next = [...prev];
          next[idx] = (next[idx] || "").slice(0, -1);
          return next;
        });
      },
      submit() {
        handleSubmit();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const progressPct = useMemo(
    () => Math.max(0, Math.min(1, remaining / BONUS_TIME_SECONDS)) * 100,
    [remaining],
  );

  return (
    <motion.div
      className="mx-auto flex w-full max-w-md flex-col"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
          Solved · {word}
        </p>
        <p
          className={`text-[10px] font-semibold uppercase tracking-[0.22em] tabular-nums ${
            remaining <= 15
              ? "text-[color:var(--tile-present)]"
              : "text-[color:var(--text-muted)]"
          }`}
        >
          {remaining}s
        </p>
      </div>

      <Definition
        text={text}
        blanks={blanks}
        mode={{
          kind: "input",
          values,
          onChange: handleChange,
          onFocus: setFocusedIdx,
          inputRefs,
          disabled: submitted,
        }}
        className="text-left text-[16px] leading-[1.7] text-[color:var(--text)]"
      />

      <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-[color:var(--border)]">
        <motion.div
          className="h-full bg-[color:var(--accent)]"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="mt-5 flex w-full flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitted}
          className="flex h-10 w-40 items-center justify-center rounded-xl bg-[color:var(--accent)] text-[13px] font-medium text-[color:var(--accent-text)] shadow-[var(--shadow-sm)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Submit
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={submitted}
          className="text-xs font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Skip
        </button>
      </div>
    </motion.div>
  );
});
