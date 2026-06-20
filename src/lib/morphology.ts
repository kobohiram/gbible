/**
 * Robinson / MorphGNT 形式の文法略語
 * 表示: 日本語コンパクト（動-未完能直-３s）— ハイフン構造は Robinson と同じ
 */

const POS_JA: Record<string, string> = {
  N: "名",
  V: "動",
  A: "形",
  C: "接",
  Conj: "接",
  D: "副",
  P: "前",
  PREP: "前",
  RA: "冠",
  RD: "指示",
  RI: "疑問",
  RP: "人称",
  RR: "関係",
  I: "間",
  X: "粒",
};

const CASE_JA: Record<string, string> = {
  N: "主",
  G: "属",
  D: "与",
  A: "対",
  V: "呼",
};

const GENDER_JA: Record<string, string> = {
  M: "男",
  F: "女",
  N: "中",
};

/** 時制: 未来(F)=「未」、未完了過去(I)=「未完」 */
const TENSE_JA: Record<string, string> = {
  P: "現",
  I: "未完",
  F: "未",
  A: "アオ",
  X: "完",
  Y: "過",
};

const VOICE_JA: Record<string, string> = {
  A: "能",
  M: "中",
  P: "受",
  E: "中受",
  N: "中",
  D: "授",
  O: "使",
};

const MOOD_JA: Record<string, string> = {
  I: "直",
  D: "命",
  S: "接",
  O: "希",
  N: "不定",
  P: "分",
};

function numberSuffix(code: string): string {
  return code === "S" ? "s" : "p";
}

function personJa(person: string): string {
  const map: Record<string, string> = { "1": "１", "2": "２", "3": "３" };
  return map[person] ?? person;
}

const TENSE_LABEL: Record<string, string> = {
  P: "現在形",
  I: "未完了形",
  F: "未来形",
  A: "アオリスト",
  X: "完了形",
  Y: "過去完了形",
};

const TENSE_DETAIL: Record<string, string> = {
  P: "話し手の現在における動作・状態を表します。叙事文では「歴史的現在」と呼ばれる用法もあり、過去の場面を臨場感をもって描きます。",
  I: "過去における継続・反復、または背景として描かれた状態を表します。英語の was/were …ing に近い「進行」のほか、単純に過去の状況を「舞台」として敷く用法もあります。",
  F: "これから起こる事柄を表します。確信・決意・神の約束を述べるとき、事実上「必ずそうなる」と読む用法もあります。",
  A: "点過去として、動作の完結・全体・単純な過去の事実を示します。文脈によって「始まり（開始点）」「全体像」「結果・到達」のニュアンスが異なります。",
  X: "すでに完了した動作・状態が、現在まで続いているか、その結果が今も有効であることを示します。",
  Y: "ある過去の時点よりさらに前に完了していた事柄を表します。「すでに〜していた」というニュアンスです。",
};

const MOOD_LABEL: Record<string, string> = {
  I: "直説法",
  D: "命令法",
  S: "接続法",
  O: "希求法",
  N: "不定詞",
  P: "分詞",
};

const MOOD_DETAIL: Record<string, string> = {
  I: "事実・実際の出来事を率直に述べる法です。叙事・説明・論証の基本となる用法です。",
  D: "命令・勧告・禁止を表します。文脈によって「〜しなさい」「〜せよ」だけでなく、強い勧めや禁戒にもなります。",
  S: "仮定・目的・可能性を表します。接続詞と結びつき「〜するために」「〜ならば」「〜かもしれない」など多様な用法があります。",
  O: "願望や弱い仮定を表します。新約では希求法単独より接続法で願望を表すことが多いです。",
  N: "動詞の名詞形です。主語・目的語・補語として、または他の動詞を修飾する副詞的用法があります。",
  P: "形容詞的・副詞的に働きます。時制は主要動詞に対する相対的な時間関係（同時・先行など）を示します。",
};

const VOICE_LABEL: Record<string, string> = {
  A: "能動態",
  M: "中動態",
  P: "受動態",
  E: "中動・受動中動",
  N: "中動・受動中動",
  D: "授受の中動",
  O: "使役",
};

