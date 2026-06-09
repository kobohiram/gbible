import type { LexiconEntry, VerseWord } from "@/types";

/** ヨハネ1:1（MorphGNT / Robinson 略語） */
export const john1Verse1Words: VerseWord[] = [
  {
    id: "john-1-1-w1",
    strongs: "G1722",
    greek: "Ἐν",
    morph: "PREP",
    glossJa: "〜において",
  },
  {
    id: "john-1-1-w2",
    strongs: "G746",
    greek: "ἀρχῇ",
    morph: "N-DSF",
    glossJa: "初めに",
  },
  {
    id: "john-1-1-w3",
    strongs: "G2258",
    greek: "ἦν",
    morph: "V-IIA-3S",
    glossJa: "あった",
  },
  {
    id: "john-1-1-w4",
    strongs: "G3588",
    greek: "ὁ",
    morph: "RA-NSM",
    glossJa: "その",
  },
  {
    id: "john-1-1-w5",
    strongs: "G3056",
    greek: "λόγος",
    morph: "N-NSM",
    glossJa: "言葉",
  },
  {
    id: "john-1-1-w6",
    strongs: "G2532",
    greek: "καὶ",
    morph: "Conj",
    glossJa: "そして",
  },
  {
    id: "john-1-1-w7",
    strongs: "G3588",
    greek: "ὁ",
    morph: "RA-NSM",
    glossJa: "その",
  },
  {
    id: "john-1-1-w8",
    strongs: "G3056",
    greek: "λόγος",
    morph: "N-NSM",
    glossJa: "言葉",
  },
  {
    id: "john-1-1-w9",
    strongs: "G2258",
    greek: "ἦν",
    morph: "V-IIA-3S",
    glossJa: "あった",
  },
  {
    id: "john-1-1-w10",
    strongs: "G4314",
    greek: "πρὸς",
    morph: "PREP",
    glossJa: "〜に向かって",
  },
  {
    id: "john-1-1-w11",
    strongs: "G3588",
    greek: "τὸν",
    morph: "RA-ASM",
    glossJa: "その",
  },
  {
    id: "john-1-1-w12",
    strongs: "G2316",
    greek: "θεόν",
    morph: "N-ASM",
    glossJa: "神",
  },
  {
    id: "john-1-1-w13",
    strongs: "G2532",
    greek: "καὶ",
    morph: "Conj",
    glossJa: "そして",
  },
  {
    id: "john-1-1-w14",
    strongs: "G2316",
    greek: "θεὸς",
    morph: "N-NSM",
    glossJa: "神",
  },
  {
    id: "john-1-1-w15",
    strongs: "G2258",
    greek: "ἦν",
    morph: "V-IIA-3S",
    glossJa: "あった",
  },
  {
    id: "john-1-1-w16",
    strongs: "G3588",
    greek: "ὁ",
    morph: "RA-NSM",
    glossJa: "その",
  },
  {
    id: "john-1-1-w17",
    strongs: "G3056",
    greek: "λόγος",
    morph: "N-NSM",
    glossJa: "言葉",
  },
];

export const lexiconSamples: Record<string, LexiconEntry> = {
  G3056: {
    strongs: "G3056",
    lemma: "λόγος",
    definitionJa:
      "言葉、話すこと、宣言。哲学・聖書の文脈では「御言葉」「理性」をも表す。ヨハネ福音書では神の自己啓示としての「言葉」を指す。",
    reviewed: true,
  },
  G2316: {
    strongs: "G2316",
    lemma: "θεός",
    definitionJa:
      "神。唯一神を指す場合と、異教の神々を指す場合がある。ここでは唯一の創造主・救いの神を意味する。",
    reviewed: true,
  },
  G746: {
    strongs: "G746",
    lemma: "ἀρχή",
    definitionJa: "始まり、初め、起源。時間の起点または根本的原理を表す。",
    reviewed: false,
  },
  G2258: {
    strongs: "G2258",
    lemma: "εἰμί",
    definitionJa:
      "〜である（存在動詞）。未完了過去形は継続的・状態的な存在を表す。「あった」「存在していた」。",
    reviewed: false,
  },
};
