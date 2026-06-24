import type { Book, BookId, CorpusId, NtBookId, OtBookId } from "@/types";

type BookDef = { id: BookId; name: string; verses: readonly number[]; corpus: CorpusId };

const NT_BOOKS: readonly BookDef[] = [
  { id: "matthew",        name: "マタイによる福音書",          corpus: "nt", verses: [25,23,17,25,48,34,29,34,38,42,30,50,58,36,39,28,27,35,30,34,46,46,39,51,46,75,66,20] },
  { id: "mark",           name: "マルコによる福音書",          corpus: "nt", verses: [45,28,35,41,43,56,37,38,50,52,33,44,37,72,47,20] },
  { id: "luke",           name: "ルカによる福音書",            corpus: "nt", verses: [80,52,38,44,39,49,50,56,62,42,54,59,35,35,32,31,37,43,48,47,38,71,56,53] },
  { id: "john",           name: "ヨハネによる福音書",          corpus: "nt", verses: [51,25,36,54,47,71,52,59,41,42,57,50,38,31,27,33,26,40,42,31,25] },
  { id: "acts",           name: "使徒の働き",                  corpus: "nt", verses: [26,47,26,37,42,15,60,40,43,48,30,25,52,28,41,40,34,28,40,38,40,30,35,27,27,32,44,31] },
  { id: "romans",         name: "ローマ人への手紙",            corpus: "nt", verses: [32,29,31,25,21,23,25,39,33,21,36,21,14,23,33,24] },
  { id: "1corinthians",   name: "コリント人への第一の手紙",    corpus: "nt", verses: [31,16,23,21,13,20,40,13,27,33,34,31,13,40,58,24] },
  { id: "2corinthians",   name: "コリント人への第二の手紙",    corpus: "nt", verses: [24,17,18,18,21,18,16,24,15,18,33,21,13] },
  { id: "galatians",      name: "ガラテヤ人への手紙",          corpus: "nt", verses: [24,21,29,31,26,18] },
  { id: "ephesians",      name: "エペソ人への手紙",            corpus: "nt", verses: [23,22,21,32,33,24] },
  { id: "philippians",    name: "ピリピ人への手紙",            corpus: "nt", verses: [30,30,21,23] },
  { id: "colossians",     name: "コロサイ人への手紙",          corpus: "nt", verses: [29,23,25,18] },
  { id: "1thessalonians", name: "テサロニケ人への第一の手紙",  corpus: "nt", verses: [10,20,13,18,28] },
  { id: "2thessalonians", name: "テサロニケ人への第二の手紙",  corpus: "nt", verses: [12,17,18] },
  { id: "1timothy",       name: "テモテへの第一の手紙",        corpus: "nt", verses: [20,15,16,16,25,21] },
  { id: "2timothy",       name: "テモテへの第二の手紙",        corpus: "nt", verses: [18,26,17,22] },
  { id: "titus",          name: "テトスへの手紙",              corpus: "nt", verses: [16,15,15] },
  { id: "philemon",       name: "ピレモンへの手紙",            corpus: "nt", verses: [25] },
  { id: "hebrews",        name: "ヘブル人への手紙",            corpus: "nt", verses: [14,18,19,16,14,20,28,13,28,39,40,29,25] },
  { id: "james",          name: "ヤコブの手紙",                corpus: "nt", verses: [27,26,18,17,20] },
  { id: "1peter",         name: "ペテロの第一の手紙",          corpus: "nt", verses: [25,25,22,19,14] },
  { id: "2peter",         name: "ペテロの第二の手紙",          corpus: "nt", verses: [21,22,18] },
  { id: "1john",          name: "ヨハネの第一の手紙",          corpus: "nt", verses: [10,29,24,21,21] },
  { id: "2john",          name: "ヨハネの第二の手紙",          corpus: "nt", verses: [13] },
  { id: "3john",          name: "ヨハネの第三の手紙",          corpus: "nt", verses: [15] },
  { id: "jude",           name: "ユダの手紙",                  corpus: "nt", verses: [25] },
  { id: "revelation",     name: "ヨハネの黙示録",              corpus: "nt", verses: [20,29,22,11,14,17,17,13,21,11,19,18,18,20,8,21,18,24,21,15,27,21] },
];