const VOICE_DETAIL: Record<string, string> = {
  A: "主語が自ら動作を行う態です。英語の能動態に相当します。",
  M: "主語が動作に関与する態です。再帰的・自利的な含意を持つことがあり、単純な受動とは区別されます。",
  P: "主語が動作を受ける態です。英語の受動態に相当します。",
  E: "形は能動に見えて意味は受動、または中動・受動の意味を取る特殊な語に用いられます。",
  N: "中動・受動中動の意味を持つ語形です。文脈で能動・受動・再帰のどれに近いかを判断します。",
  D: "自分のために行う・受け取るといった「自分に関わる」中動の用法です。",
  O: "「〜させる」の使役態です。",
};

const PERSON_NUMBER_LABEL: Record<string, Record<string, string>> = {
  "1": { S: "一人称単数", P: "一人称複数" },
  "2": { S: "二人称単数", P: "二人称複数" },
  "3": { S: "三人称単数", P: "三人称複数" },
};

const PERSON_NUMBER_DETAIL: Record<string, Record<string, string>> = {
  "1": {
    S: "話し手自身（「私が…」）を主語とします。",
    P: "話し手を含む複数（「私たちが…」）を主語とします。",
  },
  "2": {
    S: "聞き手一人（「あなたが…」）を主語とします。",
    P: "聞き手複数（「あなたがたが…」）を主語とします。",
  },
  "3": {
    S: "話し手・聞き手以外の一人（「彼・彼女・それが…」）を主語とします。",
    P: "話し手・聞き手以外の複数（「彼ら・それらが…」）を主語とします。",
  },
};

export type VerbMorphExplanation = {
  compact: string;
  tense: { label: string; abbr: string; detail: string };
  mood: { label: string; abbr: string; detail: string };
  voice: { label: string; abbr: string; detail: string };
  personNumber: { label: string; abbr: string; detail: string };
  /** 分詞の格・性・数（定形動詞では空） */
  participleForm?: { label: string; abbr: string };
  notes: string[];
};

type VerbMorphContext = {
  greek?: string;
  strongs?: string;
  lemma?: string;
};

type VerbMorphParsed = { tense: string; mood: string; voice: string; person: string; number: string };
type ParticipleParseResult = { tense: string; voice: string; case_: string; number: string; gender: string };
type InfinitiveParseResult  = { tense: string; voice: string };

function parseVerbMorph(code: string): VerbMorphParsed | null {
  const s = code.trim();
  // TMV: V-[Tense][Mood][Voice]-[Person][Number]
  const tmv = s.match(/^V-([PIAFXY])([IDSONP])([AMPENDO])-(\d)([SP])$/);
  if (tmv) return { tense: tmv[1], mood: tmv[2], voice: tmv[3], person: tmv[4], number: tmv[5] };
  // TVM: V-[Tense][Voice][Mood]-[Person][Number]
  const tvm = s.match(/^V-([PIAFXY])([AMPENDO])([IDSONP])-(\d)([SP])$/);
  if (tvm) return { tense: tvm[1], voice: tvm[2], mood: tvm[3], person: tvm[4], number: tvm[5] };
  return null;
}

function parseParticiple(code: string): ParticipleParseResult | null {
  // V-[Tense][Voice]P-[Case][Number][Gender]
  const m = code.trim().match(/^V-([PIAFXY])([AMPENDO])P-([NGDAV])([SP])([MFN])$/);
  if (m) return { tense: m[1], voice: m[2], case_: m[3], number: m[4], gender: m[5] };
  return null;
}

function parseInfinitive(code: string): InfinitiveParseResult | null {
  // V-[Tense][Voice]N
  const m = code.trim().match(/^V-([PIAFXY])([AMPENDO])N$/);
  if (m) return { tense: m[1], voice: m[2] };
  return null;
}

export function isVerbMorph(code: string): boolean {
  return parseVerbMorph(code) !== null ||
    parseParticiple(code) !== null ||
    parseInfinitive(code) !== null;
}

