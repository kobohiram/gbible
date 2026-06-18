"use client";

import type { Pericope } from "@/types/synoptic";

type Props = {
  pericopes: Pericope[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const GROUP_LABELS: Record<string, string> = {
  narrative: "物語",
  "sermon-on-the-mount": "山上の説教",
};

export function PericopeListPane({ pericopes, selectedId, onSelect }: Props) {
  const groups = new Map<string, Pericope[]>();
  for (const p of pericopes) {
    if (!groups.has(p.group)) groups.set(p.group, []);
    groups.get(p.group)!.push(p);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="pane-header px-3 py-2">
        <h2 className="pane-header-label">ペリコーペ</h2>
      </header>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {pericopes.length === 0 && (
          <p className="px-1 text-xs text-muted-foreground">読み込み中…</p>
        )}
        {[...groups.entries()].map(([group, items]) => (
          <div key={group} className="mb-3">
            <p className="section-label px-1">{GROUP_LABELS[group] ?? group}</p>
            <ul className="mt-1 space-y-0.5">
              {items.map((p) => {
                const isSelected = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(p.id)}
                      className={`block w-full rounded px-1.5 py-1 text-left text-xs leading-snug transition-colors ${
                        isSelected
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold"
                          : "text-foreground hover:bg-accent/15"
                      }`}
                    >
                      {p.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
