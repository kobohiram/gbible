/**
 * アルファベット読み方クイズ（学問的発音＝エラスムス式）
 *
 * 単語クイズと同じ出題部品（VocabQuizPlayer）で使えるよう、同じ形のデータを作る。
 * 読み方はカタカナ＋ローマ字で示し、カタカナでは同じになる音（τ と θ、κ と χ、λ と ρ）も区別する。
 * 間違いの選択肢には、日本語の当て字の表や現代ギリシャ語読みでよく起こる読み違いを入れている。
 */
import type { VocabQuizDataset, VocabQuizGroup, VocabQuizWord } from "@/types/vocab-quiz";

type Letter = {
  lower: string;
  upper: string;
  name: string;
  roman: string;
  kana: string;
  note: string;
  /** 形や音が似ていて取り違えやすい文字 */
  confusable: [string, string, string];
};

const LETTERS: Letter[] = [
  { lower: "α", upper: "Α", name: "アルファ", roman: "a", kana: "ア", note: "日本語の「ア」。長く読むこともある。", confusable: ["ε", "ο", "λ"] },
  { lower: "β", upper: "Β", name: "ベータ", roman: "b", kana: "ブ（バ行）", note: "英語の b。現代ギリシャ語では v（ヴ）になるが、学問的発音では b。", confusable: ["φ", "π", "δ"] },
  { lower: "γ", upper: "Γ", name: "ガンマ", roman: "g", kana: "グ（ガ行）", note: "英語の g。形は y に似ているが音は g。γγ・γκ・γχ では「ン」の音になる。", confusable: ["ν", "υ", "κ"] },
  { lower: "δ", upper: "Δ", name: "デルタ", roman: "d", kana: "ド（ダ行）", note: "英語の d。δι は「ジ」ではなく「ディ」。", confusable: ["θ", "σ", "β"] },
  { lower: "ε", upper: "Ε", name: "エプシロン", roman: "e", kana: "エ（短い）", note: "短い「エ」。長い「エー」は η。", confusable: ["η", "ι", "α"] },
  { lower: "ζ", upper: "Ζ", name: "ゼータ", roman: "z", kana: "ズ（ザ行）", note: "dz に近い音。ζωή（ゾーエー）の ζ。形の似た ξ（クシー）と区別する。", confusable: ["ξ", "σ", "δ"] },
  { lower: "η", upper: "Η", name: "エータ", roman: "ē", kana: "エー（長い）", note: "長い「エー」。形は n に似ているが母音。現代ギリシャ語では「イー」になる。", confusable: ["ν", "ε", "ω"] },
  { lower: "θ", upper: "Θ", name: "テータ", roman: "th", kana: "ト（息を強く）", note: "t に強い息を添えた音。カタカナでは τ（タウ）と同じタ行になるので、th と覚える。", confusable: ["τ", "φ", "δ"] },
  { lower: "ι", upper: "Ι", name: "イオータ", roman: "i", kana: "イ", note: "日本語の「イ」。点のない i の形。", confusable: ["υ", "λ", "η"] },
  { lower: "κ", upper: "Κ", name: "カッパ", roman: "k", kana: "ク（カ行）", note: "英語の k。息を強く出す χ（キー）と区別する。", confusable: ["χ", "γ", "ξ"] },
  { lower: "λ", upper: "Λ", name: "ラムダ", roman: "l", kana: "ル（ラ行）", note: "英語の l。ρ（ロー）も同じラ行になるので、l と r で区別する。", confusable: ["ρ", "ν", "α"] },
  { lower: "μ", upper: "Μ", name: "ミュー", roman: "m", kana: "ム（マ行）", note: "英語の m。形は u に似ているが子音。", confusable: ["ν", "υ", "π"] },
  { lower: "ν", upper: "Ν", name: "ニュー", roman: "n", kana: "ヌ（ナ行）", note: "英語の n。形は v に似ているが音は n。υ（ユプシロン）と取り違えやすい。", confusable: ["υ", "γ", "μ"] },
  { lower: "ξ", upper: "Ξ", name: "クシー", roman: "x", kana: "クス", note: "ks の2音を1文字で書く。δόξα は「ドクサ」。", confusable: ["ζ", "χ", "ψ"] },
  { lower: "ο", upper: "Ο", name: "オミクロン", roman: "o", kana: "オ（短い）", note: "短い「オ」。長い「オー」は ω。", confusable: ["ω", "α", "σ"] },
  { lower: "π", upper: "Π", name: "ピー", roman: "p", kana: "プ（パ行）", note: "英語の p。形は n に似ているが音は p。", confusable: ["φ", "β", "τ"] },
  { lower: "ρ", upper: "Ρ", name: "ロー", roman: "r", kana: "ル（ラ行）", note: "巻き舌の r。形は p に似ているが音は r。語頭では ῥ（rh）と書く。", confusable: ["λ", "π", "φ"] },
  { lower: "σ", upper: "Σ", name: "シグマ", roman: "s", kana: "ス（サ行）", note: "英語の s。語末では ς と書く。σι は「シ」。", confusable: ["ζ", "ο", "ξ"] },
  { lower: "τ", upper: "Τ", name: "タウ", roman: "t", kana: "ト（タ行）", note: "英語の t。τι は「チ」ではなく「ティ」、τυ は「ツ」ではなく「テュ」。", confusable: ["θ", "δ", "ι"] },
  { lower: "υ", upper: "Υ", name: "ユプシロン", roman: "y", kana: "ユ（ü）", note: "唇を丸めて「イ」と言う ü の音。カタカナでは「ユ」。κυ は「ク」ではなく「キュ」。", confusable: ["ν", "ι", "μ"] },
  { lower: "φ", upper: "Φ", name: "フィー", roman: "ph", kana: "フ（ファ行）", note: "p に強い息を添えた音。日本ではファ行で読む。", confusable: ["π", "θ", "ψ"] },
  { lower: "χ", upper: "Χ", name: "キー", roman: "kh", kana: "ク（息を強く）", note: "k に強い息を添えた音。形は x に似ている。カタカナでは κ と同じカ行になるので、kh と覚える。", confusable: ["κ", "ξ", "γ"] },
  { lower: "ψ", upper: "Ψ", name: "プシー", roman: "ps", kana: "プス", note: "ps の2音を1文字で書く。ψυχή は「プシュケー」。", confusable: ["φ", "ξ", "υ"] },
  { lower: "ω", upper: "Ω", name: "オメガ", roman: "ō", kana: "オー（長い）", note: "長い「オー」。形は w に似ているが母音。", confusable: ["ο", "η", "μ"] },
];

