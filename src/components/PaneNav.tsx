"use client";

import { useEffect, useState } from "react";
import { getChapterCount, getVerseCount } from "@/data/bible";
import { hasVerseData } from "@/lib/verse-data";
import {
  MISSING_TRANSLATION_LABEL,
  TRANSLATION_PREVIEW_LABELS,
  getMnspChouyaku,
  getPreviewText,
  loadTranslationPreview,
  saveTranslationPreview,
  type MnspBookData,
  type TranslationPreviewId,
} from "@/lib/translations";
import type { Book, BookId, CorpusId, PersonalTranslation } from "@/types";

const selectClassName =
  "min-w-0 rounded-lg border border-input bg-card px-2 py-1.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  corpus: CorpusId;
  books: readonly Book[];
  bookId: BookId;
  chapter: number;
  selectedVerse: number;
  translations: PersonalTranslation[];
  mnspData: MnspBookData | null;
  bookDataLoaded: boolean;
  onCorpusChange: (corpus: CorpusId) => void;
  onBookChange: (bookId: BookId) => void;
  onChapterChange: (chapter: number) => void;
  onSelectVerse: (verse: number) => void;
  stacked?: boolean;
};

export function PaneNav({
  corpus,
  books,
  bookId,
  chapter,
  selectedVerse,
  translations,
  mnspData,
  bookDataLoaded,
  onCorpusChange,
  onBookChange,
  onChapterChange,
  onSelectVerse,
  stacked,
}: Props) {
  const chapterCount = getChapterCount(bookId);
  const verseCount = getVerseCount(bookId, chapter);

  const [previewId, setPreviewId] = useState<TranslationPreviewId>("private");

  useEffect(() => {
    setPreviewId(loadTranslationPreview());
  }, []);

  const translationMap = new Map(
    translations.map((t) => [t.verse, t.translation]),
  );

  const previewOptions: TranslationPreviewId[] = ["private", "mnsp"];

  function handlePreviewChange(id: TranslationPreviewId) {
    setPreviewId(id);
    saveTranslationPreview(id);
  }

  return (
    <div className={stacked ? "flex flex-col" : "flex h-full flex-col"}>
      <header className="pane-header space-y-2 px-4 py-3">
        <div
          className="grid grid-cols-2 gap-1 rounded-lg border border-input bg-muted/40 p-0.5"
          role="tablist"
          aria-label="聖書の区分"
        >
          {(["ot", "nt"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={corpus === c}
              onClick={() => onCorpusChange(c)}
              className={`rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
                corpus === c
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c === "ot" ? "旧約" : "新約"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">書</span>
            <select
              className={`${selectClassName} w-full`}
              value={bookId}
              onChange={(e) => onBookChange(e.target.value as BookId)}
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className="sr-only">章</span>
            <select
              className={`${selectClassName} w-[3.25rem] tabular-nums`}
              value={chapter}
              onChange={(e) => onChapterChange(Number(e.target.value))}
            >
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="sr-only">節一覧の訳</span>
          <select
            className={`${selectClassName} w-full`}
            value={previewId}
            onChange={(e) =>
              handlePreviewChange(e.target.value as TranslationPreviewId)
            }
          >
            {previewOptions.map((id) => (
              <option key={id} value={id}>
                {TRANSLATION_PREVIEW_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
      </header>
      <ul
        className={
          stacked ? "max-h-64 overflow-y-auto px-3 py-2" : "flex-1 overflow-y-auto px-3 py-2"
        }
      >
        {Array.from({ length: verseCount }, (_, i) => i + 1).map((verse) => {
          const privateTranslation = translationMap.get(verse) ?? "";
          const previewText = getPreviewText(
            previewId,
            verse,
            privateTranslation,
            mnspData,
            chapter,
          );
          const hasPreview = Boolean(previewText.trim());
          const showMissing =
            previewId === "mnsp" && !getMnspChouyaku(mnspData, chapter, verse);
          const isSelected = verse === selectedVerse;
          const hasData = bookDataLoaded || hasVerseData(bookId, chapter, verse);

          return (
            <li key={verse}>
              <button
                type="button"
                onClick={() => onSelectVerse(verse)}
                className="flex w-full min-w-0 items-baseline gap-2 py-1 text-left transition-colors hover:text-foreground"
              >
                <span
                  className={`shrink-0 rounded px-1 font-mono text-sm font-semibold tabular-nums transition-colors ${
                    isSelected
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : hasData
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {verse}
                </span>
                {showMissing ? (
                  <span className="min-w-0 truncate text-sm font-normal text-muted-foreground/60">
                    {MISSING_TRANSLATION_LABEL}
                  </span>
                ) : hasPreview ? (
                  <span className="min-w-0 truncate text-sm font-normal text-muted-foreground">
                    {previewText}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
