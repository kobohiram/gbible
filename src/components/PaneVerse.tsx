"use client";

import { signIn, useSession } from "next-auth/react";
import type { BookId, CorpusId, VerseWord } from "@/types";
import type { MnspBookData } from "@/lib/translations";
import {
  MISSING_TRANSLATION_LABEL,
  getMnspChouyaku,
} from "@/lib/translations";
import { useAutoSave, SaveStatus } from "@/lib/use-auto-save";
import { getWordScript, getWordText } from "@/lib/verse-text";
import { MorphLabels } from "./MorphLabels";
import { MorphLegend } from "./MorphLegend";
import { useCallback, useEffect, useState } from "react";

type Props = {
  bookId: BookId;
  chapter: number;
  verse: number;
  reference: string;
  words: VerseWord[];
  selectedWordId: string | null;
  onSelectWord: (word: VerseWord) => void;
  corpus?: CorpusId;
  mnspData: MnspBookData | null;
  savedTranslation: string;
  savedMemo: string;
  savedMemoIsPublic: boolean;
  onSaved: () => void;
  stacked?: boolean;
};

export function PaneVerse({
  bookId,
  chapter,
  verse,
  reference,
  words,
  selectedWordId,
  onSelectWord,
  corpus = "nt",
  mnspData,
  savedTranslation,
  savedMemo,
  savedMemoIsPublic,
  onSaved,
  stacked,
}: Props) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const isRtl = words.length > 0 && getWordScript(words[0]) === "heb";

  const [translation, setTranslation] = useState(savedTranslation);
  const resetKey = `${bookId}:${chapter}:${verse}`;

  useEffect(() => {
    setTranslation(savedTranslation);
  }, [savedTranslation, resetKey]);

  const persist = useCallback(async () => {
    const res = await fetch("/api/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        chapter,
        verse,
        translation,
        memo: savedMemo,
        memoIsPublic: savedMemoIsPublic,
      }),
    });
    if (!res.ok) throw new Error();
    onSaved();
  }, [bookId, chapter, verse, translation, savedMemo, savedMemoIsPublic, onSaved]);

  const saveStatus = useAutoSave(translation, resetKey, {
    enabled: isLoggedIn,
    onSave: persist,
  });

  const chouyaku = getMnspChouyaku(mnspData, chapter, verse);

  return (
    <div className={stacked ? "flex flex-col" : "flex h-full flex-col"}>
      <header className="pane-header px-4 py-3 text-center">
        <h2 className="text-lg font-bold text-foreground">{reference}</h2>
        <p className="text-xs text-muted-foreground">単語をタップすると辞書に表示</p>
      </header>
      <MorphLegend corpus={corpus} />
      <div className={stacked ? "overflow-x-auto p-4" : "flex-1 overflow-x-auto overflow-y-auto p-4"}>
        {words.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            この節の原文データは準備中です。
          </p>
        ) : (
          <div
            className={`flex flex-wrap items-end gap-x-4 gap-y-6 ${isRtl ? "flex-row-reverse justify-end" : ""}`}
            dir={isRtl ? "rtl" : "ltr"}
          >
            {words.map((word) => {
              const isSelected = word.id === selectedWordId;
              const script = getWordScript(word);
              const surface = getWordText(word);
              return (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => onSelectWord(word)}
                  className={`flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors ${
                    isSelected
                      ? "bg-accent/35 ring-2 ring-primary/35"
                      : "hover:bg-accent/15"
                  }`}
                  dir="ltr"
                >
                  <span
                    className={`text-2xl leading-none text-foreground ${
                      script === "heb" ? "font-hebrew" : "font-greek"
                    }`}
                    dir={script === "heb" ? "rtl" : "ltr"}
                  >
                    {surface}
                  </span>
                  <MorphLabels morph={word.morph} />
                  <span className="text-center text-sm font-medium leading-tight text-[var(--gloss)]">
                    {word.glossJa}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <section className="mt-6 space-y-4 border-t border-border pt-4">
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="section-label">私訳</span>
                {!isLoggedIn && (
                  <button
                    type="button"
                    onClick={() => signIn("google")}
                    className="rounded border border-primary/40 px-1.5 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    ログイン
                  </button>
                )}
              </div>
              {isLoggedIn && <SaveStatus status={saveStatus} />}
            </div>
            {isLoggedIn && (
              <textarea
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="この節の自分の訳を書く…"
                rows={3}
                className="w-full resize-none bg-transparent p-0 text-sm leading-relaxed text-foreground/90 placeholder:text-muted-foreground/60 focus:outline-none"
              />
            )}
          </div>

          <div>
            <span className="section-label">みんなの聖書</span>
            {chouyaku ? (
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                {chouyaku}
              </p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground/70">
                {MISSING_TRANSLATION_LABEL}
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
