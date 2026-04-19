"use client";

import { useMemo } from "react";
import type { Blank } from "@/types";

export type DefinitionMode =
  | { kind: "masked"; hintedIndices?: number[] }
  | {
      kind: "input";
      values: string[];
      onChange: (i: number, v: string) => void;
      onFocus?: (i: number) => void;
      inputRefs?: React.MutableRefObject<Array<HTMLInputElement | null>>;
      disabled?: boolean;
      revealCorrect?: boolean[];
      hintedIndices?: number[];
    }
  | { kind: "revealed"; hintedIndices?: number[] }
  | {
      kind: "typing";
      /**
       * Per-blank letter count to show. 0 means hidden, >= answer.length means fully shown.
       */
      progress: number[];
      hintedIndices?: number[];
    };

type Segment =
  | { kind: "text"; value: string }
  | { kind: "blank"; blank: Blank; idx: number };

type Props = {
  text: string;
  blanks: Blank[];
  mode: DefinitionMode;
  className?: string;
};

function buildSegments(text: string, blanks: Blank[]): Segment[] {
  const sorted = [...blanks].sort((a, b) => a.index - b.index);
  const out: Segment[] = [];
  let cursor = 0;
  sorted.forEach((b, i) => {
    if (b.index > cursor) {
      out.push({ kind: "text", value: text.slice(cursor, b.index) });
    }
    out.push({ kind: "blank", blank: b, idx: i });
    cursor = b.index + b.length;
  });
  if (cursor < text.length) {
    out.push({ kind: "text", value: text.slice(cursor) });
  }
  return out;
}

export function Definition({ text, blanks, mode, className }: Props) {
  const segments = useMemo(() => buildSegments(text, blanks), [text, blanks]);

  return (
    <p
      className={`whitespace-pre-wrap leading-[1.55] text-[color:var(--text)] ${className ?? "text-center text-[17px] sm:text-lg"}`}
    >
      {segments.map((seg, i) => {
        if (seg.kind === "text") {
          return <span key={i}>{seg.value}</span>;
        }
        return (
          <BlankNode
            key={i}
            blank={seg.blank}
            idx={seg.idx}
            mode={mode}
          />
        );
      })}
    </p>
  );
}

function hintedChip(answer: string) {
  return (
    <span className="mx-0.5 rounded bg-[color:var(--tile-present)]/20 px-1 font-semibold text-[color:var(--tile-present)]">
      {answer}
    </span>
  );
}

function BlankNode({
  blank,
  idx,
  mode,
}: {
  blank: Blank;
  idx: number;
  mode: DefinitionMode;
}) {
  const hinted = mode.kind !== "typing" && mode.hintedIndices?.includes(idx);

  if (mode.kind === "masked") {
    if (hinted) return hintedChip(blank.answer);
    return (
      <span
        className="mx-0.5 inline-block align-baseline"
        aria-label={`${blank.length}-letter blank`}
      >
        <span
          className="inline-block translate-y-[2px] border-b-2 border-[color:var(--border-strong)] font-medium"
          style={{ width: `${Math.max(blank.length * 0.62, 2)}em` }}
        >
          <span className="invisible">{"x".repeat(blank.length)}</span>
        </span>
        <sub
          className="ml-[2px] text-[0.58em] font-semibold text-[color:var(--text-muted)]"
          aria-hidden
        >
          {blank.length}
        </sub>
      </span>
    );
  }

  if (mode.kind === "revealed") {
    if (hinted) return hintedChip(blank.answer);
    return (
      <span className="mx-0.5 rounded bg-[color:var(--accent-soft)] px-1 font-semibold text-[color:var(--accent)]">
        {blank.answer}
      </span>
    );
  }

  if (mode.kind === "typing") {
    const isHinted = mode.hintedIndices?.includes(idx);
    if (isHinted) return hintedChip(blank.answer);
    const shown = Math.max(0, Math.min(blank.answer.length, mode.progress[idx] ?? 0));
    const isDone = shown >= blank.answer.length;
    return (
      <span
        className={`mx-0.5 inline-block translate-y-[2px] border-b-2 px-0.5 align-baseline font-semibold transition-colors duration-300 ${
          isDone
            ? "border-transparent text-[color:var(--accent)]"
            : "border-[color:var(--border-strong)] text-[color:var(--accent)]"
        }`}
        style={{ minWidth: `${Math.max(blank.length * 0.62, 2)}em` }}
      >
        {blank.answer.slice(0, shown)}
        {!isDone && shown > 0 && (
          <span
            className="inline-block"
            style={{
              color: "var(--accent)",
              marginLeft: "1px",
              animation: "blink 1.05s ease-in-out infinite",
            }}
          >
            |
          </span>
        )}
        {shown === 0 && <span className="invisible">{"x".repeat(blank.length)}</span>}
      </span>
    );
  }

  // input
  if (hinted) return hintedChip(blank.answer);

  const value = mode.values[idx] ?? "";
  const revealState = mode.revealCorrect?.[idx];
  const colorClass =
    revealState === true
      ? "border-b-[color:var(--tile-correct)] text-[color:var(--tile-correct)]"
      : revealState === false
        ? "border-b-[color:var(--tile-absent)] text-[color:var(--tile-absent)]"
        : "border-b-[color:var(--border-strong)] text-[color:var(--text)]";

  const widthCh = Math.max(2.5, blank.length + 0.5);
  return (
    <input
      ref={(el) => {
        if (mode.inputRefs) mode.inputRefs.current[idx] = el;
      }}
      type="text"
      value={value}
      onChange={(e) => mode.onChange(idx, e.target.value)}
      onFocus={() => mode.onFocus?.(idx)}
      disabled={mode.disabled || revealState !== undefined}
      maxLength={24}
      spellCheck={false}
      autoCapitalize="off"
      autoComplete="off"
      aria-label={`Blank ${idx + 1}, ${blank.length} letters`}
      className={`mx-[3px] inline-block border-b-2 bg-transparent text-center font-medium align-baseline outline-none transition-colors focus:border-b-[color:var(--accent)] disabled:cursor-not-allowed ${colorClass}`}
      style={{ width: `${widthCh}ch`, fontSize: "inherit", lineHeight: "inherit" }}
    />
  );
}
