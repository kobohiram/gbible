"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { CoarsePos, QuizMode, SessionQuestion, VocabQuizWord } from "@/types/vocab-quiz";
import { buildSession, shuffleChoices } from "@/lib/vocab-quiz";
import { postVocabProgressToDb, saveVocabProgress } from "@/lib/vocab-quiz-progress";
import type { VocabQuizDataset } from "@/types/vocab-quiz";
import { VocabQuizCard, VocabQuizCardBody, VocabQuizCardHeader, QuizCloseButton } from "./VocabQuizCard";

type Props = {
  dataset: VocabQuizDataset;
  mode: QuizMode;
  groupId?: string;
  coarsePos?: CoarsePos;
  learned: Record<string, boolean>;
  onLearnedChange: (map: Record<string, boolean>) => void;
  onSessionComplete: () => void;
  onExit: () => void;
};

function normalizeChoice(s: string): string {
  return s.trim().normalize("NFC");
}

function shuffleSession(items: SessionQuestion[]): SessionQuestion[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dequeueNext(
  queue: SessionQuestion[],
  cleared: Set<number>,
): { item: SessionQuestion | null; queue: SessionQuestion[] } {
  const q = [...queue];
  while (q.length > 0) {
    const item = q.shift()!;
    if (!cleared.has(item.slotIndex)) return { item, queue: q };
  }
  return { item: null, queue: q };
}

function choiceStyle(
  feedback: "correct" | "wrong" | null,
  isSelected: boolean,
  isCorrect: boolean,
): string {
  if (!feedback) return "bg-slate-100 hover:bg-slate-200 active:bg-slate-300";
  if (isCorrect) return "bg-emerald-100 text-emerald-950";
  if (isSelected && !isCorrect) return "bg-red-100 text-red-950";
  return "bg-slate-100 opacity-40";
}

export function VocabQuizPlayer({
  dataset,
  mode,
  groupId,
  coarsePos,
  learned,
  onLearnedChange,
  onSessionComplete,
  onExit,
}: Props) {
  const { data: session } = useSession();

  // セッション開始時の learned で固定（正解後の再構築で UI がリセットされないようにする）
  const learnedAtStart = useRef(learned);
  const sessionQuestions = useMemo(
    () => buildSession(dataset, learnedAtStart.current, mode, { groupId, coarsePos }),
    [dataset, mode, groupId, coarsePos],
  );

  const [pending, setPending] = useState<SessionQuestion[]>([]);
  const [clearedSlots, setClearedSlots] = useState<Set<number>>(() => new Set());
  const [current, setCurrent] = useState<SessionQuestion | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const initial = shuffleSession(sessionQuestions);
    const { item, queue } = dequeueNext(initial, new Set());
    setPending(queue);
    setCurrent(item);
    setClearedSlots(new Set());
    setDone(false);
    setFeedback(null);
    setSelectedChoice(null);
  }, [sessionQuestions]);

  const word: VocabQuizWord | undefined = current
    ? dataset.wordsById[current.wordId]
    : undefined;

  const choices = useMemo(
    () => (word ? shuffleChoices(word.id, word.answer, word.distractors) : []),
    [word],
  );

  const totalSlots = sessionQuestions.length;
  const clearedCount = clearedSlots.size;

  const markLearned = useCallback(
    (wordId: string) => {
      if (learned[wordId]) return;
      const next = { ...learned, [wordId]: true };
      onLearnedChange(next);
      saveVocabProgress(next);
      if (session?.user?.email) void postVocabProgressToDb(wordId);
    },
    [learned, onLearnedChange, session?.user?.email],
  );

  function advanceQueue(cleared: Set<number>, queue: SessionQuestion[]) {
    const { item, queue: rest } = dequeueNext(queue, cleared);
    setPending(rest);
    setCurrent(item);
    setFeedback(null);
    setSelectedChoice(null);
    if (!item && cleared.size >= totalSlots) {
      setDone(true);
      onSessionComplete();
    }
  }

  function handleChoice(choice: string) {
    if (!current || !word || feedback) return;
    const normalized = normalizeChoice(choice);
    const answer = normalizeChoice(word.answer);
    setSelectedChoice(choice);

    if (normalized === answer) {
      setFeedback("correct");
      markLearned(word.id);
      const newCleared = new Set(clearedSlots);
      newCleared.add(current.slotIndex);
      setClearedSlots(newCleared);
    } else {
      setFeedback("wrong");
    }
  }

  function handleWrongNext() {
    if (!current) return;
    const requeued = [...pending, current];
    advanceQueue(clearedSlots, requeued);
  }

  function handleCorrectNext() {
    if (!current) return;
    const newCleared = new Set(clearedSlots);
    newCleared.add(current.slotIndex);
    setClearedSlots(newCleared);

    if (newCleared.size >= totalSlots) {
      setDone(true);
      onSessionComplete();
      return;
    }
    advanceQueue(newCleared, pending);
  }

  if (sessionQuestions.length === 0) {
    return (
      <VocabQuizCard fixedHeight>
        <VocabQuizCardHeader borderless>
          <span />
          <QuizCloseButton onClick={onExit} />
        </VocabQuizCardHeader>
        <VocabQuizCardBody className="justify-center">
          <p className="text-center text-sm text-muted-foreground">
            {mode === "pos"
              ? "この単元に該当する品詞の単語がありません。"
              : "出題できる単語がありません。"}
          </p>
        </VocabQuizCardBody>
      </VocabQuizCard>
    );
  }

  if (done || (!current && clearedCount >= totalSlots)) {
    return (
      <VocabQuizCard fixedHeight>
        <VocabQuizCardHeader borderless>
          <span />
          <QuizCloseButton onClick={onExit} />
        </VocabQuizCardHeader>
        <VocabQuizCardBody className="justify-center">
          <p className="text-center text-lg font-bold text-emerald-700">10問クリア！</p>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            おつかれさまです。進捗が保存されました。
          </p>
        </VocabQuizCardBody>
      </VocabQuizCard>
    );
  }

  if (!word || !current) return null;

  const answerNorm = normalizeChoice(word.answer);

  return (
    <VocabQuizCard fixedHeight>
      <VocabQuizCardHeader borderless>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>
            {clearedCount}/{totalSlots} 正解
          </span>
          {current.isReview && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              復習
            </span>
          )}
        </div>
        <QuizCloseButton onClick={onExit} />
      </VocabQuizCardHeader>

      <VocabQuizCardBody className="min-h-0">
        <div className="shrink-0 text-center">
          <p
            className="flex h-16 items-center justify-center font-greek text-3xl font-bold text-foreground"
            dir="ltr"
          >
            {word.greek || word.word}
          </p>
          <p className="h-4 text-center text-xs text-muted-foreground">{word.pos || "\u00A0"}</p>
        </div>

        <div className="mt-3 flex h-[14rem] shrink-0 flex-col gap-2">
          {choices.map((c, i) => {
            const isSelected = selectedChoice === c;
            const isCorrect = normalizeChoice(c) === answerNorm;

            return (
              <button
                key={`${i}-${c}`}
                type="button"
                disabled={!!feedback}
                onClick={() => handleChoice(c)}
                className={`min-h-12 shrink-0 cursor-pointer rounded-xl px-3 py-2.5 text-left text-base font-medium leading-snug transition-colors duration-150 ${choiceStyle(feedback, isSelected, isCorrect)}`}
              >
                {c}
              </button>
            );
          })}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {feedback === "wrong" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold text-red-700">
                不正解 — 正解は「{word.answer}」
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{word.kaisetsu}</p>
              <p className="mt-2 text-xs text-muted-foreground">後でもう一度出題されます</p>
            </div>
          )}

          {feedback === "correct" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold text-emerald-800">正解！</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{word.kaisetsu}</p>
            </div>
          )}
        </div>

        <div className="mt-3 h-11 shrink-0">
          {feedback === "wrong" && (
            <button
              type="button"
              onClick={handleWrongNext}
              className="h-full w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              次へ
            </button>
          )}
          {feedback === "correct" && (
            <button
              type="button"
              onClick={handleCorrectNext}
              className="h-full w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              {clearedCount >= totalSlots ? "完了" : "次へ"}
            </button>
          )}
        </div>
      </VocabQuizCardBody>
    </VocabQuizCard>
  );
}
