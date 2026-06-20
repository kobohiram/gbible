import type { LexiconEntry, VerseWord } from "@/types";

const MAX_SHORT_LEN = 18;

/** 頻出語の短い訳語（AI 抽出より優先） */
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

function isShortGloss(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_SHORT_LEN && !t.includes("。");
}

/** 辞書エントリから短い訳語を抽出する */
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
      bits.push(prefixGlossFromSurface(word.text));
    }
  }

  if (bits.length === 0) return core;
  const unique = [...new Set(bits)];
  if (core) unique.push(core);
  return unique.join("・");
}

/** 2ペイン原文・「意味（この語）」向けの短い訳語 */
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
