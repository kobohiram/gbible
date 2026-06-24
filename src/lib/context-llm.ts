import { expandMorphologyJa } from "@/lib/morphology";
import { getWordText } from "@/lib/verse-text";
import type { CorpusId, LexiconEntry, VerseWord } from "@/types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ContextApiRequest = {
  reference: string;
  verseGreek: string;
  corpus?: CorpusId;
  word: {
    id: string;
    greek: string;
    glossJa: string;
    morph: string;
    strongs: string;
    lemma?: string;
    definitionJa?: string;
  };
  messages?: ChatMessage[];
};

export function buildContextRequest(
  reference: string,
  verseWords: VerseWord[],
  word: VerseWord,
  lexicon?: LexiconEntry | null,
  corpus: CorpusId = "nt",
): ContextApiRequest {
  return {
    reference,
    verseGreek: verseGreekFromWords(verseWords),
    corpus,
    word: {
      id: word.id,
      greek: getWordText(word),
      glossJa: word.glossJa ?? "",
      morph: word.morph,
      strongs: word.strongs,
      lemma: lexicon?.lemma,
      definitionJa: lexicon?.definitionJa,
    },
  };
}

export function buildContextSystemPrompt(payload: ContextApiRequest): string {
  const { reference, verseGreek, word } = payload;
  const corpus = payload.corpus ?? "nt";
  const lang = corpus === "ot" ? "ヘブル語" : "ギリシャ語";
  const morphJa = expandMorphologyJa(word.morph);

  return `あなたは${lang}聖書の解説助手です。ユーザーと${lang}の語句について対話します。

【固定コンテキスト】
節: ${reference}
節全体: ${verseGreek}
注目語: ${word.greek}
Strong's: ${word.strongs}
${word.lemma ? `見出し語: ${word.lemma}` : ""}
基本意味: ${word.glossJa}
文法: ${word.morph}（${morphJa}）
${word.definitionJa ? `辞書: ${word.definitionJa}` : ""}

初学者向けに簡潔で正確な日本語で答えてください。神学的内容は節の範囲内に留め、断定しすぎないでください。`;
}

export function buildContextPrompt(_payload: ContextApiRequest): string {
  return "この節におけるこの語の文脈上の用法を、初学者向けに3〜5文で解説してください。";
}

export function verseGreekFromWords(words: VerseWord[]): string {
  return words.map((w) => getWordText(w)).join(" ");
}
