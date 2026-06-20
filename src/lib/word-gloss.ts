import type { LexiconEntry, VerseWord } from "@/types";

function hasJapanese(text: string): boolean {
  return /[\u3040-\u30FF\u4E00-\u9FFF]/.test(text);
}

/** 語の下に表示する訳語。lexicon.json の日本語を優先する */
export function resolveWordGloss(
  word: VerseWord,
  lexicon?: LexiconEntry | null,
): string {
  const def = lexicon?.definitionJa?.trim();
  const gloss = word.glossJa?.trim() ?? "";

  if (def && hasJapanese(def)) return def;
  if (gloss && hasJapanese(gloss)) return gloss;
  if (def) return def;
  return gloss;
}
