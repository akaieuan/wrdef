"use client";

import type { Blank } from "@/types";
import { Definition } from "./Definition";

type Props = {
  text: string;
  blanks: Blank[];
  hintedIndices?: number[];
};

export function DefinitionPanel({ text, blanks, hintedIndices }: Props) {
  return (
    <Definition
      text={text}
      blanks={blanks}
      mode={{ kind: "masked", hintedIndices }}
      className="text-center text-[13px] leading-[1.7] text-[color:var(--text-muted)] sm:text-[14px] sm:leading-[1.75]"
    />
  );
}
