"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GrammarChapter } from "@/types/grammar";

type Props = {
  chapters: GrammarChapter[];
  currentChapter: number;
  currentLesson: number;
  passedMap: Record<string, boolean>;
  /** モバイルで課をタップした後に呼び出すコールバック */
  onNavigate?: () => void;
};

const ARROW_BTN =
  "flex-1 rounded-lg border border-border bg-muted/30 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30";

export function GrammarToc({ chapters, currentChapter, currentLesson, passedMap, onNavigate }: Props) {
  const router = useRouter();

  const chapter = chapters.find((c) => c.chapterNumber === currentChapter) ?? chapters[0];

  const prevLesson = chapter.lessons.find((l) => l.lessonNumber === currentLesson - 1);
  const nextLesson = chapter.lessons.find((l) => l.lessonNumber === currentLesson + 1);

  function handleChapterChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const chNum = Number(e.target.value);
    const ch = chapters.find((c) => c.chapterNumber === chNum);
    if (ch) {
      router.push(`/grammar/${chNum}/${ch.lessons[0].lessonNumber}`);
      onNavigate?.();
    }
  }

  return (
    <nav className="flex h-full flex-col">
      {/* Chapter dropdown */}
      <div className="pane-header shrink-0 px-3 py-2.5">
        <select
          id="chapter-select"
          value={currentChapter}
          onChange={handleChapterChange}
          className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {chapters.map((c) => (
            <option key={c.chapterNumber} value={c.chapterNumber}>
              {c.isAppendix ? `付録${c.chapterNumber}　${c.title}` : `第${c.chapterNumber}章　${c.title}`}
            </option>
          ))}
        </select>
      </div>

      {/* Lesson list for current chapter */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          {chapter.lessons.map((lesson) => {
            // A lesson is "passed" when all its balloon groups are passed
            const balloonCount = Math.ceil(lesson.quiz.length / 5);
            const isPassed =
              balloonCount > 0 &&
              Array.from({ length: balloonCount }, (_, i) =>
                passedMap[`${chapter.chapterNumber}-${lesson.lessonNumber}-${i}`] ?? false,
              ).every(Boolean);
            const isCurrent = lesson.lessonNumber === currentLesson;

            return (
              <Link
                key={`${chapter.chapterNumber}-${lesson.lessonNumber}`}
                href={`/grammar/${chapter.chapterNumber}/${lesson.lessonNumber}`}
                onClick={onNavigate}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isCurrent
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground/80 hover:bg-muted/50"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: lesson.color }}
                />
                <span className="flex-1 leading-snug">
                  第{lesson.lessonNumber}課　{lesson.title}
                </span>
                {isPassed && (
                  <span className="text-xs text-green-500" title="合格済み">
                    ✓
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Prev / Next navigation */}
      <div className="shrink-0 border-t border-border px-3 py-2.5">
        <div className="flex gap-2">
          {prevLesson ? (
            <Link
              href={`/grammar/${chapter.chapterNumber}/${prevLesson.lessonNumber}`}
              className={ARROW_BTN}
            >
              ← 前の課
            </Link>
          ) : (
            <button type="button" disabled className={ARROW_BTN}>← 前の課</button>
          )}
          {nextLesson ? (
            <Link
              href={`/grammar/${chapter.chapterNumber}/${nextLesson.lessonNumber}`}
              className={ARROW_BTN}
            >
              次の課 →
            </Link>
          ) : (
            <button type="button" disabled className={ARROW_BTN}>次の課 →</button>
          )}
        </div>
      </div>
    </nav>
  );
}
