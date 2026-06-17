/**
 * scripts/synoptic-pericope-defs.mjs
 *
 * 共観福音書比較ページ用ペリコーペ定義（MVP: 4件）。
 * 参照: https://www.bible-researcher.com/parallels.html
 *
 * generate-synoptic-marks.mjs がこの定義を読み、各書のJSONから
 * 該当範囲の単語を抽出してマーカー（matchGroups）を計算する。
 */

const range = (startChapter, startVerse, endChapter, endVerse) => ({
  startChapter,
  startVerse,
  endChapter,
  endVerse,
});

export const PERICOPE_DEFS = [
  {
    id: "sermon-on-the-mount",
    title: "山上の説教",
    passages: [
      {
        bookId: "matthew",
        // 5:13-16（地の塩・世の光）を除く2区間
        ranges: [range(5, 3, 5, 12), range(5, 17, 7, 27)],
      },
      // マルコには並行箇所なし
      {
        bookId: "luke",
        ranges: [range(6, 20, 6, 49)], // 平地の説教
      },
    ],
  },
  {
    id: "feeding-of-5000",
    title: "5000人の給食",
    // 四福音書すべてに記録がある唯一の奇跡。ヨハネは一致マーカー判定の対象外
    // （表示のみ。generate-synoptic-marks.mjs 側で除外する）
    passages: [
      { bookId: "matthew", ranges: [range(14, 13, 14, 21)] },
      { bookId: "mark", ranges: [range(6, 32, 6, 44)] },
      { bookId: "luke", ranges: [range(9, 10, 9, 17)] },
      { bookId: "john", ranges: [range(6, 1, 6, 15)] },
    ],
  },
  {
    id: "calming-the-storm",
    title: "嵐を静める",
    passages: [
      { bookId: "matthew", ranges: [range(8, 23, 8, 27)] },
      { bookId: "mark", ranges: [range(4, 35, 4, 41)] },
      { bookId: "luke", ranges: [range(8, 22, 8, 25)] },
    ],
  },
  {
    id: "peters-confession",
    title: "ペテロの信仰告白",
    passages: [
      { bookId: "matthew", ranges: [range(16, 13, 16, 20)] },
      { bookId: "mark", ranges: [range(8, 27, 8, 30)] },
      { bookId: "luke", ranges: [range(9, 18, 9, 21)] },
    ],
  },
];