function verbSpecialNotes(
  tense: string,
  mood: string,
  voice: string,
  ctx: VerbMorphContext,
): string[] {
  const notes: string[] = [];
  const isEimi =
    ctx.strongs === "G1510" ||
    ctx.strongs === "G2258" ||
    ctx.lemma === "εἰμί" ||
    ctx.greek === "ἦν" ||
    ctx.greek === "εἰμί" ||
    ctx.greek === "ἐστίν" ||
    ctx.greek === "ἐστιν";

  if (ctx.strongs === "G1096" || ctx.greek === "ἐγένετο") {
    notes.push(
      "γίνομαι のアオリスト中動です。1:14では「言葉が肉となった」という道成の転換点を示し、永遠の存在（1:1）が歴史の中で人間的存在を取ったことを表します。",
    );
  }

  if (ctx.strongs === "G4637" || ctx.greek === "ἐσκήνωσεν") {
    notes.push(
      "σκηνόω のアオリスト能動です。旧約の会見の天幕（שׁכּן）を想起させ、「私たちの中に幕屋した」＝神の臨在が人間の営みに宿ったという意味合いが強いです。",
    );
  }

  if (ctx.strongs === "G2300" || ctx.greek === "ἐθεασάμεθα") {
    notes.push(
      "θεάομαι のアオリスト中動・第一人称複数です。「私たちは（その栄光を）見た」という使徒的証言の形で、道成は伝聞ではなく目撃に基づく事実として語られます。",
    );
  }

  if (isEimi && tense === "I" && mood === "I") {
    notes.push(
      "存在動詞 εἰμί の未完了形です。単なる「いた」ではなく、過去のある時点における存在・同一・属性を描写します。ヨハネ1:1では創世以前からの永続的実在を背景として描く用法が考えられます。",
    );
  }

  if (tense === "I" && mood === "I" && !isEimi) {
    notes.push(
      "未完了形＋直説法は、叙事文で場面の背景や状況設定を敷くことが多いです。前後の文脈で「進行」か「単純背景」かを見分けましょう。",
    );
  }

  if (tense === "P" && mood === "I") {
    notes.push(
      "現在形＋直説法が過去の叙事に現れる場合、歴史的現在（臨場感のある描写）の可能性があります。",
    );
  }

  if (tense === "A" && mood === "I") {
    notes.push(
      "アオリスト＋直説法は新約叙事の基本形です。一つの出来事として述べるか、全体を要約するかは文脈次第です。",
    );
  }

  if (mood === "P") {
    notes.push(
      "分詞は独立用法（絶対分詞構文など）になると、文全体の背景・原因・条件を担います。",
    );
  }

  if (voice === "M") {
    notes.push(
      "中動態は英語に直訳しにくい場合があります。主語の利益・関与・再帰的な意味が込められていないか注意しましょう。",
    );
  }

  return notes;
}

