import {
  expandMorphologyJa,
  expandMorphologyJaVerbose,
  explainNounMorphologyJa,
  explainVerbMorphologyJa,
} from "@/lib/morphology";
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

const GBIBLE_BOT_GRAMMAR = `【Gbible bot の3原則（必ず守る）】
1. 形態論タグ（MorphGNT / Gbible 解析）に忠実に答える。タグと矛盾する一般論は述べない
2. 断定を避ける。解釈は「〜かもしれません」「〜とも考えられます」の形にする
3. 節の範囲にとどめる。他の節・書全体・神学論争には踏み込まない

【解説の進め方】
- 動詞は「法」（直説法・命令法・接続法など）を先に確認してから時制・態を説明する
- 下記「形態論データ」が最優先の根拠。辞書的意味の繰り返しや日本語訳の言い換えだけで終わらない
- 構文・慣用表現はこの節の中で確認できる範囲で触れる
- 初学者向けに文法用語にはやさしい補足を添える`;

const MOOD_TENSE_RULES = `【法と時制の基本（よくある誤りを避ける）】
- 命令法アオリスト（例: ἑτοιμάσατε）: 過去の事実ではない。「一度／全体として〜せよ」。現在命令との対比が重要
- 命令法現在: 「継続的・習慣的に〜せよ」の含意がありうる
- 直説法アオリスト: 叙事の基本。点過去・完結・単純過去の事実（文脈で開始・全体・結果のニュアンス）
- 直説法未完了: 過去の継続・反復・背景
- 直説法現在: 現在の状態・習慣、叙事文では歴史的現在の可能性も`;

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
- 4ペイン: 目次｜原文｜辞書｜Gbible bot・メモ（スマホは縦並び）
- 原文の語をクリック → 辞書と Gbible bot がその語に連動
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
- 上記の質問には、やさしく次のように断る:「申し訳ありません。Gbible bot は聖書の原文と文法、および Gbible の使い方についてお手伝いします。それ以外のご相談にはお答えできません。」`;

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

function buildMorphGrounding(word: ContextWordInfo): string {
  const verb = explainVerbMorphologyJa(word.morph, {
    greek: word.greek,
    lemma: word.lemma,
    strongs: word.strongs,
  });

  if (verb) {
    const lines = [
      "【形態論データ（Gbible 解析・辞書ペインと同じ）】",
      `コード: ${word.morph}（${expandMorphologyJaVerbose(word.morph)}）`,
      `時制: ${verb.tense.label} — ${verb.tense.detail}`,
      `法: ${verb.mood.label} — ${verb.mood.detail}`,
      `態: ${verb.voice.label} — ${verb.voice.detail}`,
    ];
    if (verb.personNumber.label) {
      lines.push(`人称・数: ${verb.personNumber.label}`);
    }
    if (verb.participleForm?.label) {
      lines.push(`分詞の格・性・数: ${verb.participleForm.label}`);
    }
    for (const note of verb.notes) {
      lines.push(`補足: ${note}`);
    }
    return lines.join("\n");
  }

  const noun = explainNounMorphologyJa(word.morph);
  if (noun) {
    const lines = [
      "【形態論データ（Gbible 解析・辞書ペインと同じ）】",
      `コード: ${word.morph}（${expandMorphologyJaVerbose(word.morph)}）`,
      `品詞: ${noun.pos.label} — ${noun.pos.detail}`,
      `格: ${noun.grammaticalCase.label} — ${noun.grammaticalCase.detail}`,
      `性・数: ${noun.gender.label}・${noun.number.label}`,
    ];
    for (const note of noun.notes) {
      lines.push(`補足: ${note}`);
    }
    return lines.join("\n");
  }

  return `【形態論データ】\nコード: ${word.morph}（${expandMorphologyJaVerbose(word.morph)}）`;
}

export function buildContextSystemPrompt(payload: ContextApiRequest): string {
  const { reference, verseGreek, word } = payload;
  const corpus = payload.corpus ?? "nt";
  const lang = corpus === "ot" ? "ヘブル語" : "コイネー（聖書）ギリシャ語";

  if (!word?.greek) {
    return `あなたは Gbible bot です。Gbible（ギリシャ語・ヘブル語聖書原文学習サイト）で、ユーザーが文法、語彙、サイトの使い方について質問したとき、やさしく案内します。

【現在ユーザーが読んでいる位置】
${reference}
${verseGreek ? `節の原文: ${verseGreek}` : ""}

原文の語をクリックすると、その語について文法・ニュアンスの質問ができるようになります。語が未選択のときは、語彙・使い方・学習の進め方を案内してください。

${GBIBLE_BOT_GRAMMAR}

${MOOD_TENSE_RULES}

${SITE_USAGE_GUIDE}

${VOCAB_TRANSLATION_GUIDE}

${OFF_TOPIC_POLICY}

${COMPACT_STYLE}`;
  }

  const morphJa = expandMorphologyJa(word.morph);
  const isVerb = /^V-/.test(word.morph);
  const morphGrounding = buildMorphGrounding(word);

  return `あなたは Gbible bot です。${lang}聖書の文法に基づいて、初学者に丁寧に解説します。サイトの使い方について聞かれた場合も案内できます。

【固定コンテキスト】
節: ${reference}
節全体: ${verseGreek}
注目語: ${word.greek}
Strong's: ${word.strongs}
${word.lemma ? `見出し語: ${word.lemma}` : ""}
基本意味: ${word.glossJa}
文法: ${word.morph}（${morphJa}）
${word.definitionJa ? `辞書: ${word.definitionJa}` : ""}

${morphGrounding}

${GBIBLE_BOT_GRAMMAR}

${MOOD_TENSE_RULES}

【この語の解説で優先すること（要点を絞る）】
1. ${isVerb ? "動詞の時制・法・態がこの節で持つニュアンス" : "格・語形の文法的働き"}
2. 構文・慣用句があれば1点
3. 日本語訳だけでは伝わりにくいニュアンスがあれば1点

【避けること】
- 辞書的な意味の繰り返しだけ
- 日本語訳の言い換えだけ
- 節の範囲を超えた長い解説

${SITE_USAGE_GUIDE}

${VOCAB_TRANSLATION_GUIDE}

${OFF_TOPIC_POLICY}

${COMPACT_STYLE}`;
}

export function buildContextPrompt(payload: ContextApiRequest): string {
  const lang = (payload.corpus ?? "nt") === "ot" ? "ヘブル語" : "聖書ギリシャ語";
  if (!payload.word) {
    return `この節について、${lang}の文法から、初学者向けに要点だけ解説してください。`;
  }
  const isVerb = /^V-/.test(payload.word.morph);
  return `この節におけるこの語について、${lang}の文法から2〜3文（または箇条書き2〜3行）で要点だけ解説してください。${isVerb ? "まず法（命令法か直説法か等）を確認し、そのうえで時制のニュアンスを述べてください。" : "構文・慣用句があれば、"}初学者向けに丁寧に。断定と神学論争は避けてください。`;
}

export function verseGreekFromWords(words: VerseWord[]): string {
  return words.map((w) => getWordText(w)).join(" ");
}
