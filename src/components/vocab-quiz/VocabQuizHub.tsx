"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type { CoarsePos, QuizMode, VocabQuizGroup } from "@/types/vocab-quiz";
import { getCurrentUnitNum, getGroupStatus, getNextSessionAfterComplete } from "@/lib/vocab-quiz";
import {
  loadVocabProgress,
  saveVocabProgress,
  syncVocabProgressFromDB,
} from "@/lib/vocab-quiz-progress";
import { useVocabQuizDataset } from "./useVocabQuizDataset";
import { VocabQuizPlayer } from "./VocabQuizPlayer";
import { VocabQuizModal } from "./VocabQuizModal";
import { VocabQuizCard, VocabQuizCardBody, VocabQuizCardHeader, QuizCloseButton } from "./VocabQuizCard";
import { VocabQuizProgressBar } from "./VocabQuizProgressBar";
import { VocabQuizWordMatrix } from "./VocabQuizWordMatrix";

const COARSE_POS: CoarsePos[] = ["verb", "noun", "adj", "prep", "other"];

const MODE_PREVIEW: Record<QuizMode, { greek: string; hint: string }> = {
  pos: { greek: "ποιέω", hint: "品詞で絞り込み" },
  random: { greek: "ἀγάπη", hint: "未習得から出題" },
  level: { greek: "λόγος", hint: "単元順に10問" },
};

type PlayState = {
  mode: QuizMode;
  groupId?: string;
  coarsePos?: CoarsePos;
} | null;

