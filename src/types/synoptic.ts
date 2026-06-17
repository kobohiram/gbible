import type { BookId } from "./index";

export type PericopeRange = {
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
};

export type PericopePassage = {
  bookId: BookId;
  ranges: PericopeRange[];
};

export type MatchGroup = {
  id: string;
  strongs: string;
  wordIds: string[];
  reviewed: boolean;
};

export type Pericope = {
  id: string;
  title: string;
  passages: PericopePassage[];
  matchGroups: MatchGroup[];
};

export type PericopesFile = {
  version: number;
  pericopes: Pericope[];
};
