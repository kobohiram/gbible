"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { GrammarChapter, Lesson } from "@/types/grammar";
import { GrammarToc } from "./GrammarToc";
import { GrammarContent } from "./GrammarContent";
import { QuizBalloonPanel } from "./QuizBalloonPanel";

const STORAGE_KEY = "grammar_progress_v1";

function loadProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveProgress(map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

async function syncProgressFromDB(chapterNumber: number): Promise<Record<string, boolean>> {
  try {
    const res = await fetch(`/api/grammar-progress?chapter=${chapterNumber}`);
    if (!res.ok) return {};
    const { passed } = await res.json();
    const map: Record<string, boolean> = {};
    for (const row of passed as {
      chapter_number: number;
      lesson_number: number;
      balloon_index: number;
    }[]) {
      map[`${row.chapter_number}-${row.lesson_number}-${row.balloon_index}`] = true;
    }
    return map;
  } catch {
    return {};
  }
}

async function postProgressToDb(
  chapterNumber: number,
  lessonNumber: number,
  balloonIndex: number,
) {
  try {
    await fetch("/api/grammar-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterNumber, lessonNumber, balloonIndex }),
    });
  } catch {
    // silent fail — localStorage already saved
  }
}

// セクションID "chapterNum-lessonNum-rest" から課番号を取り出す
function parseLessonFromSectionId(
  sectionId: string,
): { chapterNum: number; lessonNum: number } | null {
  const m = sectionId.match(/^(\d+)-(\d+)-/);
  if (!m) return null;
  return { chapterNum: Number(m[1]), lessonNum: Number(m[2]) };
}

type Props = {
  chapters: GrammarChapter[];
  chapter: GrammarChapter;
  lesson: Lesson;
};

type MobileTab = "toc" | "grammar" | "quiz";

