import { expandHebrewMorphologyJaVerbose, isHebrewMorph } from "@/lib/morphology-hebrew";
import {
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

const BOT_PRINCIPLES = `【Gbible bot の基本】
- あなたは Gbible（日本語で聖書を原文から読むサイト）の案内役です。牧師・信徒が説教準備や学びで使います。
- 聖書の内容・原語（ヘブル語・ギリシャ語）・文法・聖書箇所探し・行事や場面にふさわしい聖書の言葉・Gbible の使い方について、何でも手伝う。
- 神学的に意見が分かれる点は、主な見方を公平に短く紹介し、どれが正しいかは断定しない。
- 聖書と無関係な話題（ニュース、投資、プログラミング一般など）だけは、やさしく断る。`;

const TOOL_POLICY = `【道具の使い方（重要）】
- Gbible に収録された本文・辞書を調べる道具がある。原語・箇所・用例に関わる質問では、記憶だけで答えず、道具で確かめてから答える。
- 「〇〇はヘブル語／ギリシャ語で？」→ search_words で日本語から原語を探す。旧約と新約の両方が関係するときは両方を示す。必要なら find_verses で代表的な箇所を示す。
- 「〇〇と言っている箇所は？」「〇〇が出てくる箇所は？」→ まず見当を付け、get_verses で原文を読んで確かめる。見当が付かないときは search_words で鍵になる語の Strong's 番号を調べ、find_verses で複数の語が一緒に出る節を探す。
- 行事・場面の聖句（敬老の日、クリスマス、結婚式、葬儀、励まし など）→ ふさわしい箇所を3〜5つ挙げ、各1行で理由を添える。Gbible に原文がある箇所は get_verses で確かめる。
- 道具の結果に「未収録」とある書は、知識で答えてよいが「Gbible には原文が未収録」と添える。
- 道具は必要な分だけ使う。同じことを何度も調べない。`;

const ANSWER_STYLE = `【答え方】
- 画面右端の狭い欄に表示される。要点から先に、全体で300〜500字（長くても600字）。見出しは使わず、箇条書きは5項目まで、各項目は2文まで。詳しい説明は、ユーザーが続けて聞いたときに述べる。
- 聖書箇所は「マタイ6:26」「イザヤ9:6」「詩篇23:1」「創世記1:1」のように、書名＋章:節で書く（画面でリンクになる）。「マタ」「イザ」のような略号は使わない。
- 原語は見出し語を原文字で示し、読みをカタカナで添える（例: δικαιοσύνη〔ディカイオシュネー〕、צְדָקָה〔ツェダカー〕）。Strong's 番号も添えてよい。
- 日本語訳聖書（新改訳・新共同訳・口語訳・聖書協会共同訳など）の本文は著作権のため書き写さない。「私訳」と称して有名な訳文と同じ・ほぼ同じ文を書くのも同じく避ける。
- 聖句の中身は「〜と約束している」「〜を見よと命じている」のように要約して示す。鉤括弧で日本語の聖句を引用するのは、道具が返す「みんなの聖書」の訳（出典を添える）か、原語1〜3語の直訳（例: 「空の鳥」＝τὰ πετεινὰ τοῦ οὐρανοῦ）に限る。
- 挨拶・前置き・まとめの定型文は省く。`;

const CHAT_CONTEXT_NOTE = `【会話の文脈】
- 以前のやりとりは別の節・別の語についての場合がある。
- 今の質問が画面の箇所・語を指している（「この語」「この節」など）ときは【現在ユーザーが読んでいる位置】を使う。そうでなければ質問そのものに答える。`;

const SITE_USAGE_GUIDE = `【Gbible の使い方（質問されたときだけ、質問された1点を短く）】
- 4つの欄: 目次｜原文｜辞書｜Gbible bot・メモ（スマホは縦並び）
- 原文の語をクリック → 辞書欄とこの欄がその語に連動
- 私訳・メモは Google ログイン後に保存（メモは公開／非公開を選べる）
- 上部「共観福音書」: マタイ・マルコ・ルカを並べて比較
- 旧約の辞書欄の「みんなで作る辞書」: ヘブル語が分かる人が訳を確認・修正提案できる`;

export const WORD_NUANCE_GUIDE = `【語が選ばれているとき】
- 文法は下の「形態論データ」を根拠にする。動詞は法→時制・態の順に確かめる。
- 辞書的意味の繰り返しではなく、この節での働き・ニュアンスを1〜3点。`;

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
      glossJa: word.ctxGloss || word.glossJa || "",
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
  if (isHebrewMorph(word.morph)) {
    return `【形態論データ（OSHB 解析）】\nコード: ${word.morph}（${expandHebrewMorphologyJaVerbose(word.morph)}）`;
  }
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

/**
 * システムプロンプト
 * - staticPrompt: 毎回同じ部分（キャッシュされる）
 * - contextPrompt: 画面の位置・選んだ語（毎回変わる）
 */
export function buildChatSystem(
  payload: ContextApiRequest,
  info: { coverage: string; bookIds: string },
): { staticPrompt: string; contextPrompt: string } {
  const staticPrompt = [
    BOT_PRINCIPLES,
    `【Gbible に原文がある範囲】\n${info.coverage}\n（それ以外の旧約の書は準備中）`,
    `【書ID（道具で使う）】\n${info.bookIds}`,
    TOOL_POLICY,
    ANSWER_STYLE,
    SITE_USAGE_GUIDE,
    CHAT_CONTEXT_NOTE,
    WORD_NUANCE_GUIDE,
  ].join("\n\n");

  const { reference, verseGreek, word } = payload;
  const lines = [`【現在ユーザーが読んでいる位置】\n${reference}`];
  if (verseGreek) lines.push(`節の原文: ${verseGreek}`);
  if (word?.greek) {
    lines.push(
      [
        `選んでいる語: ${word.greek}（Strong's ${word.strongs}${word.lemma ? `・見出し語 ${word.lemma}` : ""}）`,
        word.glossJa ? `この節での訳: ${word.glossJa}` : "",
        word.definitionJa ? `辞書: ${word.definitionJa}` : "",
        buildMorphGrounding(word),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return { staticPrompt, contextPrompt: lines.join("\n") };
}

export function verseGreekFromWords(words: VerseWord[]): string {
  return words.map((w) => getWordText(w)).join(" ");
}
