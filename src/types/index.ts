export type CorpusId = "nt" | "ot";

export type NtBookId =
  | "matthew" | "mark" | "luke" | "john"
  | "acts"
  | "romans" | "1corinthians" | "2corinthians" | "galatians" | "ephesians"
  | "philippians" | "colossians" | "1thessalonians" | "2thessalonians"
  | "1timothy" | "2timothy" | "titus" | "philemon"
  | "hebrews" | "james" | "1peter" | "2peter"
  | "1john" | "2john" | "3john" | "jude" | "revelation";

export type OtBookId =
  | "genesis" | "exodus" | "leviticus" | "numbers" | "deuteronomy"
  | "joshua" | "judges" | "ruth"
  | "1samuel" | "2samuel" | "1kings" | "2kings"
  | "1chronicles" | "2chronicles" | "ezra" | "nehemiah" | "esther"
  | "job" | "psalms" | "proverbs" | "ecclesiastes" | "songofsolomon"
  | "isaiah" | "jeremiah" | "lamentations" | "ezekiel" | "daniel"
  | "hosea" | "joel" | "amos" | "obadiah" | "jonah" | "micah"
  | "nahum" | "habakkuk" | "zephaniah" | "haggai" | "zechariah" | "malachi";

export type BookId = NtBookId | OtBookId;

export type ScriptureScript = "grc" | "heb";

export type Book = {
  id: BookId;
  name: string;
  chapters: number;
  corpus: CorpusId;
};

export type VerseWord = {
  id: string;
  strongs: string;
  /** 表面形（ギリシャ語・ヘブル語） */
  text?: string;
  /** 旧 JSON / 静的データ互換 */
  greek?: string;
  script?: ScriptureScript;
  /** Robinson / MorphGNT または OSHB 略語 */
  morph: string;
  glossJa: string;
  /** 旧約：その節の文脈での短い訳（接頭辞・接尾辞を含む。2ペイン表示用） */
  ctxGloss?: string;
  /** 旧約：アラム語の語 */
  lang?: "heb" | "arc";
  /** 旧約：異読（ケティブ／ケレ）。本文は読む形（ケレ）で、ここに書かれた形（ケティブ）を持つ */
  kq?: KetivQere;
  /** 旧約：文脈訳の確認状況（AI 下書き／確認済み）と AI 校閲の指摘 */
  review?: AiReviewInfo;
};

export type AiReviewInfo = {
  status: "ai" | "checked" | "legacy";
  /** AI 校閲が指摘した問題 */
  aiNote?: string;
  /** AI 校閲の修正案 */
  aiSuggestion?: string;
};

export type KetivQere = {
  /** 書かれた形（子音のみ） */
  ketiv: string;
  ketivMorph?: string;
  ketivStrongs?: string;
  /** 書かれた形の短い訳 */
  ketivGloss?: string;
  /** 読む形が複数語のとき、この語が何語目か */
  part: number;
  of: number;
};

export type LexiconEntry = {
  strongs: string;
  lemma: string;
  /** 短い訳語（2ペイン表示用） */
  glossJa?: string;
  definitionJa: string;
  detailJa?: string;
  reviewed: boolean;
  /** TBESH 等の出典表示用 */
  source?: "tbesh" | "tbesg" | "bdb" | "bdb-opus" | "ai";
  /** 旧約：確認状況（AI 下書き／確認済み／旧版）と AI 校閲の指摘 */
  review?: AiReviewInfo;
};

export type PersonalTranslation = {
  bookId: BookId;
  chapter: number;
  verse: number;
  translation: string;
  memo: string;
  memoIsPublic: boolean;
  updatedAt: string;
};

export type CommunityMemo = {
  id: number;
  userName: string;
  memo: string;
  updatedAt: string;
};

export type MemoReactions = {
  counts: Record<string, number>;
  mine: string[];
};

export const REACTION_EMOJIS = ["❤️", "🙏", "💡", "✨"] as const;

export type BookData = {
  version: number;
  book: BookId;
  name: string;
  chapters: number[];
  words: Record<string, VerseWord[]>;
  lexicon: Record<string, LexiconEntry>;
};

export type PaneId = "nav" | "verse" | "lexicon" | "notes";