export function GrammarShell({ chapters, chapter, lesson }: Props) {
  const { data: session } = useSession();
  const [passedMap, setPassedMap] = useState<Record<string, boolean>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("grammar");

  // ペイン2に表示する課番号（URLの課と異なる場合はヒント元の課を表示）
  const [displayLessonNum, setDisplayLessonNum] = useState<number>(lesson.lessonNumber);

  // URLの課が変わったらペイン2も戻す
  useEffect(() => {
    setDisplayLessonNum(lesson.lessonNumber);
    setHighlightId(null);
  }, [lesson.lessonNumber]);

  // 実際にペイン2に表示する Lesson オブジェクト
  const displayLesson =
    chapter.lessons.find((l) => l.lessonNumber === displayLessonNum) ?? lesson;

  // Load progress: localStorage first, then merge DB data if logged in
  useEffect(() => {
    const local = loadProgress();
    setPassedMap(local);
    if (session?.user?.email) {
      syncProgressFromDB(chapter.chapterNumber).then((dbMap) => {
        setPassedMap((prev) => {
          const merged = { ...prev, ...dbMap };
          saveProgress(merged);
          return merged;
        });
      });
    }
  }, [session?.user?.email, chapter.chapterNumber]);

  // ハイライトを3秒後にクリア
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightId]);

  const handlePass = useCallback(
    (lessonNumber: number, balloonIdx: number) => {
      const key = `${chapter.chapterNumber}-${lessonNumber}-${balloonIdx}`;
      setPassedMap((prev) => {
        const next = { ...prev, [key]: true };
        saveProgress(next);
        return next;
      });
      if (session?.user?.email) {
        postProgressToDb(chapter.chapterNumber, lessonNumber, balloonIdx);
      }
    },
    [chapter.chapterNumber, session?.user?.email],
  );

  const handleHint = useCallback(
    (sectionId: string) => {
      const parsed = parseLessonFromSectionId(sectionId);
      if (parsed) {
        // ヒントが別の課にあれば、ペイン2をその課に切り替え
        if (parsed.lessonNum !== displayLessonNum) {
          setDisplayLessonNum(parsed.lessonNum);
        }
      }
      setHighlightId(sectionId);
      setMobileTab("grammar");
    },
    [displayLessonNum],
  );

  // passedSet: Set of "{lessonNum}-{balloonIdx}" strings for QuizBalloonPanel
  const passedSet = new Set<string>(
    Object.entries(passedMap)
      .filter(([key, passed]) => {
        if (!passed) return false;
        // Key format: "{chapterNum}-{lessonNum}-{balloonIdx}"
        const [chStr] = key.split("-");
        return Number(chStr) === chapter.chapterNumber;
      })
      .map(([key]) => {
        // Strip the chapter prefix: "{chapterNum}-{lessonNum}-{balloonIdx}" → "{lessonNum}-{balloonIdx}"
        const parts = key.split("-");
        return `${parts[1]}-${parts[2]}`;
      }),
  );

  const lessonBalloons = chapter.lessons.map((l) => ({
    lessonNumber: l.lessonNumber,
    title: l.title,
    color: l.color,
    quiz: l.quiz,
  }));

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />

      {/* ── Mobile tab bar ── */}
      <div className="flex shrink-0 border-b border-border bg-background md:hidden">
        {(["toc", "grammar", "quiz"] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${
              mobileTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
          >
            {tab === "toc" ? "📋 目次" : tab === "grammar" ? "📖 文法" : "🎯 クイズ"}
          </button>
        ))}
      </div>

      {/* ── Desktop: 3-pane layout ── */}
      <div className="hidden min-h-0 flex-1 md:flex">
        <ResizablePanelGroup id="grammar-panes" orientation="horizontal" className="flex-1">
          {/* Pane 1: TOC */}
          <ResizablePanel id="toc" defaultSize="18%" minSize="14%" maxSize="28%">
            <div className="pane-surface h-full">
              <GrammarToc
                chapters={chapters}
                currentChapter={chapter.chapterNumber}
                currentLesson={lesson.lessonNumber}
                passedMap={passedMap}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Pane 2: Quiz balloons */}
          <ResizablePanel id="quiz" defaultSize="32%" minSize="22%">
            <div className="pane-surface h-full">
              <QuizBalloonPanel
                lessons={lessonBalloons}
                passedSet={passedSet}
                onPass={handlePass}
                onHint={handleHint}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Pane 3: Grammar content */}
          <ResizablePanel id="content" defaultSize="50%" minSize="30%">
            <div className="pane-surface flex h-full flex-col overflow-hidden">
              {/* ヒントで別課を表示中の場合のバナー */}
              {displayLesson.lessonNumber !== lesson.lessonNumber && (
                <div className="flex shrink-0 items-center justify-between bg-amber-50 px-4 py-1.5 text-xs dark:bg-amber-950/40">
                  <span className="text-amber-700 dark:text-amber-300">
                    💡 ヒントのため第{displayLesson.lessonNumber}課を表示中
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayLessonNum(lesson.lessonNumber);
                      setHighlightId(null);
                    }}
                    className="ml-3 rounded px-2 py-0.5 font-semibold text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  >
                    ← 戻る
                  </button>
                </div>
              )}
              <div className="border-b border-border px-5 py-3">
                <h1 className="text-base font-bold">
                  第{displayLesson.lessonNumber}課　{displayLesson.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  第{chapter.chapterNumber}章　{chapter.title}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <GrammarContent
                  content={displayLesson.content}
                  highlightSectionId={highlightId}
                />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* ── Mobile: single pane ── */}
      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        {mobileTab === "toc" ? (
          <div className="flex-1 overflow-y-auto">
            <GrammarToc
              chapters={chapters}
              currentChapter={chapter.chapterNumber}
              currentLesson={lesson.lessonNumber}
              passedMap={passedMap}
              onNavigate={() => setMobileTab("grammar")}
            />
          </div>
        ) : mobileTab === "grammar" ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {displayLesson.lessonNumber !== lesson.lessonNumber && (
              <div className="flex shrink-0 items-center justify-between bg-amber-50 px-3 py-1.5 text-xs dark:bg-amber-950/40">
                <span className="text-amber-700 dark:text-amber-300">
                  💡 ヒントのため第{displayLesson.lessonNumber}課を表示中
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayLessonNum(lesson.lessonNumber);
                    setHighlightId(null);
                  }}
                  className="ml-2 rounded px-2 py-0.5 font-semibold text-amber-700 hover:bg-amber-100"
                >
                  ← 戻る
                </button>
              </div>
            )}
            <div className="border-b border-border px-4 py-3">
              <h1 className="text-base font-bold">
                第{displayLesson.lessonNumber}課　{displayLesson.title}
              </h1>
            </div>
            <div className="flex-1 overflow-y-auto">
              <GrammarContent
                content={displayLesson.content}
                highlightSectionId={highlightId}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <QuizBalloonPanel
              lessons={lessonBalloons}
              passedSet={passedSet}
              onPass={handlePass}
              onHint={handleHint}
            />
          </div>
        )}
      </div>
    </div>
  );
}
