export type BookId =
  | "matthew" | "mark" | "luke" | "john"
  | "acts"
  | "romans" | "1corinthians" | "2corinthians" | "galatians" | "ephesians"
  | "philippians" | "colossians" | "1thessalonians" | "2thessalonians"
  | "1timothy" | "2timothy" | "titus" | "philemon"
  | "hebrews" | "james" | "1peter" | "2peter"
  | "1john" | "2john" | "3john" | "jude" | "revelation";

export type Book = {
  id: BookId;
  name: string;
  chapters: number;
};

export type VerseWord = {
  id: string;
  strongs: string;
  greek: string;
  /** Robinson / MorphGNT 略語（例: N-DSF, V-IIA-3S, Conj） */
  morph: string;
  glossJa: string;
};

export type LexiconEntry = {
  strongs: string;
  lemma: string;
  definitionJa: string;
  reviewed: boolean;
};

export type PersonalTranslation = {
  bookId: BookId;
  chapter: number;
  verse: number;
  translation: string;
  memo: string;
  updatedAt: string;
};

export type BookData = {
  version: number;
  book: BookId;
  chapters: number[];
  words: Record<string, VerseWord[]>;   // key: "chapter:verse" e.g. "1:1"
  lexicon: Record<string, LexiconEntry>;
};

export type PaneId = "nav" | "verse" | "lexicon" | "notes";
