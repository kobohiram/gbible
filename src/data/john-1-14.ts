import type { LexiconEntry, VerseWord } from "@/types";

/** ヨハネ1:14（MorphGNT / Robinson 略語）— 辞書・解説デモ用 */
export const john1Verse14Words: VerseWord[] = [
  { id: "john-1-14-w1", strongs: "G2532", greek: "καὶ", morph: "Conj", glossJa: "そして" },
  { id: "john-1-14-w2", strongs: "G3588", greek: "ὁ", morph: "RA-NSM", glossJa: "その" },
  {
    id: "john-1-14-w3",
    strongs: "G3056",
    greek: "λόγος",
    morph: "N-NSM",
    glossJa: "言葉",
  },
  {
    id: "john-1-14-w4",
    strongs: "G4561",
    greek: "σὰρξ",
    morph: "N-NSF",
    glossJa: "肉・肉体",
  },
  {
    id: "john-1-14-w5",
    strongs: "G1096",
    greek: "ἐγένετο",
    morph: "V-AMI-3S",
    glossJa: "〜となった",
  },
  { id: "john-1-14-w6", strongs: "G2532", greek: "καὶ", morph: "Conj", glossJa: "そして" },
  {
    id: "john-1-14-w7",
    strongs: "G4637",
    greek: "ἐσκήνωσεν",
    morph: "V-AAI-3S",
    glossJa: "幕屋した・宿営した",
  },
  {
    id: "john-1-14-w8",
    strongs: "G1722",
    greek: "ἐν",
    morph: "PREP",
    glossJa: "〜の中で",
  },
  {
    id: "john-1-14-w9",
    strongs: "G1473",
    greek: "ἡμῖν",
    morph: "RP-DP",
    glossJa: "私たちに",
  },
  { id: "john-1-14-w10", strongs: "G2532", greek: "καὶ", morph: "Conj", glossJa: "そして" },
  {
    id: "john-1-14-w11",
    strongs: "G2300",
    greek: "ἐθεασάμεθα",
    morph: "V-AMI-1P",
    glossJa: "私たちは見た",
  },
  { id: "john-1-14-w12", strongs: "G3588", greek: "τὴν", morph: "RA-ASF", glossJa: "その" },
  {
    id: "john-1-14-w13",
    strongs: "G1391",
    greek: "δόξαν",
    morph: "N-ASF",
    glossJa: "栄光",
  },
  {
    id: "john-1-14-w14",
    strongs: "G846",
    greek: "αὐτοῦ",
    morph: "RP-GSM",
    glossJa: "彼の",
  },
  {
    id: "john-1-14-w15",
    strongs: "G1391",
    greek: "δόξαν",
    morph: "N-ASF",
    glossJa: "栄光",
  },
  { id: "john-1-14-w16", strongs: "G5613", greek: "ὡς", morph: "Conj", glossJa: "〜のように" },
  {
    id: "john-1-14-w17",
    strongs: "G3439",
    greek: "μονογενοῦς",
    morph: "A-GSM",
    glossJa: "独り子の",
  },
  {
    id: "john-1-14-w18",
    strongs: "G3844",
    greek: "παρὰ",
    morph: "PREP",
    glossJa: "〜から（側から）",
  },
  {
    id: "john-1-14-w19",
    strongs: "G3962",
    greek: "πατρός",
    morph: "N-GSM",
    glossJa: "父",
  },
];

