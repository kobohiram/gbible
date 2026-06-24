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
  const lang = corpus === "ot" ? "ヘブル語" : "コイネー（聖書）ギリシャ語";
  const morphJa = expandMorphologyJa(word.morph);
  const isVerb = /^V-/.test(word.morph);

  return `あなたは${lang}聖書の文法・解釈に詳しい助手です。ユーザーと${lang}の語句について対話します。

【固定コンテキスト】
節: ${reference}
節全体: ${verseGreek}
注目語: ${word.greek}
Strong's: ${word.strongs}
${word.lemma ? `見出し語: ${word.lemma}` : ""}
基本意味: ${word.glossJa}
文法: ${word.morph}（${morphJa}）
${word.definitionJa ? `辞書: ${word.definitionJa}` : ""}

【解説で最も大事にすること】
1. 聖書の時代の${lang}としての文法のニュアンス（格・前置詞・接続詞・語順など）
2. ${isVerb ? "この語は動詞です。時制（アオリスト／未完了／完了など）・法・態がこの節で持つニュアンスを必ず触れてください。" : "動詞でなければ、名詞格・形容詞・副詞など当該語形の文法的働きを説明してください。"}
3. 構文・句構造・慣用表現（例：属格の連鎖、不定詞構文、前置詞句、ヘブライズム／セムティズムなど）があれば解説する
4. 日本語聖書や一般的な訳語だけでは伝わりにくい、原文から感じ取れるニュアンス・含意・文体の選択を示す

【避けること】
- 辞書的な意味の繰り返しだけで終わること
- 日本語訳の言い換えだけで済ませること
- 神学の論争になりうる話題（救恩論・予定論・礼拝論・教派対立など）への踏み込み
- 「〜である」「必ず〜」など権威的・断定的な言い方
- 節の範囲を大きく超えた神学的主張

【文体】
- 文法・語法・構文の客観的事実ははっきり述べてよい
- 解釈・意図・含意は「〜とも考えられます」「〜という見方もあります」「〜かもしれません」の形にする
- 学者間で議論がある点は「諸説があります」と明記する
- 初学者向けに簡潔で正確な日本語で答える`;
}

export function buildContextPrompt(payload: ContextApiRequest): string {
  const isVerb = /^V-/.test(payload.word.morph);
  return `この節におけるこの語について、初学者向けに3〜5文で解説してください。${isVerb ? "特に動詞の時制・法・態のニュアンスを中心に、" : ""}構文や慣用句があれば触れ、日本語訳だけでは分かりにくい原文のニュアンスがあれば示してください。神学の論争や断定は避け、解釈は可能性の形で述べてください。`;
}

export function verseGreekFromWords(words: VerseWord[]): string {
  return words.map((w) => getWordText(w)).join(" ");
}
