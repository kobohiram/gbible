import type {
  CoarsePos,
  GroupStatus,
  QuizMode,
  SessionQuestion,
  VocabQuizDataset,
  VocabQuizGroup,
  VocabQuizWord,
} from "@/types/vocab-quiz";

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function shuffleChoices(wordId: string, answer: string, distractors: string[]): string[] {
  const choices = [answer, ...distractors];
  const offset = hashString(wordId) % choices.length;
  const rotated = [...choices.slice(offset), ...choices.slice(0, offset)];
  return rotated;
}

export function getGroupStatus(
  group: VocabQuizGroup,
  learned: Record<string, boolean>,
): GroupStatus {
  const native = group.wordIds;
  if (native.length === 0) return "gray";
  const learnedCount = native.filter((id) => learned[id]).length;
  if (learnedCount === 0) return "gray";
  if (learnedCount >= native.length) return "green";
  if (learnedCount / native.length >= 0.8) return "yellow";
  return "gray";
}

export function getCurrentUnitNum(
  groups: VocabQuizGroup[],
  learned: Record<string, boolean>,
): number {
  for (const g of [...groups].sort((a, b) => a.unitNum - b.unitNum || a.chunkIndex - b.chunkIndex)) {
    if (getGroupStatus(g, learned) !== "green") return g.unitNum;
  }
  return groups[groups.length - 1]?.unitNum ?? 1;
}

export type UnitProgressState = "cleared" | "current" | "locked";

export type UnitSummary = {
  unitNum: number;
  unitLabel: string;
  state: UnitProgressState;
  learnedCount: number;
  totalWords: number;
  chunksCleared: number;
  chunksTotal: number;
  activeGroupId?: string;
};

export function isUnitCleared(
  unitGroups: VocabQuizGroup[],
  learned: Record<string, boolean>,
): boolean {
  return unitGroups.length > 0 && unitGroups.every((g) => getGroupStatus(g, learned) === "green");
}

export function getUnitSummaries(
  groups: VocabQuizGroup[],
  words: VocabQuizWord[],
  learned: Record<string, boolean>,
): UnitSummary[] {
  const currentUnitNum = getCurrentUnitNum(groups, learned);
  const unitNums = [...new Set(groups.map((g) => g.unitNum))].sort((a, b) => a - b);

  return unitNums.map((unitNum) => {
    const unitGroups = groups
      .filter((g) => g.unitNum === unitNum)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
    const unitWords = words.filter((w) => w.unitNum === unitNum);
    const learnedCount = unitWords.filter((w) => learned[w.id]).length;
    const chunksCleared = unitGroups.filter((g) => getGroupStatus(g, learned) === "green").length;

    let state: UnitProgressState;
    if (isUnitCleared(unitGroups, learned)) {
      state = "cleared";
    } else if (unitNum === currentUnitNum) {
      state = "current";
    } else {
      state = "locked";
    }

    const activeGroup = unitGroups.find((g) => getGroupStatus(g, learned) !== "green");

    return {
      unitNum,
      unitLabel: unitGroups[0]?.unitLabel ?? `第${unitNum}単元`,
      state,
      learnedCount,
      totalWords: unitWords.length,
      chunksCleared,
      chunksTotal: unitGroups.length,
      activeGroupId: state === "current" ? activeGroup?.id : undefined,
    };
  });
}

export function findActiveGroupId(
  groups: VocabQuizGroup[],
  learned: Record<string, boolean>,
  unitNum: number,
): string | undefined {
  const unitGroups = groups
    .filter((g) => g.unitNum === unitNum)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
  const next = unitGroups.find((g) => getGroupStatus(g, learned) !== "green");
  return next?.id ?? unitGroups[0]?.id;
}

export function pickReviewWords(
  dataset: VocabQuizDataset,
  learned: Record<string, boolean>,
  preferUnitNum: number,
  count: number,
  excludeIds: Set<string>,
): VocabQuizWord[] {
  const pool = (unitNum: number) =>
    dataset.words.filter(
      (w) =>
        w.unitNum === unitNum &&
        !learned[w.id] &&
        !excludeIds.has(w.id),
    );

  const picked: VocabQuizWord[] = [];
  const used = new Set<string>();

  for (const w of shufflePool(pool(preferUnitNum))) {
    if (picked.length >= count) break;
    picked.push(w);
    used.add(w.id);
  }

  if (picked.length < count) {
    for (const w of shufflePool(
      dataset.words.filter((w) => w.unitNum !== preferUnitNum && !learned[w.id] && !excludeIds.has(w.id) && !used.has(w.id)),
    )) {
      if (picked.length >= count) break;
      picked.push(w);
    }
  }

  return picked;
}

