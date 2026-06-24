import { expandMorphologyJa } from "@/lib/morphology";
import { getWordText } from "@/lib/verse-text";
import type { CorpusId, LexiconEntry, VerseWord } from "@/types";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ContextWordInfo = {
  id: string;
  greek: string;
  glossJa: string;
  morph: string;
  strongs: string;
  lemma?: string;
  definitionJa?: string;
};

export type ContextApiRequest = {
  reference: string;
  verseGreek: string;
  corpus?: CorpusId;
  word?: ContextWordInfo;
  messages?: ChatMessage[];
};

export const WORD_NUANCE_REQUEST =
  "この語のニュアンスを、要点だけ短く解説してください。";

const COMPACT_STYLE = `【表示形式（必ず守る）】
- 回答は画面右端の狭いペイン用。全体で150〜250字を目安（長くても350字以内）
- 初回は要点だけ。詳細はユーザーが追加で聞いたときだけ述べる
- 見出し（###）は最大1つ。箇条書きは2〜4項目まで、各1行以内
- 挨拶・前置き・おまとめ・「他にも〜」は省く
- **太字** は1回答あたり2〜3か所まで`;

const SITE_USAGE_GUIDE = `【Gbible の使い方（質問されたときだけ、短く答える）】
パソコンやスマホに不慣れな方にも分かる、やさしい日本語で案内する。専門用語は避け、代わりに言葉を添える。

重要: 使い方を聞かれたら、質問された1点だけ答える。画面構成の一覧や全手順を一度に並べない。

参考情報（必要な部分だけ抜き出して使う）:
- 4ペイン: 目次｜原文｜辞書｜文法ポイント・メモ（スマホは縦並び）
- 原文の語をクリック → 辞書と文法ポイントがその語に連動
- メモは Google ログイン後に自動保存（公開／非公開可）
- 上部「共観福音書」: マタイ・マルコ・ルカ並列表示
- 上部バックアップ: 私訳・メモのエクスポート／インポート
- API キーは通常不要（サイト提供）。独自キーを使う場合のみブラウザに保存`;

const VOCAB_TRANSLATION_GUIDE = `【語彙・訳語の質問（聖書原文に関するもの）】
- 「○○はギリシャ語で？」「愛の原語は？」「この日本語は原文で何？」など、日本語↔ギリシャ語（旧約ならヘブル語）の語彙・訳語質問に短く答える
- 見出し語（lemma）と基本意味を示す。候補が複数あれば最も一般的な1〜2語だけ
- 文脈上の訳語の違いを聞かれたら、選ばれている語との関係だけ1行で触れる`;

const OFF_TOPIC_POLICY = `【答えないこと】
- 人生相談・悩み相談・メンタルヘルス・人間関係・キャリアの相談
- 聖書の原文・文法・語学、および Gbible の使い方と無関係な話題（天気、ニュース、料理、投資、プログラミング一般など）
- 上記の質問には、やさしく次のように断る:「申し訳ありません。私は聖書の原文と文法、および Gbible の使い方についてお手伝いする助手です。それ以外のご相談にはお答えできません。原文や文法、サイトの操作でお困りのことがあれば、お気軽にどうぞ。」`;

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

export function buildBaseContextRequest(
  reference: string,
  verseWords: VerseWord[],
  corpus: CorpusId = "nt",
): ContextApiRequest {
  return {
    reference,
    verseGreek: verseGreekFromWords(verseWords),
    corpus,
  };
}

export function buildContextSystemPrompt(payload: ContextApiRequest): string {
  const { reference, verseGreek, word } = payload;
  const corpus = payload.corpus ?? "nt";
  const lang = corpus === "ot" ? "ヘブル語" : "コイネー（聖書）ギリシャ語";

  if (!word?.greek) {
    return `あなたは Gbible（ギリシャ語・ヘブル語聖書原文学習サイト）の文法・語彙助手です。ユーザーが文法、語彙、サイトの使い方について質問したとき、やさしく案内します。

【現在ユーザーが読んでいる位置】
${reference}
${verseGreek ? `節の原文: ${verseGreek}` : ""}

原文の語をクリックすると、その語について文法・ニュアンスの質問ができるようになります。語が未選択のときは、語彙・使い方・学習の進め方を案内してください。

${SITE_USAGE_GUIDE}

${VOCAB_TRANSLATION_GUIDE}

${OFF_TOPIC_POLICY}

${COMPACT_STYLE}`;
  }

  const morphJa = expandMorphologyJa(word.morph);
  const isVerb = /^V-/.test(word.morph);

  return `あなたは${lang}聖書の文法・解釈に詳しい助手です。ユーザーと${lang}の語句について対話します。サイトの使い方について聞かれた場合も案内できます。

【固定コンテキスト】
節: ${reference}
節全体: ${verseGreek}
注目語: ${word.greek}
Strong's: ${word.strongs}
${word.lemma ? `見出し語: ${word.lemma}` : ""}
基本意味: ${word.glossJa}
文法: ${word.morph}（${morphJa}）
${word.definitionJa ? `辞書: ${word.definitionJa}` : ""}

【解説で最も大事にすること（要点を絞る）】
1. この節での文法上のポイント1〜2点（${isVerb ? "動詞なら時制・法・態を優先" : "格・語形の働きを優先"}）
2. 日本語訳だけでは伝わりにくいニュアンスがあれば1点
3. 構文・慣用句は本当に重要な場合だけ1行で触れる

【避けること】
- 辞書的な意味の繰り返し
- 日本語訳の言い換えだけ
- 神学の論争（救恩論・予定論など）への踏み込み
- 断定表現（「〜である」「必ず〜」）
- 節の範囲を超えた長い解説

${SITE_USAGE_GUIDE}

${VOCAB_TRANSLATION_GUIDE}

${OFF_TOPIC_POLICY}

${COMPACT_STYLE}

【文体】
- 文法的事実は簡潔に。解釈は「〜かもしれません」形式
- 初学者向けの正確な日本語`;
}

export function buildContextPrompt(payload: ContextApiRequest): string {
  if (!payload.word) {
    return "この節について、初学者向けに解説してください。";
  }
  const isVerb = /^V-/.test(payload.word.morph);
  return `この節におけるこの語について、2〜3文（または箇条書き2〜3行）で要点だけ解説してください。${isVerb ? "動詞の時制・法・態を最優先で、" : ""}日本語訳では分かりにくい点があれば1点だけ。神学の断定は避けてください。`;
}

export function verseGreekFromWords(words: VerseWord[]): string {
  return words.map((w) => getWordText(w)).join(" ");
}