function findActiveGroupId(
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

export function VocabQuizHub() {
  const { data: session } = useSession();
  const { dataset, loading, error } = useVocabQuizDataset();
  const [learned, setLearned] = useState<Record<string, boolean>>({});
  const [play, setPlay] = useState<PlayState>(null);
  const [posPickerOpen, setPosPickerOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    const local = loadVocabProgress();
    setLearned(local);
    if (session?.user?.email) {
      syncVocabProgressFromDB().then((db) => {
        setLearned((prev) => {
          const merged = { ...prev, ...db };
          saveVocabProgress(merged);
          return merged;
        });
      });
    }
  }, [session?.user?.email]);

  const learnedCount = dataset
    ? dataset.words.filter((w) => learned[w.id]).length
    : 0;

  const currentUnit = dataset ? getCurrentUnitNum(dataset.groups, learned) : 1;
  const currentUnitLabel =
    dataset?.groups.find((g) => g.unitNum === currentUnit)?.unitLabel ?? "";

  const activeGroupId = useMemo(
    () => (dataset ? findActiveGroupId(dataset.groups, learned, currentUnit) : undefined),
    [dataset, learned, currentUnit],
  );

  const closeAll = useCallback(() => {
    setPlay(null);
    setPosPickerOpen(false);
  }, []);

  const startLevel = useCallback(() => {
    if (!activeGroupId) return;
    setSessionKey((k) => k + 1);
    setPlay({ mode: "level", groupId: activeGroupId });
  }, [activeGroupId]);

  const startRandom = useCallback(() => {
    setSessionKey((k) => k + 1);
    setPlay({ mode: "random" });
  }, []);

  const startPos = useCallback((pos: CoarsePos) => {
    setPosPickerOpen(false);
    setSessionKey((k) => k + 1);
    setPlay({ mode: "pos", coarsePos: pos });
  }, []);

  const nextSession = useMemo(() => {
    if (!dataset || !play) return null;
    return getNextSessionAfterComplete(dataset, play.mode, {
      groupId: play.groupId,
      coarsePos: play.coarsePos,
    });
  }, [dataset, play]);

  const continueNext = useCallback(() => {
    if (!nextSession?.play) return;
    setSessionKey((k) => k + 1);
    setPlay(nextSession.play);
  }, [nextSession]);

  if (loading) {
    return (
      <section className="border-b border-border bg-muted/20 px-6 py-10">
        <p className="text-center text-sm text-muted-foreground">クイズを読み込み中…</p>
      </section>
    );
  }

  if (error || !dataset) {
    return (
      <section className="border-b border-border bg-muted/20 px-6 py-10">
        <p className="text-center text-sm text-red-600">{error ?? "データがありません"}</p>
      </section>
    );
  }

  return (
    <>
      <section id="vocab-quiz" className="border-b border-primary/20 bg-gradient-to-b from-primary/5 to-background px-6 py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              ギリシャ語 単語クイズ
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              新約ギリシャ語エレメンツ準拠・全{dataset.meta.totalWords}語
            </p>
            <div className="mx-auto mt-4 max-w-md">
              <VocabQuizProgressBar current={learnedCount} total={dataset.meta.totalWords} />
            </div>
            {currentUnitLabel && (
              <p className="mt-2 text-xs text-muted-foreground">現在の単元: {currentUnitLabel}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ModeCard
              title="品詞別"
              preview={MODE_PREVIEW.pos}
              subtitle="全単元から出題"
              onClick={() => setPosPickerOpen(true)}
            />
            <ModeCard
              title="ランダム"
              preview={MODE_PREVIEW.random}
              subtitle="未習得を優先"
              onClick={startRandom}
            />
            <ModeCard
              title="単元別"
              preview={MODE_PREVIEW.level}
              subtitle={currentUnitLabel || `第${currentUnit}単元`}
              onClick={startLevel}
            />
          </div>

          <VocabQuizWordMatrix words={dataset.words} learned={learned} />
        </div>
      </section>

      <VocabQuizModal open={!!play} onClose={closeAll}>
        {play && (
          <VocabQuizPlayer
            key={`${play.mode}-${play.groupId ?? ""}-${play.coarsePos ?? ""}-${sessionKey}`}
            dataset={dataset}
            mode={play.mode}
            groupId={play.groupId}
            coarsePos={play.coarsePos}
            learned={learned}
            onLearnedChange={setLearned}
            onSessionComplete={() => {}}
            onExit={closeAll}
            nextSessionLabel={nextSession?.label}
            onContinueNext={nextSession?.play ? continueNext : undefined}
          />
        )}
      </VocabQuizModal>

      <VocabQuizModal open={posPickerOpen} onClose={() => setPosPickerOpen(false)}>
        <VocabQuizCard fixedHeight>
          <VocabQuizCardHeader borderless>
            <span className="text-[10px] font-semibold text-foreground">品詞を選ぶ</span>
            <QuizCloseButton onClick={() => setPosPickerOpen(false)} />
          </VocabQuizCardHeader>
          <VocabQuizCardBody>
            <p className="mb-4 text-center text-xs text-muted-foreground">
              全単元の単語から出題します
            </p>
            <div className="grid gap-2">
              {COARSE_POS.map((pos) => {
                const inPos = dataset.words.filter((w) => w.coarsePos === pos);
                const total = inPos.length;
                const learnedInPos = inPos.filter((w) => learned[w.id]).length;
                return (
                  <button
                    key={pos}
                    type="button"
                    disabled={total === 0}
                    onClick={() => startPos(pos)}
                    className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/80 active:bg-accent/70 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {dataset.meta.coarsePosLabels[pos]}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {learnedInPos}/{total}語
                    </span>
                  </button>
                );
              })}
            </div>
          </VocabQuizCardBody>
        </VocabQuizCard>
      </VocabQuizModal>
    </>
  );
}

function ModeCard({
  title,
  preview,
  subtitle,
  onClick,
}: {
  title: string;
  preview: { greek: string; hint: string };
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <VocabQuizCard as="button" onClick={onClick} className="hover:border-primary/30">
      <VocabQuizCardHeader>
        <span className="text-sm font-bold text-foreground">{title}</span>
        <span className="text-[10px] text-muted-foreground">10問</span>
      </VocabQuizCardHeader>
      <VocabQuizCardBody>
        <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {preview.hint}
        </p>
        <p className="mt-3 text-center font-greek text-4xl font-bold text-foreground" dir="ltr">
          {preview.greek}
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">{subtitle}</p>
      </VocabQuizCardBody>
    </VocabQuizCard>
  );
}