/** 動詞の丁寧な文法解説（辞書ペイン用） */
export function explainVerbMorphologyJa(
  code: string,
  ctx: VerbMorphContext = {},
): VerbMorphExplanation | null {
  // 分詞
  const ptc = parseParticiple(code);
  if (ptc) {
    const { tense, voice, case_, number, gender } = ptc;
    const formLabel = `${CASE_LABEL[case_] ?? case_}・${NUMBER_LABEL[number] ?? number}・${GENDER_LABEL[gender] ?? gender}`;
    const formAbbr = `${CASE_JA[case_] ?? case_}${GENDER_JA[gender] ?? gender}-${numberSuffix(number)}`;
    return {
      compact: `${POS_JA.V}-${TENSE_JA[tense]}${VOICE_JA[voice]}分-${formAbbr}`,
      tense: { label: TENSE_LABEL[tense] ?? tense, abbr: TENSE_JA[tense] ?? tense, detail: TENSE_DETAIL[tense] ?? "" },
      mood:  { label: "分詞", abbr: "分", detail: MOOD_DETAIL["P"] },
      voice: { label: VOICE_LABEL[voice] ?? voice, abbr: VOICE_JA[voice] ?? voice, detail: VOICE_DETAIL[voice] ?? "" },
      personNumber: { label: "", abbr: "", detail: "" },
      participleForm: { label: formLabel, abbr: formAbbr },
      notes: verbSpecialNotes(tense, "P", voice, ctx),
    };
  }

  // 不定詞
  const inf = parseInfinitive(code);
  if (inf) {
    const { tense, voice } = inf;
    return {
      compact: `${POS_JA.V}-${TENSE_JA[tense]}${VOICE_JA[voice]}不定`,
      tense: { label: TENSE_LABEL[tense] ?? tense, abbr: TENSE_JA[tense] ?? tense, detail: TENSE_DETAIL[tense] ?? "" },
      mood:  { label: "不定詞", abbr: "不定", detail: MOOD_DETAIL["N"] },
      voice: { label: VOICE_LABEL[voice] ?? voice, abbr: VOICE_JA[voice] ?? voice, detail: VOICE_DETAIL[voice] ?? "" },
      personNumber: { label: "", abbr: "", detail: "" },
      notes: verbSpecialNotes(tense, "N", voice, ctx),
    };
  }

  // 定形動詞
  const match = parseVerbMorph(code);
  if (!match) return null;

  const { tense, mood, voice, person, number } = match;
  const morph = `${TENSE_JA[tense]}${VOICE_JA[voice]}${MOOD_JA[mood]}`;

  return {
    compact: `${POS_JA.V}-${morph}-${personJa(person)}${numberSuffix(number)}`,
    tense: {
      label: TENSE_LABEL[tense] ?? tense,
      abbr: TENSE_JA[tense] ?? tense,
      detail: TENSE_DETAIL[tense] ?? "",
    },
    mood: {
      label: MOOD_LABEL[mood] ?? mood,
      abbr: MOOD_JA[mood] ?? mood,
      detail: MOOD_DETAIL[mood] ?? "",
    },
    voice: {
      label: VOICE_LABEL[voice] ?? voice,
      abbr: VOICE_JA[voice] ?? voice,
      detail: VOICE_DETAIL[voice] ?? "",
    },
    personNumber: {
      label: PERSON_NUMBER_LABEL[person]?.[number] ?? `${person}${number}`,
      abbr: `${personJa(person)}${numberSuffix(number)}`,
      detail: PERSON_NUMBER_DETAIL[person]?.[number] ?? "",
    },
    notes: verbSpecialNotes(tense, mood, voice, ctx),
  };
}

const CASE_LABEL: Record<string, string> = {
  N: "主格",
  G: "属格",
  D: "与格",
  A: "対格",
  V: "呼格",
};

const CASE_DETAIL: Record<string, string> = {
  N: "主語、または述語名詞（補語）を表します。「誰が・何が」あるいは「〜である」の「〜」側になります。存在動詞 εἰμί の後では、主語と述語名詞が同格（一致）で結ばれることが多く、ここでは「〜は〜である」の後半側に相当する語形です。",
  G: "所有・所属・由来・性質を表します。「〜の」に相当し、所有属格・部分属格・描述属格（性質・類属）・比較の基準など用法が広い格です。名詞単独でも、前置詞と結びついて多様な意味関係を担います。",
  D: "間接対象・利益・体験・方向を表します。「〜に」「〜のために」に相当します。前置詞 ἐν・ἐνί などと結びつくと、場所・時間・手段を示す用法（例：ἐν ἀρχῇ「初めに」）にもなります。",
  A: "直接目的語・方向・対象・時間の範囲を表します。「〜を」に相当します。前置詞 πρός などと結びつくと「〜に向かって」「〜に対して」といった方向・関係を示します。",
  V: "直接呼びかける名前・称号を表します。新約では比較的稀ですが、引用や祈りの文で現れることがあります。",
};

const POS_LABEL: Record<string, string> = {
  N: "名詞",
  A: "形容詞",
  RA: "定冠詞",
  RD: "指示代名詞",
  RI: "疑問代名詞",
  RP: "人称代名詞",
  RR: "関係代名詞",
};

const POS_DETAIL: Record<string, string> = {
  N: "人・物・事柄の名称を表す語です。格・性・数の変化によって、文中での役割（主語・目的語・補語など）を示します。",
  A: "名詞を修飾する語です。名詞と同じ格・性・数を取り、修飾する名詞と一致（同格）します。",
  RA: "「その・この」など、名詞を特定する語です。名詞と同じ格・性・数を取り、後続の名詞と結びつきます。",
  RD: "「この・あの」など、指示の代名詞です。",
  RI: "「誰・何」など、疑問の代名詞です。",
  RP: "人称代名詞です。",
  RR: "関係代名詞です。先行詞を修飾・限定します。",
};

