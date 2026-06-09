import type { Book, BookId } from "@/types";

/** ヨハネ福音書 各章の節数（標準版） */
const JOHN_VERSES: readonly number[] = [
  51, 25, 36, 54, 47, 72, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42,
  31, 25,
];

export const BOOKS: readonly Book[] = [
  { id: "john", name: "ヨハネ福音書", chapters: JOHN_VERSES.length },
] as const;

const CHAPTER_VERSES: Partial<Record<BookId, readonly number[]>> = {
  john: JOHN_VERSES,
};

export function getBook(bookId: BookId): Book {
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);
  return book;
}

export function getChapterCount(bookId: BookId): number {
  return getBook(bookId).chapters;
}

export function getVerseCount(bookId: BookId, chapter: number): number {
  const counts = CHAPTER_VERSES[bookId];
  if (!counts || chapter < 1 || chapter > counts.length) return 0;
  return counts[chapter - 1] ?? 0;
}