const BY_LOWER = new Map(LETTERS.map((l) => [l.lower, l]));

function letterAnswer(l: Letter): string {
  return `${l.name}（${l.roman}）`;
}

// ---------------------------------------------------------------------------
// 音節（子音＋母音）のカタカナ

const VOWELS = ["α", "ε", "η", "ι", "ο", "υ", "ω"] as const;
type Vowel = (typeof VOWELS)[number];
const VOWEL_ROMAN: Record<Vowel, string> = { α: "a", ε: "e", η: "ē", ι: "i", ο: "o", υ: "y", ω: "ō" };

/** 子音ごとのカタカナ（α ε η ι ο υ ω の順） */
const SYLLABLE_KANA: Record<string, string[]> = {
  κ: ["カ", "ケ", "ケー", "キ", "コ", "キュ", "コー"],
  γ: ["ガ", "ゲ", "ゲー", "ギ", "ゴ", "ギュ", "ゴー"],
  χ: ["カ", "ケ", "ケー", "キ", "コ", "キュ", "コー"],
  τ: ["タ", "テ", "テー", "ティ", "ト", "テュ", "トー"],
  δ: ["ダ", "デ", "デー", "ディ", "ド", "デュ", "ドー"],
  θ: ["タ", "テ", "テー", "ティ", "ト", "テュ", "トー"],
  π: ["パ", "ペ", "ペー", "ピ", "ポ", "ピュ", "ポー"],
  β: ["バ", "ベ", "ベー", "ビ", "ボ", "ビュ", "ボー"],
  φ: ["ファ", "フェ", "フェー", "フィ", "フォ", "フュ", "フォー"],
  λ: ["ラ", "レ", "レー", "リ", "ロ", "リュ", "ロー"],
  ρ: ["ラ", "レ", "レー", "リ", "ロ", "リュ", "ロー"],
  μ: ["マ", "メ", "メー", "ミ", "モ", "ミュ", "モー"],
  ν: ["ナ", "ネ", "ネー", "ニ", "ノ", "ニュ", "ノー"],
  σ: ["サ", "セ", "セー", "シ", "ソ", "シュ", "ソー"],
  ζ: ["ザ", "ゼ", "ゼー", "ズィ", "ゾ", "ズュ", "ゾー"],
  ξ: ["クサ", "クセ", "クセー", "クシ", "クソ", "クシュ", "クソー"],
  ψ: ["プサ", "プセ", "プセー", "プシ", "プソ", "プシュ", "プソー"],
};

