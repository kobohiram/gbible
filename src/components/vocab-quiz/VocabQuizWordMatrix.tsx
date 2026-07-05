"use client";

import { useState } from "react";
import type { VocabQuizWord } from "@/types/vocab-quiz";

type Props = {
  words: VocabQuizWord[];
  learned: Record<string, boolean>;
};

const COLS = 61;

export function VocabQuizWordMatrix({ words, learned }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const learnedCount = words.filter((w) => learned[w.id]).length;
  const activeWord = activeIndex !== null ? words[activeIndex] : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>単語マップ</span>
        <span>
          {learnedCount}/{words.length} 語
        </span>
      </div>

      <div
        className="min-h-11 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
        aria-live="polite"
      >
        {activeWord ? (
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
              #{activeIndex! + 1}
            </span>
            <span className="font-greek text-base font-semibold text-foreground">
              {activeWord.greek || activeWord.word}
            </span>
            <span className="text-foreground/90">{activeWord.answer}</span>
            <span className="text-xs text-muted-foreground">· {activeWord.unit}</span>
            <span
              className={`text-xs font-medium ${learned[activeWord.id] ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}
            >
              {learned[activeWord.id] ? "習得済み" : "未習得"}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            マスにカーソルを合わせるかタップすると、番号と単語が表示されます
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[18rem] gap-px rounded-md border border-border bg-border p-px"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {words.map((w, index) => {
            const isLearned = learned[w.id];
            const isActive = activeIndex === index;
            const num = index + 1;
            return (
              <button
                key={w.id}
                type="button"
                aria-label={`#${num} ${w.greek || w.word} ${w.answer} ${isLearned ? "習得済み" : "未習得"}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
                className={`aspect-square min-h-2 min-w-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  isLearned ? "bg-emerald-500" : "bg-background"
                } ${isActive ? "ring-1 ring-primary ring-inset" : ""}`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm border border-border bg-background" />
          未習得
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm bg-emerald-500" />
          習得済み
        </span>
      </div>
    </div>
  );
}
