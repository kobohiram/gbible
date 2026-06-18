"use client";

import { useEffect, useRef, useState } from "react";
import type { BookData, LexiconEntry, VerseWord } from "@/types";
import type { PericopeRange } from "@/types/synoptic";
import type { WordMark } from "@/lib/synoptic-data";
import { MorphLabels } from "@/components/MorphLabels";

type Props = {
  bookName: string;
  participates: boolean;
  ranges: PericopeRange[];
  bookData: BookData | null;
  wordMarkMap: Map<string, WordMark>;
  globalLexicon: Record<string, LexiconEntry> | null;
};

type Anchor = { top: number; left: number; width: number; bottom: number };

function inRange(chapter: number, verse: number, r: PericopeRange): boolean {
  if (chapter < r.startChapter || chapter > r.endChapter) return false;
  if (chapter === r.startChapter && verse < r.startVerse) return false;
  if (chapter === r.endChapter && verse > r.endVerse) return false;
  return true;
}

export function SynopticPane({
  bookName,
  participates,
  ranges,
  bookData,
  wordMarkMap,
  globalLexicon,
}: Props) {
  const [selectedWord, setSelectedWord] = useState<VerseWord | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const balloonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedWord) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (balloonRef.current?.contains(target)) return;
      setSelectedWord(null);
      setAnchor(null);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedWord(null);
        setAnchor(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedWord]);

  const verseEntries = bookData
    ? Object.entries(bookData.words)
        .map(([key, words]) => {
          const [chStr, vStr] = key.split(":");
          return { chapter: Number(chStr), verse: Number(vStr), words };
        })
        .filter(({ chapter, verse }) => ranges.some((r) => inRange(chapter, verse, r)))
        .sort((a, b) => a.chapter - b.chapter || a.verse - b.verse)
    : [];

  const entry = selectedWord
    ? (globalLexicon?.[selectedWord.strongs] ?? bookData?.lexicon[selectedWord.strongs] ?? null)
    : null;

  function handleWordClick(word: VerseWord, e: React.MouseEvent<HTMLButtonElement>) {
    if (selectedWord?.id === word.id) {
      setSelectedWord(null);
      setAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: rect.top, left: rect.left, width: rect.width, bottom: rect.bottom });
    setSelectedWord(word);
  }

  const BALLOON_HEIGHT_ESTIMATE = 180;
  const showBelow = anchor != null && anchor.top < BALLOON_HEIGHT_ESTIMATE + 12;

  return (
    <div className="flex h-full flex-col" data-pane="synoptic">
      <header className="pane-header px-3 py-2 text-center">
        <h2 className="text-base font-bold text-foreground">{bookName}</h2>
      </header>

      {!participates ? (
        <div className="flex flex-1 items-center justify-center bg-muted/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            このペリコーペに{bookName}の並行箇所はありません
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          {verseEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">データを読み込み中…</p>
          ) : (
            <div className="space-y-3">
              {verseEntries.map(({ chapter, verse, words }) => (
                <div
                  key={`${chapter}:${verse}`}
                  className="flex flex-wrap items-baseline gap-x-1.5 gap-y-2"
                >
                  <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground/60">
                    {chapter}:{verse}
                  </span>
                  {words.map((word) => {
                    const mark = wordMarkMap.get(word.id);
                    const isSelected = word.id === selectedWord?.id;
                    return (
                      <button
                        key={word.id}
                        type="button"
                        onClick={(e) => handleWordClick(word, e)}
                        className={`flex flex-col items-center rounded px-0.5 py-0.5 transition-colors ${
                          isSelected
                            ? "bg-accent/35 ring-1 ring-primary/35"
                            : "hover:bg-accent/15"
                        }`}
                        style={
                          mark
                            ? { borderBottom: `3px solid var(${mark.colorVar})` }
                            : { borderBottom: "3px solid transparent" }
                        }
                      >
                        <span className="font-greek text-base leading-tight text-foreground">
                          {word.greek}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedWord && anchor && (
        <div
          ref={balloonRef}
          className="fixed z-50 w-64 -translate-x-1/2 rounded-lg border border-border bg-card p-3 shadow-lg"
          style={
            showBelow
              ? { top: anchor.bottom + 8, left: anchor.left + anchor.width / 2 }
              : { top: anchor.top - 8, left: anchor.left + anchor.width / 2, transform: "translate(-50%, -100%)" }
          }
        >
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <p className="font-greek text-lg text-foreground">{selectedWord.greek}</p>
              <MorphLabels morph={selectedWord.morph} size="sm" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Strong&apos;s {selectedWord.strongs}
              {entry?.lemma && ` · ${entry.lemma}`}
            </p>
            <p className="text-sm font-medium text-[var(--gloss)]">{selectedWord.glossJa}</p>
            {entry?.definitionJa && (
              <p className="text-xs leading-relaxed text-foreground/80">{entry.definitionJa}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
