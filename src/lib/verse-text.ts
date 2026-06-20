import type { ScriptureScript, VerseWord } from "@/types";

/** 旧データの greek フィールドも読み取る */
export function getWordText(word: VerseWord): string {
  return word.text ?? word.greek ?? "";
}

export function getWordScript(word: VerseWord): ScriptureScript {
  if (word.script) return word.script;
  if (word.strongs.startsWith("H")) return "heb";
  return "grc";
}

export function isHebrewWord(word: VerseWord): boolean {
  return getWordScript(word) === "heb";
}

export function normalizeVerseWord(raw: VerseWord): VerseWord {
  const text = raw.text ?? raw.greek ?? "";
  const script = raw.script ?? (raw.strongs.startsWith("H") ? "heb" : "grc");
  return { ...raw, text, script };
}

export function normalizeVerseWords(words: VerseWord[]): VerseWord[] {
  return words.map(normalizeVerseWord);
}
