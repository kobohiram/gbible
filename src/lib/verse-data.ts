import { bookHasOtData } from "@/data/bible";
import { john1Verse1Words, lexiconSamples as lexiconJohn11 } from "@/data/john-1-1";
import { john1Verse14Words, lexiconJohn114 } from "@/data/john-1-14";
import { normalizeVerseWords } from "@/lib/verse-text";
import type { BookId, CorpusId, LexiconEntry, NtBookId, OtBookId, VerseWord } from "@/types";

/** 全節データが揃っている新約書のID（全27書） */
export const BOOKS_WITH_FULL_DATA = new Set<NtBookId>([
  "matthew",
  "mark",
  "luke",
  "john",
  "acts",
  "romans",
  "1corinthians",
  "2corinthians",
  "galatians",
  "ephesians",
  "philippians",
  "colossians",
  "1thessalonians",
  "2thessalonians",
  "1timothy",
  "2timothy",
  "titus",
  "philemon",
  "hebrews",
  "james",
  "1peter",
  "2peter",
  "1john",
  "2john",
  "3john",
  "jude",
  "revelation",
]);

/** データが揃っている旧約書の章セット */
export const OT_CHAPTER_DATA: Partial<Record<OtBookId, Set<number>>> = {
  genesis: new Set(Array.from({ length: 50 }, (_, i) => i + 1)),
  exodus: new Set(Array.from({ length: 40 }, (_, i) => i + 1)),
};

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
    if (verse === 1) return normalizeVerseWords(john1Verse1Words);
    if (verse === 14) return normalizeVerseWords(john1Verse14Words);
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
  if (BOOKS_WITH_FULL_DATA.has(bookId as NtBookId)) return true;
  const otChapters = OT_CHAPTER_DATA[bookId as OtBookId];
  if (otChapters?.has(chapter)) return true;
  return getVerseWords(bookId, chapter, verse).length > 0;
}

export const DEFAULT_NT_LOCATION = {
  bookId: "john" as BookId,
  chapter: 1,
  verse: 14,
};

export const DEFAULT_OT_LOCATION = {
  bookId: "genesis" as BookId,
  chapter: 1,
  verse: 1,
};

const LAST_LOCATION_KEY_NT = "gbible-last-location-nt";
const LAST_LOCATION_KEY_OT = "gbible-last-location-ot";

export function loadLastLocation(corpus: CorpusId): {
  bookId: BookId;
  chapter: number;
  verse: number;
} {
  const fallback = corpus === "nt" ? DEFAULT_NT_LOCATION : DEFAULT_OT_LOCATION;
  if (typeof window === "undefined") return fallback;
  const key = corpus === "nt" ? LAST_LOCATION_KEY_NT : LAST_LOCATION_KEY_OT;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { bookId: BookId; chapter: number; verse: number };
    if (parsed.bookId && parsed.chapter && parsed.verse) return parsed;
  } catch {
    // ignore
  }
  return fallback;
}

export function saveLastLocation(
  corpus: CorpusId,
  bookId: BookId,
  chapter: number,
  verse: number,
): void {
  if (typeof window === "undefined") return;
  const key = corpus === "nt" ? LAST_LOCATION_KEY_NT : LAST_LOCATION_KEY_OT;
  try {
    localStorage.setItem(key, JSON.stringify({ bookId, chapter, verse }));
  } catch {
    // ignore
  }
}

export function bookExpectsJsonData(bookId: BookId): boolean {
  return BOOKS_WITH_FULL_DATA.has(bookId as NtBookId) || bookHasOtData(bookId);
}
