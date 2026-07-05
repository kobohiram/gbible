export type CoarsePos = "verb" | "noun" | "adj" | "prep" | "other";

export type QuizMode = "level" | "pos" | "random";

export type VocabQuizWord = {
  id: string;
  groupId: string;
  word: string;
  greek: string;
  answer: string;
  distractors: string[];
  kaisetsu: string;
  count: number | null;
  unit: string;
  unitNum: number;
  pos: string;
  coarsePos: CoarsePos;
};

export type VocabQuizGroup = {
  id: string;
  unitNum: number;
  unitLabel: string;
  chunkIndex: number;
  wordIds: string[];
  nativeCount: number;
};

export type VocabQuizMeta = {
  version: number;
  totalWords: number;
  totalGroups: number;
  chunkSize: number;
  coarsePosLabels: Record<CoarsePos, string>;
};

export type GroupStatus = "gray" | "yellow" | "green";

export type SessionQuestion = {
  wordId: string;
  isReview: boolean;
  slotIndex: number;
};

export type VocabQuizDataset = {
  words: VocabQuizWord[];
  groups: VocabQuizGroup[];
  meta: VocabQuizMeta;
  wordsById: Record<string, VocabQuizWord>;
  groupsById: Record<string, VocabQuizGroup>;
};