export const lexiconJohn114: Record<string, LexiconEntry> = {
  G3056: {
    strongs: "G3056",
    lemma: "λόγος",
    definitionJa:
      "言葉、話すこと、理性、計算、報告。旧約の「御言」や知恵伝統の「言」に連なり、ヨハネでは神の自己啓示そのものを指す。1:1では永遠の存在として描かれ、1:14ではその言葉が歴史の中に現れる主体として再登場する。単なる「発話」ではなく、神の性格・意志・創造と救いを表す人格的な臨在として読むのがこの福音書の特色である。",
    reviewed: true,
  },
  G4561: {
    strongs: "G4561",
    lemma: "σάρξ",
    definitionJa:
      "肉、肉体、血を通じた人間的存在。新約ではしばしば「属世性」「弱さ」「罪に結びついた人間性」の含意を帯びるが、ヨハネ1:14では中性の主格 σὰρξ が述語的名詞として機能し、「言葉が人間となった」という道成の核心を表す。霊的な存在だけでなく、触れられ、見られ、歴史の中で生きたり死んだりする実在としてのイエスを強調する語である。",
    reviewed: true,
  },
  G1096: {
    strongs: "G1096",
    lemma: "γίνομαι",
    definitionJa:
      "なる、生じる、起こる、〜の状態になる。存在動詞 εἰμί（〜である）とは異なり、変化・生成・到達を表す。1:14の ἐγένετο はアオリスト中動「〜となった」で、永遠の言葉が特定の時点で「肉」という状態に入ったことを示す。創世記の「〜有った」（γίνομαι / εἰμί 系）との響き合いも、新しい創造としてのインカネーションを暗示する読み方がある。",
    reviewed: true,
  },
  G4637: {
    strongs: "G4637",
    lemma: "σκηνόω",
    definitionJa:
      "幕屋に住む、天幕を張って宿営する。名詞 σκηνή（天幕・幕屋）は旧約の会見の天幕（שׁכּן）や住まわれることのイメージと結びつく。ヨハネは「言葉が私たちの中に幕屋した」と言い、神の臨在が人間の営みの中に「泊まった」ことを描く。単なる地理的居住ではなく、神が民と共に在る契約の臨在を想起させる、神学密度の高い動詞である。",
    reviewed: true,
  },
  G2300: {
    strongs: "G2300",
    lemma: "θεάομαι",
    definitionJa:
      "よく見る、眺める、観察する、（劇などを）見物する。単なる視覚より、注意深く「見定める」ニュアンスがある。1:14の ἐθεασάμεθα は第一人称複数アオリスト中動で、「私たち（使徒・共同体）はその栄光を目にした」という証言の形をとる。信仰の伝承は抽象的概念ではなく、歴史の中で実際に見た者たちからの証しとして語られる。",
    reviewed: true,
  },
  G1391: {
    strongs: "G1391",
    lemma: "δόξα",
    definitionJa:
      "栄光、誉れ、重み、輝き、名声。旧約の כָּבוֹד（神の临在を表す栄光）と呼応し、神の有する尊厳・輝き・現れそのものを指す。1:14では対格 δόξαν が目的語として二重に現れ、イエスの「見えた栄光」が独り子としての父からの栄光であることを強調する。外見の美しさではなく、父の本質が子に顕れているという方向で読む。",
    reviewed: true,
  },
  G3439: {
    strongs: "G3439",
    lemma: "μονογενής",
    definitionJa:
      "独り子の、唯一の、比類なき。μόνος（ただ一つの）と γένος（種類・族）から成る形容詞。ヨハネでは神の父から見た「唯一の」子、すなわち父と本質を共有しつつ歴史に遣わされた者を指す。1:14では属格 μονογενοῦς が ὡς（〜のように）と結び、見えた栄光が「独り子としての父からの栄光」に似ていることを説明する。",
    reviewed: true,
  },
  G3962: {
    strongs: "G3962",
    lemma: "πατήρ",
    definitionJa:
      "父、祖先、創始者。ヨハネ福音書では特に「天の父」「子イエスとの内的関係」を表す。1:14の παρὰ πατρός（父から／父の側から）は、栄光の起源が歴史的イエスそのものの内面ではなく、父との永遠の関係にあることを示す。子の使命・権威・栄光は父から授けられたものとして理解される。",
    reviewed: true,
  },
  G846: {
    strongs: "G846",
    lemma: "αὐτός",
    definitionJa:
      "彼／彼女／それ自身。人称代名詞。ここでは属格 αὐτοῦ が「言葉／子」のものとして機能し、直前の δόξαν（栄光）が誰のものかを特定する。ヨハネでは代名詞の指し示しが文脈依存であるため、1:1–18全体の「言葉＝子」の同一性を前提に読む必要がある。",
    reviewed: false,
  },
  G1473: {
    strongs: "G1473",
    lemma: "ἐγώ",
    definitionJa:
      "私、我々。与格 ἡμῖν は「私たちにとって／私たちの中で」を表し、神の臨在が人間共同体の内部に及ぶことを示す。1:14は抽象教義ではなく、語り手たちの実際の経験（見た、共にいた）として語られる。",
    reviewed: false,
  },
  G3844: {
    strongs: "G3844",
    lemma: "παρά",
    definitionJa:
      "〜のそばに、〜から、〜によって。ここでは属格 πατρός と結び「父から／父の側から」という起源・由来を表す。空間的「そば」から派生し、権威・関係・送り出しのニュアンスを帯びる。",
    reviewed: false,
  },
};
