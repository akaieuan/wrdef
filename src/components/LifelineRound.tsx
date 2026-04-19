"use client";

import { motion } from "framer-motion";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Blank } from "@/types";
import { Definition } from "./Definition";

export type LifelineRoundHandle = {
  pressLetter: (key: string) => void;
  pressBackspace: () => void;
  submit: () => void;
};

type Props = {
  word: string;
  text: string;
  blanks: Blank[];
  onSuccess: () => void;
  onFail: () => void;
  onDecline: () => void;
};

export const LifelineRound = forwardRef<LifelineRoundHandle, Props>(
  function LifelineRound(
    { text, blanks, onSuccess, onFail, onDecline },
    ref,
  ) {
    const [values, setValues] = useState<string[]>(() =>
      new Array(blanks.length).fill(""),
    );
    const [focusedIdx, setFocusedIdx] = useState<number>(0);
    const [result, setResult] = useState<"pending" | "success" | "fail">(
      "pending",
    );
    const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const valuesRef = useRef(values);
    const focusedIdxRef = useRef(focusedIdx);
    valuesRef.current = values;
    focusedIdxRef.current = focusedIdx;

    const correctFlags = useMemo(() => {
      if (result !== "success" && result !== "fail") return undefined;
      return blanks.map((b, i) => {
        const given = (values[i] ?? "").trim().toLowerCase();
        return given.length > 0 && given === b.answer.toLowerCase();
      });
    }, [blanks, values, result]);

    const handleChange = (i: number, v: string) => {
      setValues((prev) => {
        const next = [...prev];
        next[i] = v.replace(/[^a-zA-Z'-]/g, "").toLowerCase();
        return next;
      });
    };

    const submit = () => {
      if (result !== "pending") return;
      const anyCorrect = blanks.some((b, i) => {
        const given = (valuesRef.current[i] ?? "").trim().toLowerCase();
        return given.length > 0 && given === b.answer.toLowerCase();
      });
      if (anyCorrect) {
        setResult("success");
        setTimeout(() => onSuccess(), 750);
      } else {
        setResult("fail");
        setTimeout(() => onFail(), 900);
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        pressLetter(key) {
          if (result !== "pending") return;
          const idx = focusedIdxRef.current;
          if (idx == null || idx < 0) return;
          setValues((prev) => {
            const next = [...prev];
            next[idx] = (next[idx] || "") + key.toLowerCase();
            return next;
          });
        },
        pressBackspace() {
          if (result !== "pending") return;
          const idx = focusedIdxRef.current;
          if (idx == null || idx < 0) return;
          setValues((prev) => {
            const next = [...prev];
            next[idx] = (next[idx] || "").slice(0, -1);
            return next;
          });
        },
        submit,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [result],
    );

    const anyFilled = values.some((v) => v.trim().length > 0);

    return (
      <motion.div
        className="mx-auto flex w-full max-w-md flex-col"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--tile-present)]">
            Lifeline
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)]">
            Fill any blank · earn 1 guess
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
            disabled: result !== "pending",
            revealCorrect: correctFlags,
          }}
          className="text-left text-[15px] leading-[1.7] text-[color:var(--text)] sm:text-[16px]"
        />

        <div className="mt-5 flex w-full flex-col items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={result !== "pending" || !anyFilled}
            className="flex h-10 w-40 items-center justify-center rounded-xl bg-[color:var(--tile-present)] text-[13px] font-medium text-white shadow-[var(--shadow-sm)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {result === "success"
              ? "Nice"
              : result === "fail"
                ? "Missed"
                : "Use lifeline"}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={result !== "pending"}
            className="text-xs font-medium text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </motion.div>
    );
  },
);
