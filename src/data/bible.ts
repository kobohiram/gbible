import type { Book, BookId } from "@/types";

type BookDef = { id: BookId; name: string; verses: readonly number[] };

const NT_BOOKS: readonly BookDef[] = [
  { id: "matthew",        name: "マタイによる福音書",          verses: [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20] },
  { id: "mark",           name: "マルコによる福音書",          verses: [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20] },
  { id: "luke",           name: "ルカによる福音書",            verses: [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53] },
  { id: "john",           name: "ヨハネによる福音書",          verses: [51,25,36,54,47,71,52,59,41,42,57,50,38,31,27,33,26,40,42,31,25] },
  { id: "acts",           name: "使徒の働き",                  verses: [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,40,38,40,30,35,27,27,32,44,31] },
  { id: "romans",         name: "ローマ人への手紙",            verses: [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,24] },
  { id: "1corinthians",   name: "コリント人への第一の手紙",    verses: [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24] },
  { id: "2corinthians",   name: "コリント人への第二の手紙",    verses: [24,17,18,18,21,18,16,24,15,18,33,21,13] },
  { id: "galatians",      name: "ガラテヤ人への手紙",          verses: [24,21,29,31,26,18] },
  { id: "ephesians",      name: "エペソ人への手紙",            verses: [23,22,21,32,33,24] },
  { id: "philippians",    name: "ピリピ人への手紙",            verses: [30,30,21,23] },
  { id: "colossians",     name: "コロサイ人への手紙",          verses: [29,23,25,18] },
  { id: "1thessalonians", name: "テサロニケ人への第一の手紙",  verses: [10,20,13,18,28] },
  { id: "2thessalonians", name: "テサロニケ人への第二の手紙",  verses: [12,17,18] },
  { id: "1timothy",       name: "テモテへの第一の手紙",        verses: [20,15,16,16,25,21] },
  { id: "2timothy",       name: "テモテへの第二の手紙",        verses: [18,26,17,22] },
  { id: "titus",          name: "テトスへの手紙",              verses: [16,15,15] },
  { id: "philemon",       name: "ピレモンへの手紙",            verses: [25] },
  { id: "hebrews",        name: "ヘブル人への手紙",            verses: [14,18,19,16,14,20,28,13,28,39,40,29,25] },
  { id: "james",          name: "ヤコブの手紙",                verses: [27,26,18,17,20] },
  { id: "1peter",         name: "ペテロの第一の手紙",          verses: [25,25,22,19,14] },
  { id: "2peter",         name: "ペテロの第二の手紙",          verses: [21,22,18] },
  { id: "1john",          name: "ヨハネの第一の手紙",          verses: [10,29,24,21,21] },
  { id: "2john",          name: "ヨハネの第二の手紙",          verses: [13] },
  { id: "3john",          name: "ヨハネの第三の手紙",          verses: [15] },
  { id: "jude",           name: "ユダの手紙",                  verses: [25] },
  { id: "revelation",     name: "ヨハネの黙示録",              verses: [20,29,22,11,14,17,17,13,21,11,19,18,18,20,8,21,18,24,21,15,27,21] },
];

export const BOOKS: readonly Book[] = NT_BOOKS.map((b) => ({
  id: b.id,
  name: b.name,
  chapters: b.verses.length,
}));

const VERSES_MAP = new Map<BookId, readonly number[]>(
  NT_BOOKS.map((b) => [b.id, b.verses]),
);

export function getBook(bookId: BookId): Book {
  const book = BOOKS.find((b) => b.id === bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);
  return book;
}

export function getChapterCount(bookId: BookId): number {
  return getBook(bookId).chapters;
}

export function getVerseCount(bookId: BookId, chapter: number): number {
  const counts = VERSES_MAP.get(bookId);
  if (!counts || chapter < 1 || chapter > counts.length) return 0;
  return counts[chapter - 1] ?? 0;
}
