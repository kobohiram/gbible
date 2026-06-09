"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type ConcordanceIndex = Record<string, { total: number; books: Record<string, number> }>;

// モジュールレベルキャッシュ（再フェッチ防止）
let concordanceIndexCache: ConcordanceIndex | null = null;
let concordanceIndexPromise: Promise<ConcordanceIndex> | null = null;

function loadConcordanceIndex(): Promise<ConcordanceIndex> {
  if (concordanceIndexCache) return Promise.resolve(concordanceIndexCache);
  if (!concordanceIndexPromise) {
    concordanceIndexPromise = fetch('/data/nt/concordance.json')
      .then(r => r.ok ? r.json() as Promise<ConcordanceIndex> : {})
      .then(data => { concordanceIndexCache = data; return data; })
      .catch(() => ({}));
  }
  return concordanceIndexPromise;
}

type Occurrence = {
  verseKey: string;
  chapter: number;
  verse: number;
  allWords: VerseWord[];
  matchIds: Set<string>;
};

type Props = {
  word: VerseWord | null;
  entry: LexiconEntry | null;
  reference: string;
  verseWords: VerseWord[];
  allVerseWords: Record<string, VerseWord[]> | null;
  bookName: string;
};

function ConcordanceItem({ occ, isExpanded, onToggle }: {
  occ: Occurrence;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const matchingWords = occ.allWords.filter(w => occ.matchIds.has(w.id));

  return (
    <li className="border-b border-border/50 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full py-2 text-left hover:bg-accent/10 transition-colors px-1 rounded"
      >
        <div className="flex items-baseline gap-2">
          <span className="shrink-0 font-mono text-xs font-semibold text-primary tabular-nums">
            {occ.chapter}:{occ.verse}
          </span>
          <p className="font-greek text-sm leading-relaxed text-foreground min-w-0">
            {occ.allWords.map((w, i) => (
              <span key={w.id}>
                {i > 0 && " "}
                {occ.matchIds.has(w.id) ? (
                  <strong className="font-bold text-foreground">{w.greek}</strong>
                ) : (
                  <span className="text-muted-foreground/80">{w.greek}</span>
                )}
              </span>
            ))}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="pb-2 pt-1 px-1 space-y-2">
          {matchingWords.map(w => (
            <div key={w.id} className="rounded-md bg-accent/15 px-3 py-2 space-y-1">
              <p className="font-greek text-base font-bold text-foreground">{w.greek}</p>
              <p className="text-sm font-medium text-[var(--gloss)]">{w.glossJa}</p>
              <MorphLabels morph={w.morph} size="sm" variant="verbose" />
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

export function PaneLexicon({ word, entry, reference, verseWords, allVerseWords, bookName }: Props) {
  const [llmOpen, setLlmOpen] = useState(false);
  const [shown, setShown] = useState(20);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [concordanceIndex, setConcordanceIndex] = useState<ConcordanceIndex | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void loadConcordanceIndex().then(setConcordanceIndex);
  }, []);

  useEffect(() => {
    setLlmOpen(false);
    setShown(20);
    setExpandedKeys(new Set());
  }, [word?.strongs]);

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

  const concordance = useMemo((): Occurrence[] => {
    if (!word || !allVerseWords) return [];
    const results: Occurrence[] = [];
    for (const [verseKey, words] of Object.entries(allVerseWords)) {
      const matchIds = new Set(words.filter(w => w.strongs === word.strongs).map(w => w.id));
      if (matchIds.size === 0) continue;
      const [chStr, vStr] = verseKey.split(":");
      results.push({
        verseKey,
        chapter: Number(chStr),
        verse: Number(vStr),
        allWords: words,
        matchIds,
      });
    }
    results.sort((a, b) => a.chapter !== b.chapter ? a.chapter - b.chapter : a.verse - b.verse);
    return results;
  }, [word?.strongs, allVerseWords]);

  function toggleExpand(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const visibleOccurrences = concordance.slice(0, shown);
  const remaining = concordance.length - shown;

  return (
    <div className="flex h-full flex-col">
      <header className="pane-header px-4 py-3">
        <h2 className="pane-header-label">辞書・解説</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {!word ? (
            <p className="text-sm text-muted-foreground">
              原文の単語をクリックしてください。
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
                <h3 className="section-label">文法</h3>
                <div className="mt-1">
                  <MorphLabels morph={word.morph} size="md" variant="verbose" />
                  {verbExplanation && <VerbMorphDetail explanation={verbExplanation} />}
                  {nounExplanation && <NounMorphDetail explanation={nounExplanation} />}
                </div>
              </section>

              <section>
                <h3 className="section-label">意味（この語）</h3>
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
                    辞書エントリは準備中です。
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

              {concordance.length > 0 && (
                <section>
                  <h3 className="section-label">
                    出現箇所
                    <span className="ml-2 font-normal normal-case text-muted-foreground">
                      {bookName.replace("による福音書", "書").replace("への手紙", "書")} {concordance.length}回
                      {concordanceIndex && word && (concordanceIndex[word.strongs]?.total ?? 0) > concordance.length && (
                        <span className="ml-1 text-muted-foreground/60">
                          / 新約 {concordanceIndex[word.strongs]?.total}回
                        </span>
                      )}
                    </span>
                  </h3>
                  <ul className="mt-2 divide-y divide-border/30">
                    {visibleOccurrences.map(occ => (
                      <ConcordanceItem
                        key={occ.verseKey}
                        occ={occ}
                        isExpanded={expandedKeys.has(occ.verseKey)}
                        onToggle={() => toggleExpand(occ.verseKey)}
                      />
                    ))}
                  </ul>
                  {remaining > 0 && (
                    <button
                      type="button"
                      className="mt-2 w-full rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:bg-accent/10 transition-colors"
                      onClick={() => setShown(s => s + 20)}
                    >
                      さらに表示（残り{remaining}件）
                    </button>
                  )}
                </section>
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
