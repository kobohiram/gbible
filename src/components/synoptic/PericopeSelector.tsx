"use client";

import type { Pericope } from "@/types/synoptic";

type Props = {
  pericopes: Pericope[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PericopeSelector({ pericopes, selectedId, onSelect }: Props) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/80">
        ペリコーペ
      </span>
      <select
        className="min-w-0 rounded-lg border border-input bg-card px-2 py-1.5 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        {pericopes.length === 0 && <option value="">読み込み中…</option>}
        {pericopes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </label>
  );
}
