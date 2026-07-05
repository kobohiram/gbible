"use client";

import type { GroupStatus, VocabQuizGroup } from "@/types/vocab-quiz";
import { getGroupStatus, groupProgressLabel } from "@/lib/vocab-quiz";

type Props = {
  groups: VocabQuizGroup[];
  learned: Record<string, boolean>;
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
};

const STATUS_STYLES: Record<GroupStatus, string> = {
  green: "border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  yellow: "border-amber-400 bg-amber-400/15 text-amber-900 dark:text-amber-100",
  gray: "border-border bg-muted/40 text-muted-foreground",
};

export function VocabQuizProgressGrid({
  groups,
  learned,
  selectedGroupId,
  onSelectGroup,
}: Props) {
  const byUnit = new Map<number, VocabQuizGroup[]>();
  for (const g of groups) {
    if (!byUnit.has(g.unitNum)) byUnit.set(g.unitNum, []);
    byUnit.get(g.unitNum)!.push(g);
  }

  return (
    <div className="space-y-4">
      {[...byUnit.entries()]
        .sort(([a], [b]) => a - b)
        .map(([unitNum, unitGroups]) => (
          <div key={unitNum}>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              {unitGroups[0].unitLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              {unitGroups
                .sort((a, b) => a.chunkIndex - b.chunkIndex)
                .map((g) => {
                  const status = getGroupStatus(g, learned);
                  const selected = selectedGroupId === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onSelectGroup(g.id)}
                      className={`min-w-[4.5rem] rounded-lg border px-3 py-2 text-left text-xs transition-all hover:opacity-90 ${STATUS_STYLES[status]} ${selected ? "ring-2 ring-primary ring-offset-2" : ""}`}
                      title={g.unitLabel}
                    >
                      <span className="block font-bold">#{g.chunkIndex + 1}</span>
                      <span className="block opacity-80">{groupProgressLabel(g, learned)}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
    </div>
  );
}