const GENDER_LABEL: Record<string, string> = {
  M: "男性",
  F: "女性",
  N: "中性",
};

const GENDER_DETAIL: Record<string, string> = {
  M: "男性名詞・男性として一致します。人称・自然の性別と必ずしも一致しない文法上の分類です。",
  F: "女性名詞・女性として一致します。修飾語や冠詞も同じ女性形を取ります。",
  N: "中性名詞・中性として一致します。",
};

const NUMBER_LABEL: Record<string, string> = {
  S: "単数",
  P: "複数",
};

const NUMBER_DETAIL: Record<string, string> = {
  S: "一つのもの・一人を指します。",
  P: "二つ以上・複数のもの・人々を指します。",
};

const INFLECTED_POS = new Set([
  "N",
  "A",
  "RA",
  "RD",
  "RI",
  "RP",
  "RR",
  "D",
]);

export type NounMorphExplanation = {
  compact: string;
  pos: { label: string; abbr: string; detail: string };
  grammaticalCase: { label: string; abbr: string; detail: string };
  gender: { label: string; abbr: string; detail: string };
  number: { label: string; abbr: string; detail: string };
  notes: string[];
};

type NounMorphContext = {
  greek?: string;
  strongs?: string;
  lemma?: string;
  glossJa?: string;
};

function parseInflectedMorph(code: string) {
  return code.trim().match(/^([A-Z]+)-([NGDAV])([SP])([MFN]?)$/);
}

export function isNounLikeMorph(code: string): boolean {
  const match = parseInflectedMorph(code);
  if (!match) return false;
  return INFLECTED_POS.has(match[1]);
}

function nounSpecialNotes(
  pos: string,
  case_: string,
  ctx: NounMorphContext,
): string[] {
  const notes: string[] = [];

  if (case_ === "D" && ctx.greek === "ἀρχῇ") {
    notes.push(
      "与格ですが、前置詞 ἐν（〜の中で）と結びつき、ここでは時間的な起点「初めに」を表します。単独の与格用法（間接目的語など）とは異なる、前置詞句の一部として読みます。",
    );
  }

  if (case_ === "A" && ctx.glossJa?.includes("向か")) {
    notes.push(
      "対格ですが、前置詞 πρός（〜に向かって）の目的語として、関係性・方向を表します。単純な「〜を」という直接目的語とは文脈が異なります。",
    );
  }

  if (ctx.greek === "σὰρξ" || ctx.strongs === "G4561") {
    notes.push(
      "主格 σὰρξ は述語的名詞として「言葉が〜となった」の内容を示します。道成において神の言葉が触れられ、見られる人間的存在を取ったことを表す、この節の中心的語です。",
    );
  }

  if (ctx.greek === "δόξαν" || ctx.strongs === "G1391") {
    notes.push(
      "対格 δόξαν は「見た」対象です。同形が二度現れ、栄光の顕現と、その栄光が独り子として父から来たものであることの説明へと続きます。",
    );
  }

  if (ctx.greek === "μονογενοῦς" || ctx.strongs === "G3439") {
    notes.push(
      "属格形容詞 μονογενοῦς は ὡς（〜のように）と結び、見えた栄光が「独り子としての父からの栄光」に似ていることを修飾します。",
    );
  }

  if (ctx.greek === "πατρός" || ctx.strongs === "G3962") {
    notes.push(
      "属格 πατρός は παρὰ（〜から）の対象です。栄光の起源が子の内面だけでなく、父との永遠の関係にあることを示します。",
    );
  }

  if (case_ === "D" && (ctx.greek === "ἡμῖν" || ctx.strongs === "G1473")) {
    notes.push(
      "与格 ἡμῖν は ἐν（〜の中で）と結び「私たちの中に」という意味になります。神の臨在が共同体の内部に及ぶことを示します。",
    );
  }

  if (case_ === "N" && pos === "N") {
    notes.push(
      "主格名詞は、文の主語であることが多いです。述語名詞（補語）の場合は、近くの存在動詞やコプラとセットで読み、主語との同格関係を確認しましょう。",
    );
  }

  if (case_ === "N" && pos === "RA") {
    notes.push(
      "定冠詞の主格形です。後続の名詞と性・数が一致し、特定の人・物を指します。ここでは「その」という特定性を付加しています。",
    );
  }

  if (case_ === "G") {
    notes.push(
      "属格は文脈によって「所有」「部分」「性質」「類属」「比較の基準」など意味が分岐します。直前直後の語との関係で、どの用法かを見分けましょう。",
    );
  }

  if (case_ === "D" && ctx.greek !== "ἀρχῇ") {
    notes.push(
      "与格は「与える対象」だけでなく、利益・体験・方向・時間・場所（前置詞と結び合う場合）など多様な意味を持ちます。",
    );
  }

  return notes;
}

