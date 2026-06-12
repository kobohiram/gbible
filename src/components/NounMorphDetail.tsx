import type { NounMorphExplanation } from "@/lib/morphology";

type Props = {
  explanation: NounMorphExplanation;
};

export function NounMorphDetail({ explanation }: Props) {
  if (explanation.notes.length === 0) return null;

  return (
    <div className="morph-note-box">
      <p className="text-xs font-semibold text-[var(--grammar)]">
        文法のワンポイント
      </p>
      <ul className="mt-1 space-y-1.5">
        {explanation.notes.map((note) => (
          <li
            key={note}
            className="text-sm leading-relaxed text-foreground before:mr-1.5 before:text-[var(--grammar)] before:content-['·']"
          >
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}
