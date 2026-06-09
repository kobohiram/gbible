"use client";

import { useEffect, useState } from "react";
import type { LexiconEntry, VerseWord } from "@/types";
import {
  explainNounMorphologyJa,
  explainVerbMorphologyJa,
  isNounLikeMorph,
  isVerbMorph,
} from "@/lib/morphology";
import { verseGreekFromWords, type ContextApiRequest } from "@/lib/context-llm";
import { Button } from "@/components/ui/button";
import { MorphLabels } from "./MorphLabels";
import { NounMorphDetail } from "./NounMorphDetail";
import { VerbMorphDetail } from "./VerbMorphDetail";
import { LlmContextSection } from "./LlmContextSection";

type Props = {
  word: VerseWord | null;
  entry: LexiconEntry | null;
  reference: string;
  verseWords: VerseWord[];
};

export function PaneLexicon({ word, entry, reference, verseWords }: Props) {
  const [llmOpen, setLlmOpen] = useState(false);

  useEffect(() => {
    setLlmOpen(false);
  }, [word?.id]);

  const verbExplanation =
    word && isVerbMorph(word.morph)
      ? explainVerbMorphologyJa(word.morph, {
          greek: word.greek,
          strongs: word.strongs,
          lemma: entry?.lemma,
        })
      : null;

  const nounExplanation =
    word && isNounLikeMorph(word.morph)
      ? explainNounMorphologyJa(word.morph, {
          greek: word.greek,
          strongs: word.strongs,
          lemma: entry?.lemma,
          glossJa: word.glossJa,
        })
      : null;

  const contextRequest: ContextApiRequest | null = word
    ? {
        reference,
        verseGreek: verseGreekFromWords(verseWords),
        word: {
          id: word.id,
          greek: word.greek,
          glossJa: word.glossJa,
          morph: word.morph,
          strongs: word.strongs,
          lemma: entry?.lemma,
          definitionJa: entry?.definitionJa,
        },
      }
    : null;

  return (
    <div className="flex h-full flex-col">
      <header className="pane-header px-4 py-3">
        <h2 className="pane-header-label">辞書・解説</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {!word ? (
            <p className="text-sm text-muted-foreground">
              ペイン2の単語をクリックしてください。
            </p>
          ) : (
            <article className="space-y-4">
              <div>
                <p className="font-greek text-3xl">{word.greek}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Strong&apos;s {word.strongs}
                  {entry?.lemma && ` · ${entry.lemma}`}
                </p>
              </div>

              <section>
                <h3 className="section-label">
                  文法
                </h3>
                <div className="mt-1">
                  <MorphLabels morph={word.morph} size="md" variant="verbose" />
                  {verbExplanation && (
                    <VerbMorphDetail explanation={verbExplanation} />
                  )}
                  {nounExplanation && (
                    <NounMorphDetail explanation={nounExplanation} />
                  )}
                </div>
              </section>

              <section>
                <h3 className="section-label">
                  意味（この語）
                </h3>
                <p className="mt-1 text-base font-medium text-[var(--gloss)]">
                  {word.glossJa}
                </p>
              </section>

              {entry ? (
                <section>
                  <h3 className="section-label">
                    辞書
                    {!entry.reviewed && (
                      <span className="ml-2 rounded bg-accent/40 px-1.5 py-0.5 text-[10px] font-normal normal-case text-primary">
                        AI下書き
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground">
                    {entry.definitionJa}
                  </p>
                </section>
              ) : (
                <section>
                  <p className="text-sm text-muted-foreground">
                    辞書エントリは準備中です（TBESG → AI日本語化 → DB格納）。
                  </p>
                </section>
              )}

              {!llmOpen && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLlmOpen(true)}
                >
                  文脈補足（LLM）を表示
                </Button>
              )}
            </article>
          )}

          <LlmContextSection
            contextRequest={contextRequest}
            open={llmOpen}
            onClose={() => setLlmOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
