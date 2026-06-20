"use client";

import type { CorpusId, VerseWord } from "@/types";
import { getWordScript, getWordText } from "@/lib/verse-text";
import { MorphLabels } from "./MorphLabels";
import { MorphLegend } from "./MorphLegend";

type Props = {
  reference: string;
  words: VerseWord[];
  selectedWordId: string | null;
  onSelectWord: (word: VerseWord) => void;
  corpus?: CorpusId;
  stacked?: boolean;
};

export function PaneVerse({
  reference,
  words,
  selectedWordId,
  onSelectWord,
  corpus = "nt",
  stacked,
}: Props) {
  const isRtl = words.length > 0 && getWordScript(words[0]) === "heb";

  return (
    <div className={stacked ? "flex flex-col" : "flex h-full flex-col"}>
      <header className="pane-header px-4 py-3 text-center">
        <h2 className="text-lg font-bold text-foreground">{reference}</h2>
        <p className="text-xs text-muted-foreground">単語をタップすると辞書に表示</p>
      </header>
      <MorphLegend corpus={corpus} />
      <div className={stacked ? "overflow-x-auto p-4" : "flex-1 overflow-x-auto overflow-y-auto p-4"}>
        {words.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            この節の原文データは準備中です。
          </p>
        ) : (
          <div
            className={`flex flex-wrap items-end gap-x-4 gap-y-6 ${isRtl ? "flex-row-reverse justify-end" : ""}`}
            dir={isRtl ? "rtl" : "ltr"}
          >
            {words.map((word) => {
              const isSelected = word.id === selectedWordId;
              const script = getWordScript(word);
              const surface = getWordText(word);
              return (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => onSelectWord(word)}
                  className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                    isSelected
                      ? "bg-accent/35 ring-2 ring-primary/35"
                      : "hover:bg-accent/15"
                  }`}
                  dir="ltr"
                >
                  <span
                    className={`text-2xl leading-none text-foreground ${
                      script === "heb" ? "font-hebrew" : "font-greek"
                    }`}
                    dir={script === "heb" ? "rtl" : "ltr"}
                  >
                    {surface}
                  </span>
                  <MorphLabels morph={word.morph} />
                  <span className="text-center text-sm font-medium leading-tight text-[var(--gloss)]">
                    {word.glossJa}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
