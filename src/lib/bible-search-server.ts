/**
 * Gbible bot の道具：Gbible に収録した本文・辞書を検索する（サーバー側）
 *
 * データは公開ファイル（public/data）を同じサイトから読み込み、インスタンス内でキャッシュする。
 * 検索索引は scripts/build-chat-index.mjs で作る。
 */
import { BOOKS, OT_PUBLISHED, getChapterCount, getVerseCount } from "@/data/bible";
import type { BookId } from "@/types";

type LexRow = [strongs: string, lemma: string, gloss: string, definition: string, count: number, books: number];
type VerseIndex = Record<string, Record<string, [strongs: string, glosses: string]>>;
type BookJson = {
  words: Record<string, { strongs: string; text?: string; greek?: string; glossJa?: string; ctxGloss?: string }[]>;
};
type MnspJson = { verses: Record<string, { sotaku?: string; chouyaku?: string }> };

const cache = new Map<string, Promise<unknown>>();

function load<T>(origin: string, path: string): Promise<T | null> {
  const key = `${origin}${path}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(key)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  }
  return cache.get(key) as Promise<T | null>;
}

const BOOK_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));

export function bookName(id: string): string {
  return BOOK_BY_ID.get(id as BookId)?.name.replace(/による福音書$/, "") ?? id;
}

/** Gbible に原文がある書と章（旧約は公開済みの章だけ） */
export function coverageSummary(): string {
  const ot = Object.entries(OT_PUBLISHED)
    .map(([id, info]) => {
      const chapters = info?.chapters ?? [];
      const all = chapters.length === getChapterCount(id as BookId);
      return `${bookName(id)}${all ? "（全章）" : `（${chapters.join("・")}章）`}`;
    })
    .join("、");
  return `新約27書すべて／旧約: ${ot}`;
}

function isAvailable(bookId: string, chapter: number): boolean {
  const book = BOOK_BY_ID.get(bookId as BookId);
  if (!book) return false;
  if (book.corpus === "nt") return true;
  return Boolean(OT_PUBLISHED[bookId as keyof typeof OT_PUBLISHED]?.chapters.includes(chapter));
}

// ---------------------------------------------------------------------------
// 語の検索

export async function searchWords(
  origin: string,
  query: string,
  corpus: "ot" | "nt" | "both" = "both",
  limit = 8,
) {
  const rows = (await load<LexRow[]>(origin, "/data/search/lexicon.json")) ?? [];
  const q = query.trim();
  if (!q) return { results: [] };
  const lower = q.toLowerCase();
  const scored: { row: LexRow; score: number }[] = [];
  for (const row of rows) {
    const [strongs, lemma, gloss, def] = row;
    if (corpus === "ot" && !strongs.startsWith("H")) continue;
    if (corpus === "nt" && !strongs.startsWith("G")) continue;
    const glosses = gloss.split(/[・、,]/).map((g) => g.trim());
    let score = 0;
    if (strongs.toLowerCase() === lower || lemma === q) score = 5;
    else if (glosses.includes(q)) score = 4;
    else if (gloss.includes(q)) score = 3;
    else if (def.includes(q)) score = 2;
    else if (lemma.normalize("NFD").replace(/[̀-֑ͯ-ׇ]/g, "").includes(q)) score = 1;
    if (score) scored.push({ row, score });
  }
  scored.sort((a, b) => b.score - a.score || b.row[4] - a.row[4]);
  return {
    results: scored.slice(0, limit).map(({ row }) => ({
      strongs: row[0],
      lemma: row[1],
      language: row[0].startsWith("H") ? "ヘブル語" : "ギリシャ語",
      gloss: row[2],
      definition: row[3],
      occurrencesInGbible: row[4],
    })),
    note: "出現回数は Gbible に収録した範囲（新約全体と、旧約の公開済みの章）での数",
  };
}

// ---------------------------------------------------------------------------
// 語が出てくる節の検索

export async function findVerses(
  origin: string,
  strongs: string[],
  opts: { books?: string[]; limit?: number } = {},
) {
  const index = (await load<VerseIndex>(origin, "/data/search/verses.json")) ?? {};
  const wanted = strongs.map((s) => s.trim().toUpperCase()).filter(Boolean);
  if (!wanted.length) return { total: 0, verses: [] };
  const limit = Math.min(opts.limit ?? 15, 40);
  const hits: { ref: string; glosses: string }[] = [];
  let total = 0;
  for (const [bookId, verses] of Object.entries(index)) {
    if (opts.books?.length && !opts.books.includes(bookId)) continue;
    for (const [key, [s, glosses]] of Object.entries(verses)) {
      const set = new Set(s.split(" "));
      if (!wanted.every((w) => set.has(w))) continue;
      total++;
      if (hits.length < limit) hits.push({ ref: `${bookName(bookId)}${key}`, glosses });
    }
  }
  return {
    total,
    verses: hits,
    note: total > hits.length ? `ほかに ${total - hits.length} 節あります（books で書を絞り込めます）` : undefined,
  };
}

// ---------------------------------------------------------------------------
// 節の本文

export async function getVerses(
  origin: string,
  bookId: string,
  chapter: number,
  fromVerse: number,
  toVerse?: number,
) {
  const book = BOOK_BY_ID.get(bookId as BookId);
  if (!book) return { error: `未知の書IDです: ${bookId}` };
  const last = Math.min(toVerse ?? fromVerse, fromVerse + 9, getVerseCount(book.id, chapter) || fromVerse);
  if (!isAvailable(bookId, chapter)) {
    return {
      available: false,
      note: `${book.name} ${chapter}章の原文は、まだ Gbible に収録されていません。箇所はあなたの知識で答えてよいが、原文を確かめられないことを添えること。`,
    };
  }
  const data = await load<BookJson>(origin, `/data/${book.corpus}/${bookId}.json`);
  const mnsp = await load<MnspJson>(origin, `/data/translations/mnsp/${bookId}.json`);
  if (!data) return { error: "本文データを読み込めませんでした。" };

  const verses = [];
  for (let v = fromVerse; v <= last; v++) {
    const ws = data.words[`${chapter}:${v}`];
    if (!ws) continue;
    const m = mnsp?.verses[`${chapter}:${v}`];
    verses.push({
      ref: `${bookName(bookId)}${chapter}:${v}`,
      original: ws.map((w) => w.text ?? w.greek ?? "").join(" "),
      wordByWord: ws.map((w) => `${w.text ?? w.greek ?? ""}(${w.ctxGloss || w.glossJa || ""})`).join(" "),
      ...(m?.sotaku ? { minnanoSeisho: m.sotaku } : {}),
    });
  }
  return {
    verses,
    ...(verses.some((v) => "minnanoSeisho" in v)
      ? { note: "minnanoSeisho は「みんなの聖書」（素訳）の本文。引用するときは出典を添える" }
      : {}),
  };
}

/** 書ID の一覧（システムプロンプト用） */
export function bookIdList(): string {
  return BOOKS.map((b) => `${b.id}=${bookName(b.id)}`).join(" ");
}
