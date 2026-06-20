import { expandMorphologyJa, expandMorphologyJaVerbose, isHebrewMorph } from "@/lib/morphology";
import {
  expandHebrewMorphologyJa,
  expandHebrewMorphologyJaVerbose,
} from "@/lib/morphology-hebrew";

type Props = {
  morph: string;
  size?: "sm" | "md";
  variant?: "compact" | "verbose";
};

export function MorphLabels({ morph, size = "sm", variant = "compact" }: Props) {
  const hebrew = isHebrewMorph(morph);
  const japanese =
    variant === "verbose"
      ? hebrew
        ? expandHebrewMorphologyJaVerbose(morph)
        : expandMorphologyJaVerbose(morph)
      : hebrew
        ? expandHebrewMorphologyJa(morph)
        : expandMorphologyJa(morph);

  const className =
    size === "sm"
      ? "font-mono text-[11px] font-semibold leading-tight text-[var(--grammar)]"
      : variant === "verbose"
        ? "text-sm font-semibold leading-relaxed text-[var(--grammar)]"
        : "font-mono text-sm font-bold leading-tight text-[var(--grammar)]";

  return <span className={className}>{japanese}</span>;
}