const OT_BOOKS: readonly BookDef[] = [
  { id: "genesis", name: "創世記", corpus: "ot", verses: [31,25,24,26,32,22,24,22,29,32,32,20,18,24,21,16,27,33,38,18,34,24,20,67,34,35,46,22,35,43,54,33,20,31,29,43,36,30,23,23,57,38,34,34,28,34,31,22,33,26] },
  { id: "exodus", name: "出エジプト記", corpus: "ot", verses: [22,25,22,31,23,30,25,32,35,29,10,51,22,31,27,36,16,27,25,26,36,31,33,18,40,37,21,43,46,38,18,35,23,35,35,38,29,31,43,38] },
  { id: "leviticus", name: "レビ記", corpus: "ot", verses: [17,16,17,35,19,30,38,36,24,20,47,8,59,57,33,34,16,30,37,27,24,33,44,23,55,46,34] },
  { id: "numbers", name: "民数記", corpus: "ot", verses: [54,34,51,49,31,27,89,26,23,36,35,16,33,45,41,50,13,32,22,29,35,41,30,25,18,65,23,31,40,16,54,42,56,29,34,13] },
  { id: "deuteronomy", name: "申命記", corpus: "ot", verses: [46,37,29,49,33,25,26,20,29,22,32,32,18,29,23,22,20,22,21,20,23,30,25,22,19,19,26,68,29,20,30,52,29,12] },
  { id: "joshua", name: "ヨシュア記", corpus: "ot", verses: [18,24,17,24,15,27,26,35,27,43,23,24,33,15,63,10,18,28,51,9,45,34,16,33] },
  { id: "judges", name: "士師記", corpus: "ot", verses: [36,23,31,24,31,40,25,35,57,18,40,15,25,20,20,31,13,31,30,48,25] },
  { id: "ruth", name: "ルツ記", corpus: "ot", verses: [22,23,18,22] },
  { id: "1samuel", name: "サムエル記上", corpus: "ot", verses: [28,36,21,22,12,21,17,22,27,27,15,25,23,52,35,23,58,30,24,42,15,23,29,22,44,25,12,25,11,31,13] },
  { id: "2samuel", name: "サムエル記下", corpus: "ot", verses: [27,32,39,12,25,23,29,18,13,19,27,31,39,33,37,23,29,33,43,26,22,51,39,25] },
  { id: "1kings", name: "列王記上", corpus: "ot", verses: [53,46,28,34,18,38,51,66,28,29,43,33,34,31,34,34,24,46,21,43,29,53] },
  { id: "2kings", name: "列王記下", corpus: "ot", verses: [18,25,27,44,27,33,20,29,37,36,21,21,25,29,38,20,41,37,37,21,26,20,37,20,30] },
  { id: "1chronicles", name: "歴代誌上", corpus: "ot", verses: [54,55,24,43,26,81,40,40,44,14,47,40,14,17,29,43,27,17,19,8,30,19,32,31,31,32,34,21,30] },
  { id: "2chronicles", name: "歴代誌下", corpus: "ot", verses: [17,18,17,22,14,42,22,18,31,19,23,16,23,15,19,14,19,34,11,37,20,12,21,27,28,23,9,27,36,27,21,33,25,33,27,23] },
  { id: "ezra", name: "エズラ記", corpus: "ot", verses: [11,70,13,24,17,22,28,36,15,44] },
  { id: "nehemiah", name: "ネヘミヤ記", corpus: "ot", verses: [11,20,32,23,19,19,73,18,38,39,36,47,31] },
  { id: "esther", name: "エステル記", corpus: "ot", verses: [22,23,15,17,14,14,10,17,32,3] },
  { id: "job", name: "ヨブ記", corpus: "ot", verses: [22,13,26,21,27,30,21,22,35,22,20,25,28,22,35,22,16,21,29,29,34,30,17,25,6,14,23,28,25,31,40,22,33,37,16,33,24,41,30,24,34,17] },
  { id: "psalms", name: "詩篇", corpus: "ot", verses: [6,12,8,8,12,10,17,9,20,18,7,8,6,5,11,15,50,15,14,9,13,31,6,10,22,12,14,9,11,12,24,11,22,22,28,12,40,22,13,17,13,11,5,26,17,11,9,14,20,23,19,9,6,7,23,13,11,11,12,9,13,11,5,7,11,12,14,20,8,36,37,6,24,20,28,23,10,12,20,72,13,19,16,8,18,12,13,17,7,18,52,17,16,15,5,23,11,13,12,9,9,5,8,28,22,35,45,48,43,13,31,7,10,10,9,8,18,19,2,29,176,7,8,9,4,8,5,6,5,6,8,8,3,18,3,3,21,26,9,8,24,13,10,7,12,15,21,10,20,14,9,6] },
  { id: "proverbs", name: "箴言", corpus: "ot", verses: [33,22,35,27,23,35,27,36,18,32,31,28,25,35,33,33,28,24,29,30,31,29,35,34,28,28,27,28,27,33,31] },
  { id: "ecclesiastes", name: "伝道者の書", corpus: "ot", verses: [18,26,22,16,20,12,29,17,18,20,10,14] },
  { id: "songofsolomon", name: "雅歌", corpus: "ot", verses: [17,17,11,16,16,13,13,14] },
  { id: "isaiah", name: "イザヤ書", corpus: "ot", verses: [31,22,26,6,30,13,25,22,21,34,16,6,22,32,9,14,14,7,25,6,17,25,18,23,12,21,13,29,24,33,9,20,24,17,10,22,38,22,8,31,29,25,28,28,25,13,15,22,26,11,23,15,12,17,13,12,21,14,21,22,11,12,19,12,25,24] },
  { id: "jeremiah", name: "エレミヤ書", corpus: "ot", verses: [19,37,25,31,31,30,34,22,26,25,23,17,27,22,21,21,27,23,15,18,14,30,40,10,38,24,22,17,32,24,40,44,26,22,19,32,21,28,18,16,18,22,13,30,5,28,7,47,39,46,64,34] },
  { id: "lamentations", name: "哀歌", corpus: "ot", verses: [22,22,66,22,22] },
  { id: "ezekiel", name: "エゼキエル書", corpus: "ot", verses: [28,10,27,17,17,14,27,18,11,22,25,28,23,23,8,63,24,32,14,49,32,31,49,27,17,21,36,26,21,26,18,32,33,31,15,38,28,23,29,49,26,20,27,31,25,24,23,35] },
  { id: "daniel", name: "ダニエル書", corpus: "ot", verses: [21,49,30,37,31,28,28,27,27,21,45,13] },
  { id: "hosea", name: "ホセア書", corpus: "ot", verses: [11,23,5,19,15,11,16,14,17,15,12,14,16,9] },
  { id: "joel", name: "ヨエル書", corpus: "ot", verses: [20,32,21] },
  { id: "amos", name: "アモス書", corpus: "ot", verses: [15,16,15,13,27,14,17,14,15] },
  { id: "obadiah", name: "オバデヤ書", corpus: "ot", verses: [21] },
  { id: "jonah", name: "ヨナ書", corpus: "ot", verses: [17,10,10,11] },
  { id: "micah", name: "ミカ書", corpus: "ot", verses: [16,13,12,13,15,16,20] },
  { id: "nahum", name: "ナホム書", corpus: "ot", verses: [15,13,19] },
  { id: "habakkuk", name: "ハバクク書", corpus: "ot", verses: [17,20,19] },
  { id: "zephaniah", name: "ゼパニヤ書", corpus: "ot", verses: [18,15,20] },
  { id: "haggai", name: "ハガイ書", corpus: "ot", verses: [15,23] },
  { id: "zechariah", name: "ゼカリヤ書", corpus: "ot", verses: [21,13,10,14,11,15,14,23,17,12,17,14,9,21] },
  { id: "malachi", name: "マラキ書", corpus: "ot", verses: [14,17,18,6] },
];

