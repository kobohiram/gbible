"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Award, CheckCircle2 } from "lucide-react";
import {
  ALPHABET_DATASET,
  ALPHABET_TABLE,
  ALPHABET_UNITS,
  ORDERED_UNITS,
  SYLLABLE_TABLE,
} from "@/data/alphabet-quiz";
import {
  findActiveGroupId,
  formatGroupSessionLabel,
  getNextSessionAfterComplete,
  isUnitCleared,
} from "@/lib/vocab-quiz";
import {
  loadVocabProgress,
  saveVocabProgress,
  syncVocabProgressFromDB,
} from "@/lib/vocab-quiz-progress";
import { VocabQuizPlayer } from "./VocabQuizPlayer";
import { VocabQuizModal } from "./VocabQuizModal";
import { VocabQuizProgressBar } from "./VocabQuizProgressBar";

const dataset = ALPHABET_DATASET;

/** アルファベット読み方クイズ（学問的発音）。進み具合は単語クイズと同じ保存先に入る */
export function AlphabetQuizHub() {
  const { data: session } = useSession();
  const [learned, setLearned] = useState<Record<string, boolean>>({});
  const [groupId, setGroupId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [tableOpen, setTableOpen] = useState(false);

  useEffect(() => {
    setLearned(loadVocabProgress());
    if (session?.user?.email) {
      syncVocabProgressFromDB().then((db) => {
        setLearned((prev) => {
          const merged = { ...loadVocabProgress(), ...prev, ...db };
          saveVocabProgress(merged);
          return merged;
        });
      });
    }
  }, [session?.user?.email]);

  const units = useMemo(
    () =>
      ALPHABET_UNITS.map((u) => {
        const groups = dataset.groups.filter((g) => g.unitNum === u.unitNum);
        const words = dataset.words.filter((w) => w.unitNum === u.unitNum);
        return {
          ...u,
          total: words.length,
          done: words.filter((w) => learned[w.id]).length,
          cleared: isUnitCleared(groups, learned),
        };
      }),
    [learned],
  );
  const learnedCount = dataset.words.filter((w) => learned[w.id]).length;
  const allCleared = units.every((u) => u.cleared);

  const start = useCallback(
    (unitNum: number) => {
      // 単語クイズ側で進んだ分も含めて、最新の保存内容から始める
      const merged = { ...loadVocabProgress(), ...learned };
      setLearned(merged);
      const id = findActiveGroupId(dataset.groups, merged, unitNum);
      if (!id) return;
      setSessionKey((k) => k + 1);
      setGroupId(id);
    },
    [learned],
  );

  const nextSession = useMemo(
    () => (groupId ? getNextSessionAfterComplete(dataset, "level", { groupId }) : null),
    [groupId],
  );
  const stageLabel = groupId ? formatGroupSessionLabel(dataset.groupsById[groupId], dataset.groups) : "";

  return (
    <>
      <section id="alphabet-quiz" className="border-b border-primary/20 bg-background px-6 py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              アルファベット 読み方クイズ
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ギリシャ語の文字を正しく読めるように。学問的発音（エラスムス式）・全{dataset.words.length}問
            </p>
            <div className="mx-auto mt-4 max-w-md">
              <VocabQuizProgressBar current={learnedCount} total={dataset.words.length} unit="問" />
            </div>
          </div>

          {allCleared && (
            <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-800">
              <Award className="size-6" strokeWidth={1.75} />
              <span className="text-base font-extrabold">アルファベット達成！</span>
            </div>
          )}

          <div className="mx-auto max-w-2xl">
            <p className="mb-2 text-center text-sm font-semibold text-foreground">
              まずは歌で覚えよう
            </p>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
              <iframe
                src="https://www.youtube-nocookie.com/embed/7yoTaPnAceI"
                title="ギリシャ語アルファベットを歌って覚えよう（工房ヒラム）"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {units.map((u) => (
              <button
                key={u.unitNum}
                type="button"
                onClick={() => start(u.unitNum)}
                className="rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-shadow hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">ステップ {u.unitNum}</span>
                  {u.cleared ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      <CheckCircle2 className="size-3.5" /> 達成
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {u.done}/{u.total}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-center font-greek text-3xl font-bold text-foreground" dir="ltr">
                  {u.preview}
                </p>
                <p className="mt-3 text-sm font-bold text-foreground">{u.label}</p>
                <p className="text-xs text-muted-foreground">{u.description}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.round((u.done / u.total) * 100)}%` }}
                  />
                </div>
              </button>
            ))}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setTableOpen((v) => !v)}
              aria-expanded={tableOpen}
              className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
            >
              {tableOpen ? "読み方の一覧表を閉じる" : "読み方の一覧表を見る"}
            </button>
          </div>
          {tableOpen && <ReadingTables />}
        </div>
      </section>

      <VocabQuizModal open={!!groupId} onClose={() => setGroupId(null)}>
        {groupId && (
          <VocabQuizPlayer
            key={`${groupId}-${sessionKey}`}
            dataset={dataset}
            mode="level"
            groupId={groupId}
            learned={learned}
            onLearnedChange={setLearned}
            onSessionComplete={() => {}}
            onExit={() => setGroupId(null)}
            stageLabel={stageLabel}
            ordered={ORDERED_UNITS.has(dataset.groupsById[groupId]?.unitNum ?? 0)}
            countUnit="問"
            nextSessionLabel={nextSession?.label}
            onContinueNext={
              nextSession?.play?.groupId
                ? () => {
                    setSessionKey((k) => k + 1);
                    setGroupId(nextSession.play!.groupId!);
                  }
                : undefined
            }
          />
        )}
      </VocabQuizModal>
    </>
  );
}

function ReadingTables() {
  const cell = "border border-border px-2 py-1.5 text-center";
  return (
    <div className="space-y-6 rounded-2xl border border-border bg-white p-4 text-sm shadow-sm">
      <div>
        <h3 className="mb-2 font-bold text-foreground">文字の読み方（学問的発音）</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
          {ALPHABET_TABLE.map((l) => (
            <div key={l.lower} className="flex items-baseline gap-2 border-b border-border/60 py-1">
              <span className="w-12 font-greek text-lg font-bold" dir="ltr">
                {l.upper} {l.lower}
              </span>
              <span className="text-foreground">{l.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {l.kana}・{l.roman}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-bold text-foreground">50音の読み方（子音＋母音）</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          θ・χ・φ は息を強く出す音です。カタカナでは τ・κ・π と同じ行になるので、ローマ字（th・kh・ph）で区別して覚えましょう。
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className={cell} />
                {SYLLABLE_TABLE.vowels.map((v) => (
                  <th key={v} className={`${cell} font-greek text-base`}>
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SYLLABLE_TABLE.rows.map((r) => (
                <tr key={r.label}>
                  <th className={`${cell} bg-muted/50 font-greek text-base`}>{r.label}</th>
                  {r.kana.map((k, i) => (
                    <td key={i} className={cell}>
                      {k}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-bold text-foreground">二重母音と記号</h3>
        <ul className="grid gap-1 text-foreground sm:grid-cols-2">
          <li><span className="font-greek font-bold">αι</span> アイ ・ <span className="font-greek font-bold">ει</span> エイ ・ <span className="font-greek font-bold">οι</span> オイ ・ <span className="font-greek font-bold">υι</span> ユイ</li>
          <li><span className="font-greek font-bold">αυ</span> アウ ・ <span className="font-greek font-bold">ευ</span> エウ ・ <span className="font-greek font-bold">ου</span> ウー ・ <span className="font-greek font-bold">ηυ</span> エーウ</li>
          <li><span className="font-greek font-bold">ἁ ἑ ὁ</span>（῾ 強い気息記号）: ハ・ヘ・ホ（h が付く）</li>
          <li><span className="font-greek font-bold">ἀ ἐ ὀ</span>（᾿ 弱い気息記号）: 音は変わらない</li>
          <li><span className="font-greek font-bold">γγ γκ γχ γξ</span>: ング・ンク・ンク・ンクス</li>
          <li><span className="font-greek font-bold">ᾳ ῃ ῳ</span>: 下の小さな ι は読まない</li>
        </ul>
      </div>
    </div>
  );
}
