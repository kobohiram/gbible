/**
 * scripts/synoptic-pericope-defs.mjs
 *
 * 共観福音書比較ページ用ペリコーペ定義。
 * 出典: Kurt Aland "Synopsis Quattuor Evangeliorum" 第13版に基づく
 *       https://www.bible-researcher.com/parallels.html （マタイ順パス, Aland §6, No.50-76）
 * 取得方法: 生HTMLを直接正規表現パースして抽出（要約モデルを介さない決定的抽出）。
 *
 * 山上の説教はマタイ順パスの粒度（1段落=1教え）をそのまま採用する。
 * ルカ順パス（No.77以降, §7）は一部段落が統合されており粒度が粗いため不採用
 * （統合すると「一致」判定の範囲が広がりすぎ、無関係な教え同士が誤って
 * マークされる原因になるため）。
 *
 * No.57(誓い) 60(施し) 61(祈り) 63(断食) 69(聖なるもの) は他福音書に
 * 並行箇所が一切ないため対象外（比較ページとして意味をなさないため）。
 */

/** "5.3-12" / "6.20b-23" / "4.24-5.2" / "7.15-20|12.33-35" 形式を PericopeRange[] に変換 */
function parseSingleRange(s) {
  const cleaned = s.replace(/\s*([ab])\b/gi, "").trim(); // 半節区分(a/b)を除去
  if (cleaned.includes("-")) {
    const [left, right] = cleaned.split("-");
    const [lc, lv] = left.split(".").map(Number);
    let rc, rv;
    if (right.includes(".")) {
      [rc, rv] = right.split(".").map(Number);
    } else {
      rc = lc;
      rv = Number(right);
    }
    return { startChapter: lc, startVerse: lv, endChapter: rc, endVerse: rv };
  }
  const [c, v] = cleaned.split(".").map(Number);
  return { startChapter: c, startVerse: v, endChapter: c, endVerse: v };
}

function parseRef(refStr) {
  if (!refStr) return null;
  return refStr.split("|").map((part) => parseSingleRange(part.trim()));
}

/** Aland表の1行（No., 邦題, mt, mk, lk）から passages を組み立てる */
function passagesFrom(matthew, mark, luke) {
  const passages = [];
  const mtRanges = parseRef(matthew);
  const mkRanges = parseRef(mark);
  const lkRanges = parseRef(luke);
  if (mtRanges) passages.push({ bookId: "matthew", ranges: mtRanges });
  if (mkRanges) passages.push({ bookId: "mark", ranges: mkRanges });
  if (lkRanges) passages.push({ bookId: "luke", ranges: lkRanges });
  return passages;
}

const NARRATIVE = [
  {
    id: "feeding-of-5000",
    title: "5000人の給食",
    group: "narrative",
    // 四福音書すべてに記録がある唯一の奇跡。ヨハネは一致マーカー判定の対象外
    // （表示のみ。generate-synoptic-marks.mjs 側で除外する）
    passages: [
      ...passagesFrom("14.13-21", "6.32-44", "9.10-17"),
      { bookId: "john", ranges: [{ startChapter: 6, startVerse: 1, endChapter: 6, endVerse: 15 }] },
    ],
  },
  {
    id: "calming-the-storm",
    title: "嵐を静める",
    group: "narrative",
    passages: passagesFrom("8.23-27", "4.35-41", "8.22-25"),
  },
  {
    id: "peters-confession",
    title: "ペテロの信仰告白",
    group: "narrative",
    // ヨハネ6:67-71にも類似の告白があるが、一致マーカー判定の対象外（表示のみ）
    passages: [
      ...passagesFrom("16.13-20", "8.27-30", "9.18-21"),
      { bookId: "john", ranges: [{ startChapter: 6, startVerse: 67, endChapter: 6, endVerse: 71 }] },
    ],
  },
];

// Aland §6 (No.50-76), マタイ順パス
const SERMON_ROWS = [
  ["50", "説教の背景", "4.24-5.2", "3.7-13", "6.17-20"],
  ["51", "祝福の言葉", "5.3-12", "", "6.20b-23"],
  ["52", "地の塩", "5.13", "9.49-50", "14.34-35"],
  ["53", "世の光", "5.14-16", "4.21", "8.16"],
  ["54", "律法と預言者について", "5.17-20", "", "16.16-17"],
  ["55", "殺人と怒りについて", "5.21-26", "", "12.57-59"],
  ["56", "姦淫と離婚について", "5.27-32", "9.43-48", "16.18"],
  ["58", "復讐について", "5.38-42", "", "6.29-30"],
  ["59", "敵を愛することについて", "5.43-48", "", "6.27-28|6.32-36"],
  ["62", "主の祈り", "6.7-15", "11.25", "11.1-4"],
  ["64", "富について", "6.19-21", "", "12.33-34"],
  ["65", "目は体の灯", "6.22-23", "", "11.34-36"],
  ["66", "二人の主に仕える", "6.24", "", "16.13"],
  ["67", "思い煩いについて", "6.25-34", "", "12.22-32"],
  ["68", "人を裁くな", "7.1-5", "4.24-25", "6.37-42"],
  ["70", "求めなさい、そうすれば与えられる", "7.7-11", "", "11.9-13"],
  ["71", "黄金律", "7.12", "", "6.31"],
  ["72", "狭い門", "7.13-14", "", "13.23-24"],
  ["73", "実によって木を知る", "7.15-20|12.33-35", "", "6.43-45"],
  ["74", "「主よ、主よ」と言う者", "7.21-23", "", "6.46|13.25-27"],
  ["75", "岩の上に家を建てる", "7.24-27", "", "6.47-49"],
  ["76", "群衆の驚き", "7.28-29", "1.21-22", ""],
];

const SERMON = SERMON_ROWS.map(([no, title, matthew, mark, luke]) => ({
  id: `sermon-${no}`,
  title,
  group: "sermon-on-the-mount",
  passages: passagesFrom(matthew, mark, luke),
}));

export const PERICOPE_DEFS = [...NARRATIVE, ...SERMON];