/** 名詞・形容詞・冠詞など屈折語の丁寧な文法解説（辞書ペイン用） */
export function explainNounMorphologyJa(
  code: string,
  ctx: NounMorphContext = {},
): NounMorphExplanation | null {
  const match = parseInflectedMorph(code);
  if (!match) return null;

  const [, pos, case_, number, gender] = match;
  if (!INFLECTED_POS.has(pos)) return null;

  const morph = `${CASE_JA[case_]}${gender ? GENDER_JA[gender] : ""}`;
  const posAbbr = POS_JA[pos] ?? pos;

  return {
    compact: `${posAbbr}-${morph}-${numberSuffix(number)}`,
    pos: {
      label: POS_LABEL[pos] ?? pos,
      abbr: posAbbr,
      detail: POS_DETAIL[pos] ?? "",
    },
    grammaticalCase: {
      label: CASE_LABEL[case_] ?? case_,
      abbr: CASE_JA[case_] ?? case_,
      detail: CASE_DETAIL[case_] ?? "",
    },
    gender: {
      label: gender ? (GENDER_LABEL[gender] ?? gender) : "",
      abbr: gender ? (GENDER_JA[gender] ?? gender) : "",
      detail: gender ? (GENDER_DETAIL[gender] ?? "") : "",
    },
    number: {
      label: NUMBER_LABEL[number] ?? number,
      abbr: numberSuffix(number),
      detail: NUMBER_DETAIL[number] ?? "",
    },
    notes: nounSpecialNotes(pos, case_, ctx),
  };
}

/** 略語凡例（日本語表記） */
export const MORPH_LEGEND = [
  { abbr: "主/属/与/対/呼", desc: "格" },
  { abbr: "男/女/中", desc: "性" },
  { abbr: "s / p", desc: "単数 / 複数（末尾）" },
  { abbr: "現/未完/アオ/未/完/過", desc: "時制" },
  { abbr: "能/中/受", desc: "態" },
  { abbr: "直/命/接", desc: "法（接=接続法）" },
  { abbr: "１/２/３", desc: "人称" },
  { abbr: "冠", desc: "定冠詞" },
  { abbr: "接 / 前", desc: "接続詞 / 前置詞" },
  {
    abbr: "例",
    desc: "V-IIA-3S → 動-未完能直-３s、N-NSM → 名-主男-s、N-DSF → 名-与女-s、Conj → 接、PREP → 前",
  },
] as const;

export function isHebrewMorph(code: string): boolean {
  return /^H[A-Z]/.test(code.trim());
}

/** MorphGNT 内部形式 → Robinson 略語 */
export function morphgntToRobinson(pos: string, parsing: string): string {
  const posKey = pos.replace(/-$/, "").trim();
  if (posKey === "P") return "PREP";
  if (posKey === "C") return "Conj";

  const p = parsing.replace(/-/g, "").trim();
  if (!p) return posKey;

  const verbMatch = p.match(/^(\d)([PIAFXY])([AMP])([IDSONP])([SP])/);
  if (verbMatch && posKey === "V") {
    const [, person, tense, voice, mood, number] = verbMatch;
    return `V-${tense}${mood}${voice}-${person}${number}`;
  }

  const nounMatch = p.match(/^([NGDAV])([SP])([MFN])/);
  if (nounMatch) {
    const [, case_, number, gender] = nounMatch;
    return `${posKey}-${case_}${number}${gender}`;
  }

  return posKey;
}

