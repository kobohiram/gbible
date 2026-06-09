import { expandMorphologyJa } from "@/lib/morphology";
import type { VerseWord } from "@/types";

export type ContextApiRequest = {
  reference: string;
  verseGreek: string;
  word: {
    id: string;
    greek: string;
    glossJa: string;
    morph: string;
    strongs: string;
    lemma?: string;
    definitionJa?: string;
  };
};

export function buildContextPrompt(payload: ContextApiRequest): string {
  const { reference, verseGreek, word } = payload;
  const morphJa = expandMorphologyJa(word.morph);

  return `あなたは新約ギリシャ語の解説者です。以下の節における特定の語の「文脈上の用法」を、初学者向けに日本語で補足してください。

## 節
${reference}

## 節全体（ギリシャ語）
${verseGreek}

## 注目する語
- ギリシャ語: ${word.greek}
- Strong's: ${word.strongs}
${word.lemma ? `- 見出し語: ${word.lemma}` : ""}
- 基本意味: ${word.glossJa}
- 文法: ${word.morph}（${morphJa}）
${word.definitionJa ? `- 辞書: ${word.definitionJa}` : ""}

## 出力要件
- 3〜5文程度、丁寧な日本語
- この節の文脈でなぜこの語形・意味が選ばれているか
- 神学的内容は節の範囲内に留める
- 箇条書き不可、段落1つ`;
}

export function verseGreekFromWords(words: VerseWord[]): string {
  return words.map((w) => w.greek).join(" ");
}
