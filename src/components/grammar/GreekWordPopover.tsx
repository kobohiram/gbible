"use client";

import { useEffect, useRef, useState } from "react";
import type { GreekWord } from "@/types/grammar";

type Props = {
  word: GreekWord;
};

type Anchor = { top: number; left: number; width: number; bottom: number };

export function GreekWordPopover({ word }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const balloonRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (balloonRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!word.strongs) {
    // No lexicon data — plain text
    return <span className="font-greek text-base">{word.text}</span>;
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: rect.top, left: rect.left, width: rect.width, bottom: rect.bottom });
    setOpen(true);
  }

  const BALLOON_H = 150;
  const showBelow = anchor != null && anchor.top < BALLOON_H + 12;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleClick}
        className={`inline-flex flex-col items-center rounded px-0.5 py-0.5 transition-colors ${
          open ? "bg-accent/35 ring-1 ring-primary/35" : "hover:bg-accent/15"
        }`}
      >
        <span className="font-greek text-base leading-tight">{word.text}</span>
        {word.glossJa && (
          <span className="text-[9px] leading-tight text-muted-foreground">{word.glossJa}</span>
        )}
      </button>

      {open && anchor && (
        <div
          ref={balloonRef}
          className="fixed z-50 w-60 -translate-x-1/2 rounded-lg border border-border bg-card p-3 shadow-lg"
          style={
            showBelow
              ? { top: anchor.bottom + 8, left: anchor.left + anchor.width / 2 }
              : {
                  top: anchor.top - 8,
                  left: anchor.left + anchor.width / 2,
                  transform: "translate(-50%, -100%)",
                }
          }
        >
          <p className="font-greek text-lg">{word.text}</p>
          {word.lemma && (
            <p className="text-[11px] text-muted-foreground">
              辞書形：<span className="font-greek">{word.lemma}</span>
              {word.strongs && ` · Strong's ${word.strongs}`}
            </p>
          )}
          {word.glossJa && (
            <p className="mt-1 text-sm font-semibold text-[var(--gloss,theme(colors.blue.600))]">
              {word.glossJa}
            </p>
          )}
          {word.morph && (
            <p className="mt-0.5 text-xs text-muted-foreground">{word.morph}</p>
          )}
        </div>
      )}
    </>
  );
}
