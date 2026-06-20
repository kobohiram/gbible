"use client";

import { useState } from "react";
import { MORPH_LEGEND } from "@/lib/morphology";
import { HEBREW_MORPH_LEGEND } from "@/lib/morphology-hebrew";
import type { CorpusId } from "@/types";

type Props = {
  corpus?: CorpusId;
};

export function MorphLegend({ corpus = "nt" }: Props) {
  const [open, setOpen] = useState(false);
  const legend = corpus === "ot" ? HEBREW_MORPH_LEGEND : MORPH_LEGEND;

  return (
    <div className="border-b border-border bg-accent/10 px-4 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-[var(--grammar)] hover:underline"
      >
        {open ? "略語凡例を閉じる" : "文法略語の凡例"}
      </button>
      {open && (
        <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {legend.map((item) => (
            <div key={item.abbr} className="flex gap-2">
              <dt className="shrink-0 font-mono font-bold text-[var(--grammar)]">
                {item.abbr}
              </dt>
              <dd>{item.desc}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
