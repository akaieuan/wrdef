"use client";

import { motion } from "framer-motion";
import type { Blank } from "@/types";
import { Definition } from "./Definition";

type Props = {
  text: string;
  blanks: Blank[];
  hintedIndices?: number[];
};

export function DefinitionPanel({ text, blanks, hintedIndices }: Props) {
  return (
    <motion.div
      layoutId="definition-card"
      className="mx-auto w-full max-w-[22rem] sm:max-w-sm"
    >
      <Definition
        text={text}
        blanks={blanks}
        mode={{ kind: "masked", hintedIndices }}
        className="text-left text-[14px] leading-[1.55] text-[color:var(--text-muted)] sm:text-[15px]"
      />
    </motion.div>
  );
}
