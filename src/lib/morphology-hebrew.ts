/**
 * OSHB（Open Scriptures Hebrew Bible）形態論コードの日本語化
 * 例: HR/Ncfsa, HVqp3ms, HC/To
 */

const POS_JA: Record<string, string> = {
  A: "形",
  C: "接",
  D: "副",
  N: "名",
  P: "代",
  R: "前",
  S: "接辞",
  T: "助",
  V: "動",
};

const NOUN_TYPE_JA: Record<string, string> = {
  c: "普通",
  g: "人名",
  p: "固有名",
};

const GENDER_JA: Record<string, string> = {
  b: "両",
  c: "通",
  f: "女",
  m: "男",
};

const NUMBER_JA: Record<string, string> = {
  d: "双",
  p: "複",
  s: "単",
};

const STATE_JA: Record<string, string> = {
  a: "絶対",
  c: "構文",
  d: "定",
};

const VERB_STEM_JA: Record<string, string> = {
  q: "カル",
  N: "ニファル",
  p: "ピエル",
  P: "プアル",
  h: "ヒフィル",
  H: "ホファル",
  t: "ヒタペル",
  o: "ポレル",
  O: "ポラル",
  r: "ヒトポレル",
  m: "ポエル",
  M: "ポアル",
  k: "パレル",
  K: "プアラル",
  Q: "カル受",
  l: "ピルペル",
  L: "ポルパル",
  f: "ヒタパルペル",
  D: "ニタペル",
  j: "ペアラル",
  i: "ピレル",
  u: "ホタパアル",
  c: "ティフィル",
  v: "ヒシュタペル",
  w: "ニタパレル",
  y: "ニタポエル",
  z: "ヒタポエル",
};

const VERB_TYPE_JA: Record<string, string> = {
  p: "完了",
  q: "連続完了",
  i: "未完了",
  w: "連続未完了",
  h: "意志",
  j: "願望",
  v: "命令",
  r: "分詞能",
  s: "分詞受",
  a: "不定絶対",
  c: "不定構文",
};

const PARTICLE_TYPE_JA: Record<string, string> = {
  a: "肯定",
  d: "定冠",
  e: "勧告",
  i: "疑問",
  j: "間投",
  m: "指示",
  n: "否定",
  o: "直接目的",
  r: "関係",
};

const PRON_TYPE_JA: Record<string, string> = {
  d: "指示",
  f: "不定",
  i: "疑問",
  p: "人称",
  r: "関係",
};

const PERSON_JA: Record<string, string> = { "1": "１", "2": "２", "3": "３" };

function parseDetails(segment: string): string[] {
  const parts: string[] = [];
  const lang = segment[0];
  if (lang !== "H" && lang !== "A") return parts;

  const pos = segment[1];
  if (!pos) return parts;
  parts.push(POS_JA[pos] ?? pos);

  if (pos === "V") {
    const stem = segment[2];
    const type = segment[3];
    if (stem) parts.push(VERB_STEM_JA[stem] ?? stem);
    if (type) parts.push(VERB_TYPE_JA[type] ?? type);
    const person = segment[4];
    const gender = segment[5];
    const number = segment[6];
    const state = segment[7];
    if (person && /[123]/.test(person)) parts.push(`${PERSON_JA[person] ?? person}人称`);
    if (gender) parts.push(GENDER_JA[gender] ?? gender);
    if (number) parts.push(NUMBER_JA[number] ?? number);
    if (state) parts.push(STATE_JA[state] ?? state);
    return parts;
  }

  if (pos === "N" || pos === "A") {
    const type = segment[2];
    const gender = segment[3];
    const number = segment[4];
    const state = segment[5];
    if (type) parts.push(NOUN_TYPE_JA[type] ?? type);
    if (gender) parts.push(GENDER_JA[gender] ?? gender);
    if (number) parts.push(NUMBER_JA[number] ?? number);
    if (state) parts.push(STATE_JA[state] ?? state);
    return parts;
  }

  if (pos === "P") {
    const type = segment[2];
    const person = segment[3];
    const gender = segment[4];
    const number = segment[5];
    if (type) parts.push(PRON_TYPE_JA[type] ?? type);
    if (person && /[123]/.test(person)) parts.push(`${PERSON_JA[person] ?? person}人称`);
    if (gender) parts.push(GENDER_JA[gender] ?? gender);
    if (number) parts.push(NUMBER_JA[number] ?? number);
    return parts;
  }

  if (pos === "T") {
    const type = segment[2];
    if (type) parts.push(PARTICLE_TYPE_JA[type] ?? type);
    return parts;
  }

  if (pos === "R" && segment[2] === "d") {
    parts.push("定冠付き");
  }

  if (pos === "S") {
    const type = segment[2];
    const person = segment[3];
    const gender = segment[4];
    const number = segment[5];
    if (type) parts.push(type === "p" ? "代名接辞" : type);
    if (person && /[123]/.test(person)) parts.push(`${PERSON_JA[person] ?? person}人称`);
    if (gender) parts.push(GENDER_JA[gender] ?? gender);
    if (number) parts.push(NUMBER_JA[number] ?? number);
  }

  return parts;
}

export function isHebrewMorph(code: string): boolean {
  return /^H[A-Z]/.test(code.trim());
}

/** コンパクト表示 */
export function expandHebrewMorphologyJa(code: string): string {
  const segments = code.trim().split("/");
  const labels = segments.flatMap(parseDetails);
  if (labels.length === 0) return code;
  return labels.join("-");
}

/** 丁寧表示 */
const POS_VERBOSE: Record<string, string> = {
  形: "形容詞",
  接: "接続詞",
  副: "副詞",
  名: "名詞",
  代: "代名詞",
  前: "前置詞",
  接辞: "接辞",
  助: "助詞",
  動: "動詞",
};

export function expandHebrewMorphologyJaVerbose(code: string): string {
  const segments = code.trim().split("/");
  const labels = segments.flatMap(parseDetails).map((l) => {
    for (const [short, long] of Object.entries(POS_VERBOSE)) {
      if (l === short) return long;
    }
    if (l === "男") return "男性";
    if (l === "女") return "女性";
    if (l === "単") return "単数";
    if (l === "複") return "複数";
    if (l === "双") return "双数";
    if (l === "絶対") return "絶対形";
    if (l === "構文") return "構文形";
    if (l === "定") return "定形";
    return l;
  });
  if (labels.length === 0) return code;
  return labels.join("-");
}

export const HEBREW_MORPH_LEGEND = [
  { abbr: "名/動/前/助", desc: "品詞" },
  { abbr: "カル/ピエル/ヒフィル", desc: "動詞語幹" },
  { abbr: "完了/未完了/分詞能", desc: "動詞形" },
  { abbr: "男/女", desc: "性" },
  { abbr: "単/複", desc: "数" },
  { abbr: "絶対/構文", desc: "名詞の状態" },
  { abbr: "例", desc: "HVqp3ms → 動-カル-連続完了-３人称-男-単" },
] as const;
