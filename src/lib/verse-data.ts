import { john1Verse1Words, lexiconSamples as lexiconJohn11 } from "@/data/john-1-1";
import { john1Verse14Words, lexiconJohn114 } from "@/data/john-1-14";
import type { BookId, LexiconEntry, VerseWord } from "@/types";

/** 全節データが揃っている書のID（generate-nt-data.mjs 実行後に追加していく） */
export const BOOKS_WITH_FULL_DATA = new Set<BookId>([
  "john",
]);

const legacyLexicon: Record<string, LexiconEntry> = {
  ...lexiconJohn11,
  ...lexiconJohn114,
};

/** レガシー静的データ（John 1:1, 1:14 のみ）。BookData ロード後はそちらを優先する */
export function getVerseWords(
  bookId: BookId,
  chapter: number,
  verse: number,
): VerseWord[] {
  if (bookId === "john" && chapter === 1) {
    if (verse === 1)  return john1Verse1Words;
    if (verse === 14) return john1Verse14Words;
  }
  return [];
}

export function getLexiconEntry(strongs: string): LexiconEntry | null {
  return legacyLexicon[strongs] ?? null;
}

export function hasVerseData(
  bookId: BookId,
  chapter: number,
  verse: number,
): boolean {
  if (BOOKS_WITH_FULL_DATA.has(bookId)) return true;
  return getVerseWords(bookId, chapter, verse).length > 0;
}

export const DEFAULT_LOCATION = {
  bookId: "john" as BookId,
  chapter: 1,
  verse: 14,
};
