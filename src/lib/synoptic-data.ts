import type { Pericope, PericopesFile } from "@/types/synoptic";

let pericopesCache: PericopesFile | null = null;
let pericopesPromise: Promise<PericopesFile> | null = null;

export function loadPericopes(): Promise<PericopesFile> {
  if (pericopesCache) return Promise.resolve(pericopesCache);
  if (!pericopesPromise) {
    pericopesPromise = fetch("/data/synoptic/pericopes.json")
      .then((r) => (r.ok ? (r.json() as Promise<PericopesFile>) : { version: 1, pericopes: [] }))
      .then((data) => {
        pericopesCache = data;
        return data;
      })
      .catch(() => ({ version: 1, pericopes: [] }));
  }
  return pericopesPromise;
}

export type WordMark = {
  groupId: string;
  colorVar: string;
};

/**
 * 一致グループの wordIds から、参加する書の組み合わせに応じた下線色CSS変数名を返す。
 * 一致マーカーはマタイ・マルコ・ルカの3書限定（ヨハネは生成スクリプト側で除外済み）なので、
 * bookIds は必ずこの3書のうち2つ以上の部分集合になる。
 */
function colorVarForBookSet(bookIds: Set<string>): string {
  const hasMatthew = bookIds.has("matthew");
  const hasMark = bookIds.has("mark");
  const hasLuke = bookIds.has("luke");
  if (hasMatthew && hasMark && hasLuke) return "--match-triple";
  if (hasMatthew && hasLuke) return "--match-mt-lk";
  if (hasMatthew && hasMark) return "--match-mt-mk";
  if (hasMark && hasLuke) return "--match-mk-lk";
  return "--match-mt-lk"; // 到達しない想定（防御的フォールバック）
}

/** wordId → マーカー情報 の逆引きMapを構築する */
export function buildWordMarkMap(pericope: Pericope | null): Map<string, WordMark> {
  const map = new Map<string, WordMark>();
  if (!pericope) return map;
  for (const group of pericope.matchGroups) {
    const bookIds = new Set(group.wordIds.map((id) => id.split("-")[0]));
    const colorVar = colorVarForBookSet(bookIds);
    for (const wordId of group.wordIds) {
      map.set(wordId, { groupId: group.id, colorVar });
    }
  }
  return map;
}
