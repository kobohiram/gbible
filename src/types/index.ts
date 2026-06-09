export type BookId = "john";

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

export type PaneId = "nav" | "verse" | "lexicon" | "notes";
