"use client";

import type { VocabQuizWord } from "@/types/vocab-quiz";

type Props = {
  words: VocabQuizWord[];
  learned: Record<string, boolean>;
};

const COLS = 61;

export function VocabQuizWordMatrix({ words, learned }: Props) {
  const learnedCount = words.filter((w) => learned[w.id]).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>単語マップ</span>
        <span>
          {learnedCount}/{words.length} 語
        </span>
      </div>
      <div
        className="grid gap-px rounded-md border border-border bg-border p-px"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`全${words.length}語の習得マップ。${learnedCount}語を習得済み`}
      >
        {words.map((w) => (
          <div
            key={w.id}
            title={`${w.greek || w.word} — ${learned[w.id] ? "習得済み" : "未習得"}`}
            className={`aspect-square transition-colors ${learned[w.id] ? "bg-emerald-500" : "bg-background"}`}
          />
        ))}
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
