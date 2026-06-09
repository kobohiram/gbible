import { expandMorphologyJa, expandMorphologyJaVerbose } from "@/lib/morphology";

type Props = {
  morph: string;
  size?: "sm" | "md";
  variant?: "compact" | "verbose";
};

export function MorphLabels({ morph, size = "sm", variant = "compact" }: Props) {
  const japanese =
    variant === "verbose"
      ? expandMorphologyJaVerbose(morph)
      : expandMorphologyJa(morph);

  const className =
    size === "sm"
      ? "font-mono text-[11px] font-semibold leading-tight text-[var(--grammar)]"
      : variant === "verbose"
        ? "text-sm font-semibold leading-relaxed text-[var(--grammar)]"
        : "font-mono text-sm font-bold leading-tight text-[var(--grammar)]";

  return <span className={className}>{japanese}</span>;
}
