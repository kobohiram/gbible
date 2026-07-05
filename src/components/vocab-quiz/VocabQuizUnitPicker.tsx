"use client";

import { Check, Lock } from "lucide-react";
import type { UnitSummary } from "@/lib/vocab-quiz";
import { VocabQuizCard, VocabQuizCardBody, VocabQuizCardHeader, QuizCloseButton } from "./VocabQuizCard";

type Props = {
  units: UnitSummary[];
  onClose: () => void;
  onStart: (groupId: string) => void;
};

function UnitRow({
  unit,
  onStart,
}: {
  unit: UnitSummary;
  onStart: (groupId: string) => void;
}) {
  const progress = `${unit.learnedCount}/${unit.totalWords}語`;
  const chunks =
    unit.chunksTotal > 1 ? ` · ステージ ${unit.chunksCleared + 1}/${unit.chunksTotal}` : "";

  if (unit.state === "cleared") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-3 py-2.5">
        <Check className="size-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-emerald-800">{unit.unitLabel}</p>
          <p className="text-[10px] text-emerald-700">
            クリア済み · {progress}
          </p>
        </div>
      </div>
    );
  }

  if (unit.state === "current") {
    return (
      <div className="rounded-xl bg-accent px-3 py-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
            NOW
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-accent-foreground">{unit.unitLabel}</p>
            <p className="mt-0.5 text-[10px] text-accent-foreground/80">
              {progress}
              {chunks}
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={!unit.activeGroupId}
          onClick={() => unit.activeGroupId && onStart(unit.activeGroupId)}
          className="mt-3 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          始める
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2.5 opacity-60">
      <Lock className="size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-muted-foreground">{unit.unitLabel}</p>
        <p className="text-[10px] text-muted-foreground">前の単元をクリアすると解放</p>
      </div>
    </div>
  );
}

export function VocabQuizUnitPicker({ units, onClose, onStart }: Props) {
  const cleared = units.filter((u) => u.state === "cleared");
  const current = units.filter((u) => u.state === "current");
  const locked = units.filter((u) => u.state === "locked");

  return (
    <VocabQuizCard fixedHeight>
      <VocabQuizCardHeader borderless>
        <span className="text-[10px] font-semibold text-foreground">単元別</span>
        <QuizCloseButton onClick={onClose} />
      </VocabQuizCardHeader>
      <VocabQuizCardBody className="min-h-0">
        <p className="mb-3 shrink-0 text-center text-xs text-muted-foreground">
          単元は順番に進みます
        </p>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {current.length > 0 && (
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                いま取り組む単元
              </h3>
              <div className="space-y-2">
                {current.map((u) => (
                  <UnitRow key={u.unitNum} unit={u} onStart={onStart} />
                ))}
              </div>
            </section>
          )}

          {cleared.length > 0 && (
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                クリア済み
              </h3>
              <div className="space-y-1.5">
                {cleared.map((u) => (
                  <UnitRow key={u.unitNum} unit={u} onStart={onStart} />
                ))}
              </div>
            </section>
          )}

          {locked.length > 0 && (
            <section>
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                これからの単元
              </h3>
              <div className="space-y-1.5">
                {locked.map((u) => (
                  <UnitRow key={u.unitNum} unit={u} onStart={onStart} />
                ))}
              </div>
            </section>
          )}
        </div>
      </VocabQuizCardBody>
    </VocabQuizCard>
  );
}