/**
 * 日本語コンパクト略語
 * Robinson と同じハイフン構造: 品詞-語形-人称数
 * 例: V-IIA-3S → 動-未完能直-３s / N-DSF → 名-与女-s
 */
export function expandMorphologyJa(code: string): string {
  const compact = code.trim();

  if (compact === "Conj" || compact === "C") return POS_JA.Conj;
  if (compact === "PREP" || compact === "P") return POS_JA.PREP;

  const ptc = parseParticiple(compact);
  if (ptc) {
    const { tense, voice, case_, number, gender } = ptc;
    return `${POS_JA.V}-${TENSE_JA[tense]}${VOICE_JA[voice]}分-${CASE_JA[case_]}${GENDER_JA[gender]}-${numberSuffix(number)}`;
  }

  const inf = parseInfinitive(compact);
  if (inf) {
    return `${POS_JA.V}-${TENSE_JA[inf.tense]}${VOICE_JA[inf.voice]}不定`;
  }

  const verbMatch = parseVerbMorph(compact);
  if (verbMatch) {
    const { tense, mood, voice, person, number } = verbMatch;
    const morph = `${TENSE_JA[tense]}${VOICE_JA[voice]}${MOOD_JA[mood]}`;
    return `${POS_JA.V}-${morph}-${personJa(person)}${numberSuffix(number)}`;
  }

  const inflectedMatch = parseInflectedMorph(compact);
  if (inflectedMatch) {
    const [, pos, case_, number, gender] = inflectedMatch;
    const morph = `${CASE_JA[case_]}${gender ? GENDER_JA[gender] : ""}`;
    return `${POS_JA[pos] ?? pos}-${morph}-${numberSuffix(number)}`;
  }

  return POS_JA[compact] ?? compact;
}

/**
 * 辞書ペイン用：略語なしの丁寧な日本語表記
 * 例: N-NSM → 名詞-主格-男性-単数 / V-IIA-3S → 動詞-未完了形-直説法-能動態-三人称-単数
 */
export function expandMorphologyJaVerbose(code: string): string {
  const compact = code.trim();

  if (compact === "Conj" || compact === "C") return "接続詞";
  if (compact === "PREP" || compact === "P") return "前置詞";

  const ptc = parseParticiple(compact);
  if (ptc) {
    const { tense, voice, case_, number, gender } = ptc;
    return ["動詞", TENSE_LABEL[tense] ?? tense, "分詞", VOICE_LABEL[voice] ?? voice,
      CASE_LABEL[case_] ?? case_, GENDER_LABEL[gender] ?? gender, NUMBER_LABEL[number] ?? number].join("-");
  }

  const inf = parseInfinitive(compact);
  if (inf) {
    return ["動詞", TENSE_LABEL[inf.tense] ?? inf.tense, "不定詞", VOICE_LABEL[inf.voice] ?? inf.voice].join("-");
  }

  const verbMatch = parseVerbMorph(compact);
  if (verbMatch) {
    const { tense, mood, voice, person, number } = verbMatch;
    const personNumber =
      PERSON_NUMBER_LABEL[person]?.[number] ?? `${person}${number}`;
    return [
      "動詞",
      TENSE_LABEL[tense] ?? tense,
      MOOD_LABEL[mood] ?? mood,
      VOICE_LABEL[voice] ?? voice,
      personNumber,
    ].join("-");
  }

  const inflectedMatch = parseInflectedMorph(compact);
  if (inflectedMatch) {
    const [, pos, case_, number, gender] = inflectedMatch;
    const posLabel = POS_LABEL[pos] ?? POS_JA[pos] ?? pos;
    const parts = [posLabel, CASE_LABEL[case_] ?? case_];
    if (gender) parts.push(GENDER_LABEL[gender] ?? gender);
    parts.push(NUMBER_LABEL[number] ?? number);
    return parts.join("-");
  }

  return POS_LABEL[compact] ?? POS_JA[compact] ?? compact;
}