/** 取り違えやすい子音 */
const CONSONANT_GROUPS = [["κ", "γ", "χ"], ["τ", "δ", "θ"], ["π", "β", "φ"], ["λ", "ρ"], ["σ", "ζ", "ξ", "ψ"], ["μ", "ν"]];
/** 取り違えやすい母音（長短・形） */
const VOWEL_CONFUSION: Record<Vowel, Vowel[]> = {
  α: ["ο", "ε"], ε: ["η", "ι"], η: ["ε", "ι"], ι: ["υ", "η"], ο: ["ω", "α"], υ: ["ι", "ο"], ω: ["ο", "η"],
};
/** 日本語の当て字の表・現代ギリシャ語読みで起こりやすい読み違い */
const COMMON_MISREADINGS: Record<string, string> = {
  τι: "チ〔chi〕", τυ: "ツ〔tsu〕", δι: "ジ〔ji〕", δυ: "ドゥ〔du〕", κυ: "ク〔ku〕", συ: "ス〔su〕",
  νυ: "ヌ〔nu〕", λυ: "ル〔lu〕", πυ: "プ〔pu〕", θε: "セ〔se〕", βα: "ヴァ〔va〕", μη: "ミー〔mī〕",
  βη: "ヴィー〔vī〕", φω: "ポ〔po〕", ψυ: "プス〔psu〕", ζω: "ゾ〔zo〕",
};

function syllable(c: string, v: Vowel): string {
  const i = VOWELS.indexOf(v);
  return `${SYLLABLE_KANA[c][i]}〔${BY_LOWER.get(c)!.roman}${VOWEL_ROMAN[v]}〕`;
}

function syllableDistractors(c: string, v: Vowel): string[] {
  const answer = syllable(c, v);
  const out: string[] = [];
  const add = (s: string) => {
    if (s !== answer && !out.includes(s)) out.push(s);
  };
  const misreading = COMMON_MISREADINGS[c + v];
  if (misreading) add(misreading);
  const group = CONSONANT_GROUPS.find((g) => g.includes(c)) ?? [];
  for (const other of group) if (other !== c && out.length < 2) add(syllable(other, v));
  for (const ov of VOWEL_CONFUSION[v]) if (out.length < 3) add(syllable(c, ov));
  return out.slice(0, 3);
}

function syllableNote(c: string, v: Vowel): string {
  const cl = BY_LOWER.get(c)!;
  const vl = BY_LOWER.get(v)!;
  return `${c}（${cl.name}）は ${cl.roman}、${v}（${vl.name}）は ${vl.kana}。${cl.note}`;
}

// ---------------------------------------------------------------------------
// 問題データ

type Item = { greek: string; answer: string; distractors: string[]; kaisetsu: string; hint: string };

const UNIT_LETTERS: Item[] = [
  ...LETTERS.map((l) => ({
    greek: l.lower,
    answer: letterAnswer(l),
    distractors: l.confusable.map((c) => letterAnswer(BY_LOWER.get(c)!)),
    kaisetsu: `${l.upper} ${l.lower}（${l.name}）: ${l.kana}。${l.note}`,
    hint: "この文字の名前と音は？",
  })),
  {
    greek: "ς",
    answer: letterAnswer(BY_LOWER.get("σ")!),
    distractors: ["ζ", "ξ", "ο"].map((c) => letterAnswer(BY_LOWER.get(c)!)),
    kaisetsu: "ς は σ（シグマ）を単語の最後で書くときの形。λόγος の最後の文字。",
    hint: "単語の最後に出てくる文字",
  },
  ...["Γ", "Δ", "Λ", "Σ", "Ω"].map((u) => {
    const l = LETTERS.find((x) => x.upper === u)!;
    return {
      greek: u,
      answer: letterAnswer(l),
      distractors: l.confusable.map((c) => letterAnswer(BY_LOWER.get(c)!)),
      kaisetsu: `大文字 ${u} は小文字の ${l.lower}（${l.name}）。${l.note}`,
      hint: "大文字の名前と音は？",
    };
  }),
];

