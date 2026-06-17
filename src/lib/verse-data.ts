import { john1Verse1Words, lexiconSamples as lexiconJohn11 } from "@/data/john-1-1";
import { john1Verse14Words, lexiconJohn114 } from "@/data/john-1-14";
import type { BookId, LexiconEntry, VerseWord } from "@/types";

/** 全節データが揃っている書のID（generate-nt-data.mjs 実行後に追加していく） */
export const BOOKS_WITH_FULL_DATA = new Set<BookId>([
  "john",
  "mark",
  "matthew",
  "luke",
  "acts",
  "romans",
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

const LAST_LOCATION_KEY = "gbible-last-location";

export function loadLastLocation(): { bookId: BookId; chapter: number; verse: number } {
  if (typeof window === "undefined") return DEFAULT_LOCATION;
  try {
    const raw = localStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return DEFAULT_LOCATION;
    const parsed = JSON.parse(raw) as { bookId: BookId; chapter: number; verse: number };
    if (parsed.bookId && parsed.chapter && parsed.verse) return parsed;
  } catch {
    // ignore
  }
  return DEFAULT_LOCATION;
}

export function saveLastLocation(bookId: BookId, chapter: number, verse: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ bookId, chapter, verse }));
  } catch {
    // ignore
  }
}
