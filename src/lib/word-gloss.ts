import type { LexiconEntry, VerseWord } from "@/types";
import { getWordText } from "@/lib/verse-text";

const MAX_SHORT_LEN = 18;
const MAX_PANE_LEN = 8;

/** 頻出語の短い訳語 */
const COMMON_GLOSS: Record<string, string> = {
  H1004: "家",
  H776: "地",
  H8064: "天",
  H430: "神",
  H853: "（対格）",
  H854: "と共に",
  H5921: "〜に",
  H413: "〜へ",
};

const VERBOSE_RE =
  /を示す|を指す|新たに|ことが|接続詞|前置詞|ものを|集団|空間|原因|理由|混沌状態|荒れ地|虚空・|広く表す|発する・|二者の/;

function isShortGloss(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_SHORT_LEN && !t.includes("。");
}

function firstSegment(text: string): string {
  if (!text) return "";
  return text.split(/[・、,／/]/)[0]?.trim() ?? "";
}

function trimToPane(text: string): string {
  const t = firstSegment(text);
  if (!t) return "";
  if (t.length <= MAX_PANE_LEN && !VERBOSE_RE.test(t)) return t;
  if (t.length <= 6) return t;
  return t.slice(0, MAX_PANE_LEN);
}

function fromDetailJa(detail: string): string {
  if (!detail) return "";

  const posMatch = detail.match(/(?:名詞|動詞|前置詞|接続詞|副詞|形容詞|数詞)「([^」]+)」/);
  if (posMatch) {
    const c = trimToPane(posMatch[1]);
    if (c) return c;
  }

  const lineMatch = detail.match(
    /^[「"]?(名詞|動詞|前置詞|接続詞|副詞|形容詞|数詞)[「」"]?([^。\n]{1,24})/,
  );
  if (lineMatch) {
    const c = trimToPane(lineMatch[2]);
    if (c) return c;
  }

  const quoted = detail.match(/「([^」]{1,12})」/g);
  if (quoted) {
    for (const q of quoted) {
      const inner = q.match(/「([^」]+)」/)?.[1] ?? "";
      const c = trimToPane(inner);
      if (c && !VERBOSE_RE.test(c)) return c;
    }
  }

  return "";
}

/** 2ペイン向け：語彙の最初の訳語だけ（最大8文字） */
export function extractPaneGloss(lexicon?: LexiconEntry | null): string {
  if (!lexicon) return "";
  if (COMMON_GLOSS[lexicon.strongs]) return COMMON_GLOSS[lexicon.strongs];

  const fromDetail = fromDetailJa(lexicon.detailJa ?? "");
  if (fromDetail) return fromDetail;

  const def = firstSegment(lexicon.definitionJa ?? "");
  if (def && def.length <= MAX_PANE_LEN && !VERBOSE_RE.test(def)) return def;

  const stored = lexicon.glossJa?.trim() ?? "";
  const gloss = firstSegment(stored);
  if (gloss && !VERBOSE_RE.test(gloss)) {
    return gloss.length <= MAX_PANE_LEN ? gloss : gloss.slice(0, MAX_PANE_LEN);
  }

  return "";
}

/** 辞書エントリから短い訳語を抽出する（3ペイン「意味」向け） */
export function extractShortGloss(lexicon?: LexiconEntry | null): string {
  if (!lexicon) return "";
  if (COMMON_GLOSS[lexicon.strongs]) return COMMON_GLOSS[lexicon.strongs];
  const gloss = lexicon.glossJa?.trim();
  if (gloss && isShortGloss(gloss) && !looksLikeVerseFragment(gloss)) return gloss;

  const def = lexicon.definitionJa?.trim() ?? "";
  if (def && isShortGloss(def)) return def.split("、")[0] ?? def;

  const literal = lexicon.detailJa?.match(/字義的には([^\s、。]{1,6})/);
  if (literal) return literal[1];

  const quoted = lexicon.detailJa?.match(/「([^」]{1,8})」/g);
  if (quoted) {
    for (const q of quoted) {
      const inner = q.match(/「([^」]+)」/)?.[1]?.trim();
      if (inner && isShortGloss(inner) && !looksLikeVerseFragment(inner)) return inner;
    }
  }

  if (def) {
    const first = def.split(/[。、]/)[0] ?? "";
    if (first.length <= 10) return first;
    return first.slice(0, 10);
  }
  return "";
}

function looksLikeVerseFragment(text: string): boolean {
  return /[にへでをがはと]$/.test(text) || /\d+:\d+/.test(text);
}

function prefixGlossFromSurface(text: string): string {
  if (/מִ|מִּ|מִב|מִבּ|מִן/.test(text)) return "〜から";
  if (/לְ|לֵ|לִ|לָ/.test(text) || /^ל/.test(text)) return "〜へ";
  if (/בְ|בַ|בָ|בְּ|בַּ|בָּ|בִּ|בּ|ב/.test(text)) return "〜で";
  if (/כְ|כַ|כָ|כ/.test(text)) return "〜のように";
  return "〜";
}

function composeWithPrefixes(word: VerseWord, core: string): string {
  if (!word.morph || word.strongs === "H0") return core;
  const segments = word.morph.split("/");
  const bits: string[] = [];

  for (const seg of segments) {
    if (seg === "HC" || seg.startsWith("HC")) bits.push("と");
    else if (seg === "R" || seg === "HR" || (seg[0] === "H" && seg[1] === "R")) {
      bits.push(prefixGlossFromSurface(getWordText(word)));
    }
  }

  if (bits.length === 0) return core;
  const unique = [...new Set(bits)];
  if (core) unique.push(core);
  return unique.join("・");
}

/** 2ペイン原文：TBESH 訳語（pane-gloss.json）を優先し、なければ word.glossJa にフォールバック */
export function resolvePaneGloss(
  word: VerseWord,
  paneGloss?: string | null,
): string {
  const core = paneGloss?.trim() ?? "";
  if (core) return composeWithPrefixes(word, core);
  // フォールバック: word.glossJa の最初のセグメント
  const fallback = firstSegment(word.glossJa?.trim() ?? "");
  if (!fallback) return "";
  const trimmed = fallback.length <= MAX_PANE_LEN ? fallback : fallback.slice(0, MAX_PANE_LEN);
  return composeWithPrefixes(word, trimmed);
}

/** 3ペイン「意味（この語）」向けの短い訳語 */
export function resolveShortGloss(
  word: VerseWord,
  lexicon?: LexiconEntry | null,
): string {
  const stored = word.glossJa?.trim();
  if (stored && isShortGloss(stored)) {
    return composeWithPrefixes(word, stored);
  }

  const fromLex = extractShortGloss(lexicon);
  if (fromLex) return composeWithPrefixes(word, fromLex);

  if (stored) return composeWithPrefixes(word, stored);
  return "";
}
