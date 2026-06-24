import { BOOKS, getBook, getChapterCount, getVerseCount } from "@/data/bible";
import type { BookId } from "@/types";

export type BibleLocation = {
  bookId: BookId;
  chapter: number;
  verse: number;
};

const BOOK_ALIASES = new Map<string, BookId>();

function addAlias(alias: string, bookId: BookId) {
  const key = alias.trim();
  if (key) BOOK_ALIASES.set(key, bookId);
}

function registerBookAliases() {
  for (const book of BOOKS) {
    addAlias(book.name, book.id);
    addAlias(book.name.replace(/による/g, ""), book.id);
    if (book.name.endsWith("による福音書")) {
      const short = book.name.replace("による福音書", "");
      addAlias(short, book.id);
      addAlias(`${short}福音書`, book.id);
    }
    if (book.name.includes("人への")) {
      addAlias(book.name.replace(/第[一二三四五六七八九十]+の/g, ""), book.id);
    }
    if (book.name.includes("の第一の手紙")) {
      addAlias(book.name.replace("の第一の手紙", ""), book.id);
      addAlias(`第一${book.name.replace("の第一の手紙", "")}`, book.id);
    }
    if (book.name.includes("の第二の手紙")) {
      addAlias(book.name.replace("の第二の手紙", ""), book.id);
      addAlias(`第二${book.name.replace("の第二の手紙", "")}`, book.id);
    }
    if (book.name.includes("の第三の手紙")) {
      addAlias(book.name.replace("の第三の手紙", ""), book.id);
    }
  }

  const extras: [string, BookId][] = [
    ["マ", "matthew"], ["太", "matthew"], ["Mt", "matthew"], ["Mat", "matthew"],
    ["可", "mark"], ["マルコ", "mark"], ["Mk", "mark"], ["Mr", "mark"],
    ["路", "luke"], ["ルカ", "luke"], ["Lk", "luke"], ["Lu", "luke"],
    ["約", "john"], ["ヨハネ", "john"], ["Jn", "john"], ["Joh", "john"],
    ["徒", "acts"], ["使徒", "acts"], ["Ac", "acts"], ["Acts", "acts"],
    ["ローマ", "romans"], ["Ro", "romans"], ["Rom", "romans"],
    ["1コロ", "1corinthians"], ["2コロ", "2corinthians"],
    ["ガラ", "galatians"], ["Ga", "galatians"],
    ["エペ", "ephesians"], ["Eph", "ephesians"],
    ["ピリ", "philippians"], ["Php", "philippians"],
    ["コロ", "colossians"], ["Col", "colossians"],
    ["1テサ", "1thessalonians"], ["2テサ", "2thessalonians"],
    ["1テモ", "1timothy"], ["2テモ", "2timothy"],
    ["テト", "titus"], ["Tit", "titus"],
    ["ピレ", "philemon"], ["Phm", "philemon"],
    ["ヘブ", "hebrews"], ["Heb", "hebrews"],
    ["ヤコ", "james"], ["Jas", "james"],
    ["1ペテ", "1peter"], ["2ペテ", "2peter"],
    ["1ヨハ", "1john"], ["2ヨハ", "2john"], ["3ヨハ", "3john"],
    ["ユダ", "jude"], ["Jud", "jude"],
    ["黙", "revelation"], ["黙示録", "revelation"], ["Rev", "revelation"],
    ["創", "genesis"], ["創世", "genesis"], ["Gen", "genesis"],
    ["出", "exodus"], ["Ex", "exodus"],
    ["レ", "leviticus"], ["Lev", "leviticus"],
    ["民", "numbers"], ["Num", "numbers"],
    ["申", "deuteronomy"], ["Dt", "deuteronomy"],
    ["詩", "psalms"], ["詩篇", "psalms"], ["Ps", "psalms"],
    ["箴", "proverbs"], ["Prov", "proverbs"],
    ["伝", "ecclesiastes"], ["雅", "songofsolomon"],
    ["イザ", "isaiah"], ["Isa", "isaiah"],
    ["エレ", "jeremiah"], ["Jer", "jeremiah"],
    ["エゼ", "ezekiel"], ["Eze", "ezekiel"],
    ["ダニ", "daniel"], ["Dan", "daniel"],
  ];
  for (const [alias, id] of extras) addAlias(alias, id);
}

