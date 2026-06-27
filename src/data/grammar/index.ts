import type { GrammarChapter } from "@/types/grammar";
import { chapter1 } from "./chapter-1";
import { chapter2 } from "./chapter-2";
import { chapter3 } from "./chapter-3";
import { chapter4 } from "./chapter-4";
import { chapter5 } from "./chapter-5";

// 第3章以降が本編、第1・2章は付録として末尾に置く
export const grammarChapters: GrammarChapter[] = [chapter3, chapter4, chapter5, chapter1, chapter2];

export function getChapter(num: number): GrammarChapter | undefined {
  return grammarChapters.find((c) => c.chapterNumber === num);
}

export function getLesson(chapterNum: number, lessonNum: number) {
  return getChapter(chapterNum)?.lessons.find((l) => l.lessonNumber === lessonNum);
}
