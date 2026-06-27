"use client";

import { useEffect, useState } from "react";
import { Balloon } from "lucide-react";
import type { QuizQuestion } from "@/types/grammar";

type AnswerState = "unanswered" | "correct" | "wrong";

// ─── helper ──────────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getShuffledChoices(question: QuizQuestion) {
  return question.choices
    .map((choice, originalIndex) => ({
      choice,
      originalIndex,
      sortKey: hashString(`${question.id}:${originalIndex}`),
    }))
    .sort((a, b) => a.sortKey - b.sortKey);
}

// ─── BalloonIcon ─────────────────────────────────────────────────────────────

function BalloonIcon({
  balloonNumber,
  color,
  passed,
  active,
  isPopping,
  size = 68,
}: {
  balloonNumber: number;
  color: string;
  passed: boolean;
  active: boolean;
  isPopping: boolean;
  size?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <Balloon
          size={size}
          fill={passed ? "#d1fae5" : color}
          color={passed ? "#6ee7b7" : active ? "white" : color}
          strokeWidth={active ? 2 : 1.5}
          className={`transition-all duration-300 ${
            isPopping ? "scale-150 opacity-0" : "scale-100 opacity-100"
          } ${!passed ? "drop-shadow-md" : ""}`}
          aria-hidden
        />
        <span
          className={`absolute left-1/2 -translate-x-1/2 select-none font-bold leading-none ${
            passed ? "text-green-600" : "text-white"
          }`}
          style={{
            top: "28%",
            fontSize: size * 0.28,
            textShadow: passed ? "none" : "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          {passed ? "✓" : balloonNumber}
        </span>
      </div>
    </div>
  );
}

// ─── InlineQuizPanel ─────────────────────────────────────────────────────────

type InlineQuizPanelProps = {
  balloonKey: string;
  balloonNumber: number;
  lessonTitle: string;
  color: string;
  questions: QuizQuestion[];
  onPass: () => void;
  onHint: (sectionId: string) => void;
};

function InlineQuizPanel({
  balloonKey,
  balloonNumber,
  lessonTitle,
  color,
  questions,
  onPass,
  onHint,
}: InlineQuizPanelProps) {
  const [qIndex, setQIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>("unanswered");

  useEffect(() => {
    setQIndex(0);
    setAnswerState("unanswered");
  }, [balloonKey]);

  const currentQ = questions[qIndex];
  if (!currentQ) return null;

  function handleChoose(idx: number) {
    if (answerState !== "unanswered") return;
    setAnswerState(idx === currentQ.correctIndex ? "correct" : "wrong");
  }

  function handleNext() {
    if (qIndex + 1 < questions.length) {
      setQIndex((i) => i + 1);
      setAnswerState("unanswered");
    } else {
      setTimeout(() => {
        onPass();
      }, 500);
    }
  }

  function handleRetry() {
    setAnswerState("unanswered");
  }

  const choiceLabels = ["A", "B", "C", "D"];
  const displayedChoices = getShuffledChoices(currentQ);

  return (
    <div
      className="mt-3 rounded-xl border border-border bg-card"
      style={{ borderTop: `3px solid ${color}` }}
    >
      {/* Progress header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <span className="text-xs text-muted-foreground">
            #{balloonNumber} · {lessonTitle}
          </span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {qIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-1 bg-muted/30">
        <div
          className="h-full transition-all duration-400"
          style={{
            width: `${(qIndex / questions.length) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="px-4 py-4">
        {/* Question */}
        <p className="mb-4 text-sm font-semibold leading-snug">{currentQ.question}</p>

        {/* Choices */}
        <div className="space-y-2">
          {displayedChoices.map(({ choice, originalIndex }, i) => {
            let cls =
              "w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors flex items-start gap-2 ";
            if (answerState === "unanswered") {
              cls += "border-border hover:bg-muted/50 cursor-pointer";
            } else if (originalIndex === currentQ.correctIndex) {
              cls +=
                "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300";
            } else {
              cls += "border-border text-muted-foreground opacity-60";
            }
            return (
              <button
                key={originalIndex}
                type="button"
                onClick={() => handleChoose(originalIndex)}
                disabled={answerState !== "unanswered"}
                className={cls}
              >
                <span className="mt-px shrink-0 font-mono text-[10px] text-muted-foreground">
                  {choiceLabels[i]}.
                </span>
                <span className="leading-snug">{choice}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback: correct */}
        {answerState === "correct" && (
          <div className="mt-3 rounded-lg bg-green-50 px-3 py-2.5 dark:bg-green-900/20">
            <p className="text-xs font-semibold text-green-700 dark:text-green-300">✓ 正解！</p>
            <p className="mt-0.5 text-xs text-green-600 leading-relaxed dark:text-green-400">
              {currentQ.explanation}
            </p>
            <button
              type="button"
              onClick={handleNext}
              className="mt-2.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: color }}
            >
              {qIndex + 1 < questions.length ? "次の問題 →" : "完了！🎉"}
            </button>
          </div>
        )}

        {/* Feedback: wrong */}
        {answerState === "wrong" && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2.5 dark:bg-red-900/20">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">✗ もう一度！</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400"
              >
                再挑戦
              </button>
              <button
                type="button"
                onClick={() => onHint(currentQ.hintSectionId)}
                className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/50"
              >
                💡 ヒントを見る
              </button>
            </div>
          </div>
        )}

        {/* Hint link (unanswered state) */}
        {answerState === "unanswered" && (
          <button
            type="button"
            onClick={() => onHint(currentQ.hintSectionId)}
            className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            💡 ヒント（文法の説明へ）
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────────────────────────

type LessonBalloon = {
  lessonNumber: number;
  title: string;
  color: string;
  quiz: QuizQuestion[];
};

type BalloonEntry = {
  balloonNumber: number; // chapter-wide sequential: 1, 2, 3, 4, 5...
  balloonKey: string;    // "{lessonNum}-{groupIdx}" for progress tracking
  lessonNumber: number;
  lessonTitle: string;
  color: string;
  questions: QuizQuestion[];
};

type PanelProps = {
  lessons: LessonBalloon[];
  passedSet: Set<string>; // Set of balloonKeys like "1-0", "1-1"
  onPass: (lessonNumber: number, balloonIdx: number) => void;
  onHint: (sectionId: string) => void;
};

export function QuizBalloonPanel({ lessons, passedSet, onPass, onHint }: PanelProps) {
  const [activeBalloonKey, setActiveBalloonKey] = useState<string | null>(null);
  const [poppingKey, setPoppingKey] = useState<string | null>(null);

  // Compute flat balloon entries from lessons (chunk each lesson's quiz by 5)
  const balloons: BalloonEntry[] = [];
  let balloonNumber = 1;
  for (const lesson of lessons) {
    const groups = chunkArray(lesson.quiz, 5);
    for (let i = 0; i < groups.length; i++) {
      balloons.push({
        balloonNumber: balloonNumber++,
        balloonKey: `${lesson.lessonNumber}-${i}`,
        lessonNumber: lesson.lessonNumber,
        lessonTitle: lesson.title,
        color: lesson.color,
        questions: groups[i],
      });
    }
  }

  const passedCount = balloons.filter((b) => passedSet.has(b.balloonKey)).length;
  const allPassed = passedCount === balloons.length && balloons.length > 0;

  function handleBalloonClick(key: string) {
    if (passedSet.has(key)) return;
    setActiveBalloonKey((prev) => (prev === key ? null : key));
  }

  function handlePass(entry: BalloonEntry) {
    setPoppingKey(entry.balloonKey);
    setTimeout(() => {
      setPoppingKey(null);
      onPass(entry.lessonNumber, Number(entry.balloonKey.split("-")[1]));
      // Auto-advance to next unpassed balloon
      const next = balloons.find(
        (b) => !passedSet.has(b.balloonKey) && b.balloonKey !== entry.balloonKey,
      );
      setActiveBalloonKey(next?.balloonKey ?? null);
    }, 600);
  }

  const activeEntry = balloons.find((b) => b.balloonKey === activeBalloonKey);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="pane-header flex shrink-0 items-center justify-between px-4 py-2">
        <span className="pane-header-label text-sm font-semibold">クイズ</span>
        <span className="text-xs text-muted-foreground">
          {passedCount}/{balloons.length} 合格
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* All-passed banner */}
        {allPassed && (
          <div className="mb-4 rounded-xl bg-green-50 px-4 py-4 text-center dark:bg-green-900/20">
            <p className="text-2xl">🎉</p>
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">全課制覇！</p>
          </div>
        )}

        {/* Guide text */}
        {!allPassed && (
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            バルーンを選んで問題に挑戦。全問正解でバルーンが変わります。
          </p>
        )}

        {/* Balloon grid — all balloons in one flat row */}
        <div className="flex flex-wrap gap-x-5 gap-y-6">
          {balloons.map((entry) => {
            const isPassed = passedSet.has(entry.balloonKey);
            const isActive = activeBalloonKey === entry.balloonKey;
            const isPopping = poppingKey === entry.balloonKey;
            return (
              <div key={entry.balloonKey} className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleBalloonClick(entry.balloonKey)}
                  disabled={isPassed}
                  className={`transition-transform ${
                    isPassed
                      ? "cursor-default opacity-70"
                      : isActive
                        ? "scale-110 cursor-pointer"
                        : "cursor-pointer hover:scale-105 active:scale-95"
                  }`}
                  title={
                    isPassed
                      ? `#${entry.balloonNumber}：合格済み`
                      : `#${entry.balloonNumber}：${entry.lessonTitle}`
                  }
                  aria-pressed={isActive}
                >
                  <BalloonIcon
                    balloonNumber={entry.balloonNumber}
                    color={entry.color}
                    passed={isPassed}
                    active={isActive}
                    isPopping={isPopping}
                    size={68}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Inline quiz panel — below balloons */}
        {activeEntry && !passedSet.has(activeEntry.balloonKey) && (
          <InlineQuizPanel
            key={activeEntry.balloonKey}
            balloonKey={activeEntry.balloonKey}
            balloonNumber={activeEntry.balloonNumber}
            lessonTitle={activeEntry.lessonTitle}
            color={activeEntry.color}
            questions={activeEntry.questions}
            onPass={() => handlePass(activeEntry)}
            onHint={onHint}
          />
        )}

        {/* Progress bar */}
        {balloons.length > 0 && (
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>進捗</span>
              <span>{Math.round((passedCount / balloons.length) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-green-400 transition-all duration-700"
                style={{ width: `${(passedCount / balloons.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