// ---------------------------------------------------------------------------
// 50音（子音1文字＋ α ι υ ε ο を、日本語の50音の順に出す）

/** 50音の母音の順（あ い う え お） */
const GOJUON_VOWELS: Vowel[] = ["α", "ι", "υ", "ε", "ο"];

type GojuonRow = { label: string; items: Item[] };

function consonantRow(label: string, c: string): GojuonRow {
  return {
    label,
    items: GOJUON_VOWELS.map((v) => ({
      greek: c + v,
      answer: syllable(c, v),
      distractors: syllableDistractors(c, v),
      kaisetsu: syllableNote(c, v),
      hint: `50音: ${label}`,
    })),
  };
}

const VOWEL_ROW: GojuonRow = {
  label: "あ行",
  items: [
    { greek: "α", answer: "ア〔a〕", distractors: ["エ〔e〕", "オ〔o〕", "イ〔i〕"], kaisetsu: "α（アルファ）は「ア」。", hint: "50音: あ行" },
    { greek: "ι", answer: "イ〔i〕", distractors: ["エ〔e〕", "ユ〔y〕", "ウ〔u〕"], kaisetsu: "ι（イオータ）は「イ」。", hint: "50音: あ行" },
    { greek: "υ", answer: "ユ〔y〕", distractors: ["ウ〔u〕", "イ〔i〕", "オ〔o〕"], kaisetsu: "υ（ユプシロン）は日本語の「う」の位置に来るが、読みは「ウ」ではなく「ユ」（唇を丸めた ü）。「ウー」の音は ου と書く。", hint: "50音: あ行" },
    { greek: "ε", answer: "エ〔e〕", distractors: ["エー〔ē〕", "イ〔i〕", "ア〔a〕"], kaisetsu: "ε（エプシロン）は短い「エ」。長い「エー」は η。", hint: "50音: あ行" },
    { greek: "ο", answer: "オ〔o〕", distractors: ["オー〔ō〕", "ア〔a〕", "ウ〔u〕"], kaisetsu: "ο（オミクロン）は短い「オ」。長い「オー」は ω。", hint: "50音: あ行" },
  ],
};

const BREATHING_NOTE = "母音の上の ῾（強い気息記号）は h の音を加える。ギリシャ語には h の文字がないので、は行はこの記号で書く。";

const H_ROW: GojuonRow = {
  label: "は行",
  items: [
    { greek: "ἁ", answer: "ハ〔ha〕", distractors: ["ア〔a〕", "カ〔ka〕", "ハー〔hā〕"], kaisetsu: `${BREATHING_NOTE}ἁμαρτία（ハマルティア）の ἁ。`, hint: "50音: は行" },
    { greek: "ἱ", answer: "ヒ〔hi〕", distractors: ["イ〔i〕", "キ〔ki〕", "シ〔si〕"], kaisetsu: `${BREATHING_NOTE}ἱερόν（ヒエロン、神殿）の ἱ。`, hint: "50音: は行" },
    { greek: "ὑ", answer: "ヒュ〔hy〕", distractors: ["ユ〔y〕", "フ〔hu〕", "ウ〔u〕"], kaisetsu: `${BREATHING_NOTE}語頭の υ にはいつも ῾ が付き「ヒュ」。ὕδωρ（ヒュドール、水）。`, hint: "50音: は行" },
    { greek: "ἑ", answer: "ヘ〔he〕", distractors: ["エ〔e〕", "ケ〔ke〕", "ヘー〔hē〕"], kaisetsu: `${BREATHING_NOTE}ἑπτά（ヘプタ、7）の ἑ。`, hint: "50音: は行" },
    { greek: "ὁ", answer: "ホ〔ho〕", distractors: ["オ〔o〕", "コ〔ko〕", "ホー〔hō〕"], kaisetsu: `${BREATHING_NOTE}冠詞 ὁ（ホ）。`, hint: "50音: は行" },
  ],
};

