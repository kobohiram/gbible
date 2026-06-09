import { john1Verse1Words, lexiconSamples as lexiconJohn11 } from "@/data/john-1-1";
import { john1Verse14Words, lexiconJohn114 } from "@/data/john-1-14";
import type { BookId, LexiconEntry, VerseWord } from "@/types";

const lexiconAll: Record<string, LexiconEntry> = {
  ...lexiconJohn11,
  ...lexiconJohn114,
};

export function getVerseWords(
  bookId: BookId,
  chapter: number,
  verse: number,
): VerseWord[] {
  if (bookId === "john" && chapter === 1) {
    if (verse === 14) return john1Verse14Words;
    if (verse === 1) return john1Verse1Words;
  }
  return [];
}

export function getLexiconEntry(strongs: string): LexiconEntry | null {
  return lexiconAll[strongs] ?? null;
}

export function hasVerseData(
  bookId: BookId,
  chapter: number,
  verse: number,
): boolean {
  return getVerseWords(bookId, chapter, verse).length > 0;
}

/** 原文データがある節（デモ用デフォルト） */
export const DEFAULT_LOCATION = {
  bookId: "john" as BookId,
  chapter: 1,
  verse: 14,
};