export const NT_BOOKS_LIST: readonly Book[] = NT_BOOKS.map((b) => ({
  id: b.id,
  name: b.name,
  chapters: b.verses.length,
  corpus: b.corpus,
}));

export const OT_BOOKS_LIST: readonly Book[] = OT_BOOKS.map((b) => ({
  id: b.id,
  name: b.name,
  chapters: b.verses.length,
  corpus: b.corpus,
}));

export const BOOKS: readonly Book[] = [...NT_BOOKS_LIST, ...OT_BOOKS_LIST];

const VERSES_MAP = new Map<BookId, readonly number[]>(
  [...NT_BOOKS, ...OT_BOOKS].map((b) => [b.id, b.verses]),
);

const BOOK_MAP = new Map<BookId, Book>(BOOKS.map((b) => [b.id, b]));

export function getBook(bookId: BookId): Book {
  const book = BOOK_MAP.get(bookId);
  if (!book) throw new Error(`Unknown book: ${bookId}`);
  return book;
}

export function getCorpus(bookId: BookId): CorpusId {
  return getBook(bookId).corpus;
}

export function getBooksForCorpus(corpus: CorpusId): readonly Book[] {
  return corpus === "nt" ? NT_BOOKS_LIST : OT_BOOKS_LIST;
}

export function getChapterCount(bookId: BookId): number {
  return getBook(bookId).chapters;
}

export function getVerseCount(bookId: BookId, chapter: number): number {
  const counts = VERSES_MAP.get(bookId);
  if (!counts || chapter < 1 || chapter > counts.length) return 0;
  return counts[chapter - 1] ?? 0;
}

export function isNtBookId(bookId: BookId): bookId is NtBookId {
  return getCorpus(bookId) === "nt";
}

export function isOtBookId(bookId: BookId): bookId is OtBookId {
  return getCorpus(bookId) === "ot";
}

/** 節データ JSON が存在する旧約書（段階的に追加） */
export const OT_BOOKS_WITH_DATA = new Set<OtBookId>(["genesis", "exodus"]);

export function bookHasOtData(bookId: BookId): boolean {
  return isOtBookId(bookId) && OT_BOOKS_WITH_DATA.has(bookId);
}