const GOJUON_ROWS: GojuonRow[] = [
  VOWEL_ROW,
  consonantRow("か行", "κ"),
  consonantRow("さ行", "σ"),
  consonantRow("た行", "τ"),
  consonantRow("な行", "ν"),
  H_ROW,
  consonantRow("ま行", "μ"),
  consonantRow("ら行（λ）", "λ"),
  consonantRow("ら行（ρ）", "ρ"),
  consonantRow("が行", "γ"),
  consonantRow("ざ行", "ζ"),
  consonantRow("だ行", "δ"),
  consonantRow("ば行", "β"),
  consonantRow("ぱ行", "π"),
  consonantRow("か行（息を強く χ）", "χ"),
  consonantRow("た行（息を強く θ）", "θ"),
  consonantRow("ふぁ行（φ）", "φ"),
  consonantRow("くさ行（ξ）", "ξ"),
  consonantRow("ぷさ行（ψ）", "ψ"),
];

const UNIT_GOJUON: Item[] = GOJUON_ROWS.flatMap((r) => r.items);

const UNIT_SPECIAL: Item[] = [
  { greek: "αι", answer: "アイ〔ai〕", distractors: ["エ〔e〕", "アー〔ā〕", "エイ〔ei〕"], kaisetsu: "二重母音 αι は「アイ」。現代ギリシャ語では「エ」になる。", hint: "二重母音の読みは？" },
  { greek: "ει", answer: "エイ〔ei〕", distractors: ["イー〔ī〕", "エー〔ē〕", "アイ〔ai〕"], kaisetsu: "二重母音 ει は「エイ」。εἰρήνη（エイレーネー）の ει。", hint: "二重母音の読みは？" },
  { greek: "οι", answer: "オイ〔oi〕", distractors: ["イー〔ī〕", "オー〔ō〕", "ウイ〔ui〕"], kaisetsu: "二重母音 οι は「オイ」。現代ギリシャ語では「イー」になる。", hint: "二重母音の読みは？" },
  { greek: "υι", answer: "ユイ〔yi〕", distractors: ["イー〔ī〕", "ウイ〔ui〕", "ユー〔ȳ〕"], kaisetsu: "二重母音 υι は「ユイ」。υἱός（ヒュイオス、子）の υι。", hint: "二重母音の読みは？" },
  { greek: "αυ", answer: "アウ〔au〕", distractors: ["アヴ〔av〕", "アー〔ā〕", "オー〔ō〕"], kaisetsu: "二重母音 αυ は「アウ」。現代ギリシャ語では「アヴ／アフ」になる。", hint: "二重母音の読みは？" },
  { greek: "ευ", answer: "エウ〔eu〕", distractors: ["エヴ〔ev〕", "ウー〔ū〕", "エー〔ē〕"], kaisetsu: "二重母音 ευ は「エウ」（πνεῦμα プネウマ）。日本では「ユー」と読む慣習もある（εὐαγγέλιον ユーアンゲリオン）。", hint: "二重母音の読みは？" },
  { greek: "ου", answer: "ウー〔ū〕", distractors: ["オウ〔ou〕", "オー〔ō〕", "ユー〔ȳ〕"], kaisetsu: "二重母音 ου は長い「ウー」。οὐρανός（ウーラノス、天）の ου。", hint: "二重母音の読みは？" },
  { greek: "ηυ", answer: "エーウ〔ēu〕", distractors: ["イーヴ〔īv〕", "エウ〔eu〕", "ユー〔ȳ〕"], kaisetsu: "ηυ は長い「エー」に「ウ」が続く。ηὗρον（エーウロン、見つけた）など。", hint: "二重母音の読みは？" },
  { greek: "ἁ", answer: "ハ〔ha〕", distractors: ["ア〔a〕", "カ〔ka〕", "ア（長い）〔ā〕"], kaisetsu: "母音の上の ῾（強い気息記号）は h の音を加える。ἁμαρτία は「ハマルティア」。", hint: "記号に注意して読むと？" },
  { greek: "ἀ", answer: "ア〔a〕", distractors: ["ハ〔ha〕", "アー〔ā〕", "エ〔e〕"], kaisetsu: "母音の上の ᾿（弱い気息記号）は音に影響しない。ἀγάπη は「アガペー」。", hint: "記号に注意して読むと？" },
  { greek: "ἑ", answer: "ヘ〔he〕", distractors: ["エ〔e〕", "ヘー〔hē〕", "ケ〔ke〕"], kaisetsu: "῾（強い気息記号）で h が加わり「ヘ」。ἑπτά（ヘプタ、7）の ἑ。", hint: "記号に注意して読むと？" },
  { greek: "ὁ", answer: "ホ〔ho〕", distractors: ["オ〔o〕", "ホー〔hō〕", "コ〔ko〕"], kaisetsu: "῾ で h が加わり「ホ」。冠詞 ὁ（ホ）はこの読み。", hint: "記号に注意して読むと？" },
  { greek: "ἡ", answer: "ヘー〔hē〕", distractors: ["エー〔ē〕", "ヒー〔hī〕", "ヘ〔he〕"], kaisetsu: "῾ で h が加わり、η は長い「エー」なので「ヘー」。女性の冠詞 ἡ。", hint: "記号に注意して読むと？" },
  { greek: "ὑ", answer: "ヒュ〔hy〕", distractors: ["ユ〔y〕", "フ〔hu〕", "ウ〔u〕"], kaisetsu: "語頭の υ にはいつも ῾ が付き、「ヒュ」と読む。ὕδωρ（ヒュドール、水）。", hint: "記号に注意して読むと？" },
  { greek: "ῥα", answer: "ラ〔rha〕", distractors: ["ハ〔ha〕", "ラ〔la〕", "ルハ〔ruha〕"], kaisetsu: "語頭の ρ には ῾ が付き ῥ（rh）と書くが、読みはラ行のまま。ῥῆμα は「レーマ」。", hint: "記号に注意して読むと？" },
  { greek: "ᾳ", answer: "ア〔a〕", distractors: ["アイ〔ai〕", "アイ（長い）〔āi〕", "イ〔i〕"], kaisetsu: "下に小さく書いた ι（イオタ下書き）は読まない。ᾳ は長い α として読む。", hint: "下の小さな記号に注意" },
  { greek: "γγ", answer: "ング〔ng〕", distractors: ["ッグ〔gg〕", "グ〔g〕", "ギギ〔gigi〕"], kaisetsu: "γ が γ・κ・χ・ξ の前に来ると「ン」の音。ἄγγελος は「アンゲロス」。", hint: "γ の組み合わせの読みは？" },
  { greek: "γκ", answer: "ンク〔nk〕", distractors: ["グク〔gk〕", "ック〔kk〕", "ク〔k〕"], kaisetsu: "γκ は「ンク」。ἀνάγκη（アナンケー、必然）の γκ。", hint: "γ の組み合わせの読みは？" },
  { greek: "γχ", answer: "ンク〔nkh〕", distractors: ["グク〔gkh〕", "ンチ〔nchi〕", "ク〔kh〕"], kaisetsu: "γχ は「ンク」（χ は息を強く）。ἐλέγχω（エレンコー、明らかにする）など。", hint: "γ の組み合わせの読みは？" },
  { greek: "γξ", answer: "ンクス〔nx〕", distractors: ["グクス〔gx〕", "クス〔x〕", "ングズ〔ngz〕"], kaisetsu: "γξ は「ンクス」。σάλπιγξ（サルピンクス、ラッパ）の語末。", hint: "γ の組み合わせの読みは？" },
];

