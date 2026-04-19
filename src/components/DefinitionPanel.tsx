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
      className="text-center text-[14px] leading-[1.95] text-[color:var(--text-muted)] sm:text-[15px] sm:leading-[2.05]"
    />
  );
}
