"use client";

import { getChapterCount, getVerseCount } from "@/data/bible";
import { hasVerseData } from "@/lib/verse-data";
import type { Book, BookId, PersonalTranslation } from "@/types";

const selectClassName =
  "w-full min-w-0 rounded-lg border border-input bg-card px-2 py-1.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

type Props = {
  books: readonly Book[];
  bookId: BookId;
  chapter: number;
  selectedVerse: number;
  translations: PersonalTranslation[];
  onBookChange: (bookId: BookId) => void;
  onChapterChange: (chapter: number) => void;
  onSelectVerse: (verse: number) => void;
};

export function PaneNav({
  books,
  bookId,
  chapter,
  selectedVerse,
  translations,
  onBookChange,
  onChapterChange,
  onSelectVerse,
}: Props) {
  const chapterCount = getChapterCount(bookId);
  const verseCount = getVerseCount(bookId, chapter);

  const translationMap = new Map(
    translations.map((t) => [t.verse, t.translation]),
  );

  return (
    <div className="flex h-full flex-col">
      <header className="pane-header space-y-2 px-4 py-3">
        <h2 className="pane-header-label">書・章・節</h2>
        <label className="block">
          <span className="sr-only">書</span>
          <select
            className={selectClassName}
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
        <label className="flex items-center gap-2">
          <span className="sr-only">章</span>
          <select
            className={`${selectClassName} w-24 shrink-0`}
            value={chapter}
            onChange={(e) => onChapterChange(Number(e.target.value))}
          >
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
              <option key={ch} value={ch}>
                {ch}
              </option>
            ))}
          </select>
          <span className="text-sm font-medium text-foreground">章</span>
        </label>
      </header>
      <ul className="flex-1 overflow-y-auto px-3 py-2">
        {Array.from({ length: verseCount }, (_, i) => i + 1).map((verse) => {
          const translation = translationMap.get(verse);
          const hasTranslation = Boolean(translation?.trim());
          const isSelected = verse === selectedVerse;
          const hasData = hasVerseData(bookId, chapter, verse);

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
                {hasTranslation && (
                  <span className="min-w-0 truncate text-sm font-normal text-muted-foreground">
                    {translation}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