const WORDS: [string, string, string[], string][] = [
  ["λόγος", "ロゴス", ["ラゴス", "ロゴシュ", "ルゴス"], "言葉。λ（ル）＋ο（オ）、γ（グ）＋ο（オ）、語末の ς（ス）。"],
  ["θεός", "テオス", ["セオス", "デオス", "テウス"], "神。θ は th（ト）。英語の th のように「セ」とは読まない。"],
  ["ἀγάπη", "アガペー", ["アガピー", "アガーペ", "アガベー"], "愛。η は長い「エー」。現代読みの「イー」と区別する。"],
  ["Ἰησοῦς", "イエースース", ["イエスス", "イシス", "イエースス"], "イエス。η は「エー」、ου は長い「ウー」。"],
  ["Χριστός", "クリストス", ["チリストス", "カリストス", "クリスタス"], "キリスト。χ は kh（ク）で、「チ」とは読まない。"],
  ["πνεῦμα", "プネウマ", ["ニューマ", "プニューマ", "ペネウマ"], "霊。πν は両方の子音を読む。ευ は「エウ」。"],
  ["ψυχή", "プシュケー", ["サイキ", "プシキー", "ピュケー"], "いのち・魂。ψ は ps、υ は「ユ」、χη は「ケー」。"],
  ["χάρις", "カリス", ["チャリス", "ハリス", "カリシュ"], "恵み。χ は kh（カ行）。"],
  ["πίστις", "ピスティス", ["ピスチス", "ピスティシュ", "フィスティス"], "信仰。τι は「チ」ではなく「ティ」。"],
  ["δόξα", "ドクサ", ["ドクザ", "ドグサ", "ドサ"], "栄光。ξ は ks（クス）。"],
  ["ζωή", "ゾーエー", ["ゾイ", "ゾーイ", "ゾーヘー"], "いのち。ω は長い「オー」、η は長い「エー」。"],
  ["κύριος", "キュリオス", ["クリオス", "キリオス", "キュリウス"], "主。κυ は「ク」ではなく「キュ」。"],
  ["οὐρανός", "ウーラノス", ["オウラノス", "ユーラノス", "ウーラネス"], "天。ου は長い「ウー」。"],
  ["ἁμαρτία", "ハマルティア", ["アマルティア", "ハマルチア", "ハマルテア"], "罪。語頭の ῾（強い気息記号）で「ハ」になる。"],
  ["υἱός", "ヒュイオス", ["ユイオス", "イオス", "フイオス"], "子。語頭の υ には ῾ が付き「ヒュ」。υι は「ユイ」。"],
  ["ἡμέρα", "ヘーメラ", ["エメラ", "ヒメラ", "ヘーメレ"], "日。ἡ は ῾ で「ヘー」。"],
  ["φῶς", "フォース", ["フォス", "ホース", "フース"], "光。ω は長い「オー」。"],
  ["εἰρήνη", "エイレーネー", ["イリーニ", "エイレネ", "エレーネー"], "平和。ει は「エイ」、η は「エー」。「イリーニ」は現代ギリシャ語読み。"],
  ["καρδία", "カルディア", ["カルジア", "カルデア", "ケルディア"], "心。δι は「ジ」ではなく「ディ」。"],
  ["ἀλήθεια", "アレーテイア", ["アリーシア", "アレテア", "アレーセイア"], "真理。θ は th（ト）、ει は「エイ」。"],
  ["δικαιοσύνη", "ディカイオシュネー", ["ディケオシーニ", "ジカイオスネー", "ディカイオスーネー"], "義。αι は「アイ」、συ は「シュ」。「ディケオシーニ」は現代ギリシャ語読み。"],
  ["βασιλεία", "バシレイア", ["ヴァシリア", "バシレア", "バジレイア"], "王国・御国。β は b、ει は「エイ」。"],
  ["κόσμος", "コスモス", ["コズモス", "コスムス", "カスモス"], "世界。σ は s（ス）。"],
  ["ἄνθρωπος", "アントローポス", ["アンスロポス", "アントロポス", "アンドローポス"], "人。θ は th（ト）、ω は長い「オー」。"],
  ["ἐκκλησία", "エックレーシア", ["エクレシア", "エックリシア", "エックレージア"], "教会。κκ は「ック」、η は「エー」。"],
  ["εὐαγγέλιον", "エウアンゲリオン", ["エヴァンゲリオン", "エウアッゲリオン", "エウアゲリオン"], "福音。ευ は「エウ」（「ユー」と読む慣習もある）、γγ は「ング」。"],
  ["ἄγγελος", "アンゲロス", ["アッゲロス", "アゲロス", "アングロス"], "御使い。γγ は「ング」。"],
  ["ῥῆμα", "レーマ", ["ルーマ", "リマ", "レマ"], "ことば。ῥ は r、η は長い「エー」。"],
  ["ὕδωρ", "ヒュドール", ["ユドール", "フドル", "ヒュドル"], "水。語頭の ὑ は「ヒュ」、ω は長い「オー」。"],
  ["Ἰσραήλ", "イスラエール", ["イズラエール", "イスラヘール", "イスラエル"], "イスラエル。η は長い「エー」。"],
];

