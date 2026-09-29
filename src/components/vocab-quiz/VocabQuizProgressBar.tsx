type Props = {
  current: number;
  total: number;
  className?: string;
  showLabel?: boolean;
  /** 数の単位（単語クイズは「語」、アルファベットは「問」） */
  unit?: string;
};

export function VocabQuizProgressBar({ current, total, className = "", showLabel = true, unit = "語" }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className={className}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
          <span>習得進捗</span>
          <span>
            {current}/{total} {unit}（{pct}%）
          </span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