function shufflePool<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildSession(
  dataset: VocabQuizDataset,
  learned: Record<string, boolean>,
  mode: QuizMode,
  options: {
    groupId?: string;
    coarsePos?: CoarsePos;
  } = {},
): SessionQuestion[] {
  const exclude = new Set<string>();
  let nativeWords: VocabQuizWord[] = [];
  let preferUnit = getCurrentUnitNum(dataset.groups, learned);

  if (mode === "level" && options.groupId) {
    const group = dataset.groupsById[options.groupId];
    if (!group) return [];
    preferUnit = group.unitNum;
    nativeWords = group.wordIds.map((id) => dataset.wordsById[id]).filter(Boolean);
  } else if (mode === "pos" && options.coarsePos) {
    const coarsePos = options.coarsePos;
    const inPos = dataset.words.filter((w) => w.coarsePos === coarsePos);
    const unlearned = shufflePool(inPos.filter((w) => !learned[w.id]));
    const learnedInPos = shufflePool(inPos.filter((w) => learned[w.id]));
    nativeWords = [...unlearned, ...learnedInPos].slice(0, 10);
    preferUnit = nativeWords[0]?.unitNum ?? preferUnit;
  } else if (mode === "random") {
    nativeWords = shufflePool(dataset.words.filter((w) => !learned[w.id])).slice(0, 10);
    if (nativeWords.length < 10) {
      nativeWords = shufflePool(dataset.words).slice(0, 10);
    }
    preferUnit = nativeWords[0]?.unitNum ?? preferUnit;
  }

  nativeWords.forEach((w) => exclude.add(w.id));

  const reviewNeeded = mode === "pos" ? 0 : Math.max(0, 10 - nativeWords.length);
  const reviewWords =
    reviewNeeded > 0
      ? pickReviewWords(dataset, learned, preferUnit, reviewNeeded, exclude)
      : [];

  const slots: SessionQuestion[] = [];
  let slot = 0;
  for (const w of nativeWords) {
    slots.push({ wordId: w.id, isReview: false, slotIndex: slot++ });
  }
  for (const w of reviewWords) {
    slots.push({ wordId: w.id, isReview: true, slotIndex: slot++ });
  }

  if (mode !== "pos") {
    // 10問未満のネイティブのみのグループでも最大10枠（復習で埋める）
    while (slots.length < 10) {
      const more = pickReviewWords(dataset, learned, preferUnit, 1, new Set(slots.map((s) => s.wordId)));
      if (more.length === 0) break;
      slots.push({ wordId: more[0].id, isReview: true, slotIndex: slots.length });
    }
  }

  return slots.slice(0, 10);
}

export type PlayQueueItem = SessionQuestion & { cleared: boolean };

export function initPlayQueue(session: SessionQuestion[]): PlayQueueItem[] {
  return session.map((q) => ({ ...q, cleared: false }));
}

/** 正解時: スロットをクリア。全スロットクリアでセッション完了 */
export function markSlotCleared(queue: PlayQueueItem[], slotIndex: number): PlayQueueItem[] {
  return queue.map((q) => (q.slotIndex === slotIndex ? { ...q, cleared: true } : q));
}

export function isSessionComplete(queue: PlayQueueItem[]): boolean {
  const slots = new Set(queue.map((q) => q.slotIndex));
  for (const s of slots) {
    if (!queue.some((q) => q.slotIndex === s && q.cleared)) return false;
  }
  return slots.size > 0;
}

export function groupProgressLabel(group: VocabQuizGroup, learned: Record<string, boolean>): string {
  const n = group.wordIds.filter((id) => learned[id]).length;
  return `${n}/${group.nativeCount}`;
}

export function formatGroupSessionLabel(
  group: VocabQuizGroup,
  groups: VocabQuizGroup[],
): string {
  const chunksInUnit = groups.filter((g) => g.unitNum === group.unitNum).length;
  return `${group.unitLabel}（${group.chunkIndex + 1}/${chunksInUnit}）`;
}

export type NextSessionPlay = {
  mode: QuizMode;
  groupId?: string;
  coarsePos?: CoarsePos;
};

export type NextSessionInfo = {
  label: string;
  play: NextSessionPlay | null;
};

export function getNextSessionAfterComplete(
  dataset: VocabQuizDataset,
  mode: QuizMode,
  options: { groupId?: string; coarsePos?: CoarsePos },
): NextSessionInfo {
  const sorted = [...dataset.groups].sort(
    (a, b) => a.unitNum - b.unitNum || a.chunkIndex - b.chunkIndex,
  );

  if (mode === "level" && options.groupId) {
    const idx = sorted.findIndex((g) => g.id === options.groupId);
    const next = idx >= 0 ? sorted[idx + 1] : undefined;
    if (next) {
      return {
        label: formatGroupSessionLabel(next, sorted),
        play: { mode: "level", groupId: next.id },
      };
    }
    return { label: "", play: null };
  }

  if (mode === "random") {
    return { label: "ランダム出題", play: { mode: "random" } };
  }

  if (mode === "pos" && options.coarsePos) {
    const label = dataset.meta.coarsePosLabels[options.coarsePos];
    return { label: `${label}（もう一度）`, play: { mode: "pos", coarsePos: options.coarsePos } };
  }

  return { label: "", play: null };
}