const UNIT_WORDS: Item[] = WORDS.map(([greek, answer, distractors, note]) => ({
  greek,
  answer,
  distractors,
  kaisetsu: note,
  hint: "この単語の読みは？",
}));

/**
 * ステップ一覧。key は問題番号（進み具合の保存）に使うので変えない。
 * ordered のステップは、並び順どおりに出題する。
 */
export const ALPHABET_UNITS = [
  { unitNum: 1, key: "g", label: "50音", preview: "α ι υ ε ο", description: "あいうえお順に子音＋母音", items: UNIT_GOJUON, ordered: true },
  { unitNum: 2, key: "1", label: "文字", preview: "α β γ", description: "24文字の名前と音", items: UNIT_LETTERS, ordered: false },
  { unitNum: 3, key: "3", label: "二重母音と記号", preview: "αι ἁ", description: "二重母音・気息記号・γγ", items: UNIT_SPECIAL, ordered: false },
  { unitNum: 4, key: "4", label: "単語を読む", preview: "λόγος", description: "聖書の大切な単語", items: UNIT_WORDS, ordered: false },
] as const;

/** 並び順どおりに出題するステップ（unitNum） */
export const ORDERED_UNITS = new Set<number>(ALPHABET_UNITS.filter((u) => u.ordered).map((u) => u.unitNum));