registerBookAliases();

const SORTED_ALIASES = [...BOOK_ALIASES.entries()].sort((a, b) => b[0].length - a[0].length);

const CHAPTER_VERSE_RE =
  /^\s*(?:第)?(\d{1,3})\s*(?:章|:|：)\s*(?:第)?(\d{1,3})\s*(?:節)?(?:\s*[–—\-]\s*\d{1,3})?/;
const COLON_VERSE_RE = /^(\d{1,3}):(\d{1,3})(?:-\d{1,3})?/;

function clampLocation(bookId: BookId, chapter: number, verse: number): BibleLocation | null {
  if (chapter < 1 || verse < 1) return null;
  const maxChapter = getChapterCount(bookId);
  if (chapter > maxChapter) return null;
  const maxVerse = getVerseCount(bookId, chapter);
  if (maxVerse < 1 || verse > maxVerse) return null;
  return { bookId, chapter, verse };
}

export function formatBibleReference(loc: BibleLocation): string {
  const book = getBook(loc.bookId);
  return `${book.name} ${loc.chapter}:${loc.verse}`;
}

type TextSegment =
  | { type: "text"; value: string }
  | { type: "ref"; value: string; location: BibleLocation };

function tryMatchWithBook(
  text: string,
  start: number,
): { end: number; raw: string; location: BibleLocation } | null {
  for (const [alias, bookId] of SORTED_ALIASES) {
    if (!text.startsWith(alias, start)) continue;
    const after = start + alias.length;
    const cvMatch = text.slice(after).match(CHAPTER_VERSE_RE);
    if (!cvMatch) continue;
    const chapter = Number(cvMatch[1]);
    const verse = Number(cvMatch[2]);
    const location = clampLocation(bookId, chapter, verse);
    if (!location) continue;
    const end = after + cvMatch[0].length;
    return { end, raw: text.slice(start, end), location };
  }
  return null;
}

function tryMatchContextVerse(
  text: string,
  start: number,
  contextBookId: BookId,
): { end: number; raw: string; location: BibleLocation } | null {
  const colonMatch = text.slice(start).match(COLON_VERSE_RE);
  if (colonMatch) {
    const chapter = Number(colonMatch[1]);
    const verse = Number(colonMatch[2]);
    const location = clampLocation(contextBookId, chapter, verse);
    if (location) {
      return {
        end: start + colonMatch[0].length,
        raw: colonMatch[0],
        location,
      };
    }
  }
  const cvMatch = text.slice(start).match(CHAPTER_VERSE_RE);
  if (cvMatch) {
    const chapter = Number(cvMatch[1]);
    const verse = Number(cvMatch[2]);
    const location = clampLocation(contextBookId, chapter, verse);
    if (location) {
      return {
        end: start + cvMatch[0].length,
        raw: text.slice(start, start + cvMatch[0].length),
        location,
      };
    }
  }
  return null;
}

function isRefBoundary(text: string, start: number): boolean {
  if (start === 0) return true;
  const prev = text[start - 1];
  return !/[\d:./A-Za-z]/.test(prev);
}

export function splitTextWithReferences(
  text: string,
  contextBookId?: BookId,
): TextSegment[] {
  const segments: TextSegment[] = [];
  let i = 0;

  while (i < text.length) {
    const withBook = tryMatchWithBook(text, i);
    if (withBook) {
      segments.push({ type: "ref", value: withBook.raw, location: withBook.location });
      i = withBook.end;
      continue;
    }

    if (contextBookId && isRefBoundary(text, i)) {
      const ctx = tryMatchContextVerse(text, i, contextBookId);
      if (ctx) {
        segments.push({ type: "ref", value: ctx.raw, location: ctx.location });
        i = ctx.end;
        continue;
      }
    }

    let j = i + 1;
    for (; j < text.length; j++) {
      if (tryMatchWithBook(text, j)) break;
      if (
        contextBookId &&
        isRefBoundary(text, j) &&
        tryMatchContextVerse(text, j, contextBookId)
      ) {
        break;
      }
    }
    segments.push({ type: "text", value: text.slice(i, j) });
    i = j;
  }

  return segments;
}