const CHUNK = 10;

function buildDataset(): VocabQuizDataset {
  const words: VocabQuizWord[] = [];
  const groups: VocabQuizGroup[] = [];
  for (const unit of ALPHABET_UNITS) {
    const unitLabel = `${unit.unitNum}:${unit.label}`;
    for (let start = 0, chunk = 0; start < unit.items.length; start += CHUNK, chunk++) {
      const groupId = `abc-${unit.key}-${chunk}`;
      const ids: string[] = [];
      unit.items.slice(start, start + CHUNK).forEach((item, i) => {
        const id = `abc-${unit.key}-${start + i}`;
        ids.push(id);
        words.push({
          id,
          groupId,
          word: item.greek,
          greek: item.greek,
          answer: item.answer,
          distractors: item.distractors,
          kaisetsu: item.kaisetsu,
          count: null,
          unit: unitLabel,
          unitNum: unit.unitNum,
          pos: item.hint,
          coarsePos: "other",
        });
      });
      groups.push({ id: groupId, unitNum: unit.unitNum, unitLabel, chunkIndex: chunk, wordIds: ids, nativeCount: ids.length });
    }
  }
  return {
    words,
    groups,
    meta: {
      version: 1,
      totalWords: words.length,
      totalGroups: groups.length,
      chunkSize: CHUNK,
      coarsePosLabels: { verb: "動詞", noun: "名詞", adj: "形容詞", prep: "前置詞", other: "その他" },
    },
    wordsById: Object.fromEntries(words.map((w) => [w.id, w])),
    groupsById: Object.fromEntries(groups.map((g) => [g.id, g])),
  };
}

export const ALPHABET_DATASET = buildDataset();

/** 読み方の一覧表（学問的発音） */
export const ALPHABET_TABLE = LETTERS.map((l) => ({
  upper: l.upper,
  lower: l.lower,
  name: l.name,
  roman: l.roman,
  kana: l.kana,
}));

/** 50音の一覧表（行 × α ι υ ε ο、続けて η ω） */
const TABLE_VOWELS: Vowel[] = [...GOJUON_VOWELS, "η", "ω"];

function tableRow(c: string) {
  return { label: c, kana: TABLE_VOWELS.map((v) => SYLLABLE_KANA[c][VOWELS.indexOf(v)]) };
}

export const SYLLABLE_TABLE = {
  vowels: TABLE_VOWELS,
  rows: [
    { label: "（母音）", kana: ["ア", "イ", "ユ", "エ", "オ", "エー", "オー"] },
    ...["κ", "σ", "τ", "ν"].map(tableRow),
    { label: "῾（h）", kana: ["ハ", "ヒ", "ヒュ", "ヘ", "ホ", "ヘー", "ホー"] },
    ...["μ", "λ", "ρ", "γ", "ζ", "δ", "β", "π", "χ", "θ", "φ", "ξ", "ψ"].map(tableRow),
  ],
};
