"use client";

import { useEffect, useMemo, useState } from "react";
import type { BookId, CorpusId, LexiconEntry, VerseWord } from "@/types";
import { resolveShortGloss } from "@/lib/word-gloss";
import { getWordScript, getWordText } from "@/lib/verse-text";
import { verseGreekFromWords } from "@/lib/context-llm";
import type { GrammarNoteRequest } from "@/app/api/grammar-note/route";
import { MorphLabels } from "./MorphLabels";
import { GrammarNoteSection } from "./GrammarNoteSection";

type ConcordanceIndex = Record<string, { total: number; books: Record<string, number> }>;
type GlobalLexicon = Record<string, LexiconEntry>;

// モジュールレベルキャッシュ（再フェッチ防止）
let concordanceIndexCache: ConcordanceIndex | null = null;
let concordanceIndexPromise: Promise<ConcordanceIndex> | null = null;
const globalLexiconCaches: Partial<Record<CorpusId, GlobalLexicon>> = {};
const globalLexiconPromises: Partial<Record<CorpusId, Promise<GlobalLexicon>>> = {};

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

function loadGlobalLexicon(corpus: CorpusId): Promise<GlobalLexicon> {
  const cached = globalLexiconCaches[corpus];
  if (cached) return Promise.resolve(cached);
  if (!globalLexiconPromises[corpus]) {
    const path = corpus === "ot" ? "/data/ot/lexicon.json" : "/data/nt/lexicon.json";
    globalLexiconPromises[corpus] = fetch(path)
      .then(r => r.ok ? r.json() as Promise<GlobalLexicon> : {})
      .then(data => { globalLexiconCaches[corpus] = data; return data; })
      .catch(() => ({}));
  }
  return globalLexiconPromises[corpus]!;
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
  bookId: BookId;
  bookName: string;
  corpus?: CorpusId;
  stacked?: boolean;
};

function ConcordanceItem({ occ, isExpanded, onToggle, globalLexicon }: {
  occ: Occurrence;
  isExpanded: boolean;
  onToggle: () => void;
  globalLexicon: GlobalLexicon | null;
}) {
  const matchingWords = occ.allWords.filter(w => occ.matchIds.has(w.id));
  const isHeb = occ.allWords.length > 0 && getWordScript(occ.allWords[0]) === "heb";

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
          <p
            className={`text-sm leading-relaxed text-foreground min-w-0 ${isHeb ? "font-hebrew" : "font-greek"}`}
            dir={isHeb ? "rtl" : "ltr"}
          >
            {occ.allWords.map((w, i) => (
              <span key={w.id}>
                {i > 0 && " "}
                {occ.matchIds.has(w.id) ? (
                  <strong className="font-bold text-primary bg-primary/10 rounded-sm px-0.5">
                    {getWordText(w)}
                  </strong>
                ) : (
                  <span className="text-muted-foreground/80">{getWordText(w)}</span>
                )}
              </span>
            ))}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className="pb-2 pt-1 px-1 space-y-2">
          {matchingWords.map(w => {
            const script = getWordScript(w);
            return (
              <div key={w.id} className="rounded-md bg-accent/15 px-3 py-2 space-y-1" dir="ltr">
                <p className={`text-base font-bold text-foreground ${script === "heb" ? "font-hebrew" : "font-greek"}`} dir={script === "heb" ? "rtl" : "ltr"}>
                  {getWordText(w)}
                </p>
                <p className="text-sm font-medium text-[var(--gloss)]">{resolveShortGloss(w, globalLexicon?.[w.strongs])}</p>
                <MorphLabels morph={w.morph} size="sm" variant="verbose" />
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
}

export function PaneLexicon({ word, entry, reference, verseWords, allVerseWords, bookId, bookName, corpus = "nt", stacked }: Props) {
  const [shown, setShown] = useState(20);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [concordanceIndex, setConcordanceIndex] = useState<ConcordanceIndex | null>(null);
  const [globalLexicon, setGlobalLexicon] = useState<GlobalLexicon | null>(null);

  useEffect(() => {
    if (corpus === "nt") {
      void loadConcordanceIndex().then(setConcordanceIndex);
    } else {
      setConcordanceIndex(null);
    }
    void loadGlobalLexicon(corpus).then(setGlobalLexicon);
  }, [corpus]);

  useEffect(() => {
    setShown(20);
    setExpandedKeys(new Set());
  }, [word?.strongs]);

  const richEntry = (word && globalLexicon?.[word.strongs]) ?? entry;

  const surface = word ? getWordText(word) : "";
  const script = word ? getWordScript(word) : "grc";

  const grammarNoteRequest: GrammarNoteRequest | null =
    corpus === "nt" && word
      ? {
          greek: surface,
          lemma: richEntry?.lemma,
          morph: word.morph,
          glossJa: word.glossJa,
          reference,
          verseGreek: verseGreekFromWords(verseWords),
          bookId,
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
    <div className={stacked ? "flex flex-col" : "flex h-full flex-col"}>
      <header className="pane-header px-4 py-3">
        <h2 className="pane-header-label">辞書・解説</h2>
      </header>
      <div className={stacked ? "p-4" : "flex-1 overflow-y-auto p-4"}>
        <div className="space-y-4">
          {!word ? (
            <p className="text-sm text-muted-foreground">
              原文の単語をクリックしてください。
            </p>
          ) : (
            <article className="space-y-4">
              <div>
                <p
                  className={`text-3xl ${script === "heb" ? "font-hebrew" : "font-greek"}`}
                  dir={script === "heb" ? "rtl" : "ltr"}
                >
                  {surface}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Strong&apos;s {word.strongs}
                  {richEntry?.lemma && ` · ${richEntry.lemma}`}
                </p>
              </div>

              <section>
                <h3 className="section-label">文法</h3>
                <div className="mt-1">
                  <MorphLabels morph={word.morph} size="md" variant="verbose" />
                </div>
              </section>

              <section>
                <h3 className="section-label">意味（この語）</h3>
                <p className="mt-1 text-base font-medium text-[var(--gloss)]">
                  {resolveShortGloss(word, richEntry)}
                </p>
              </section>

              {richEntry ? (
                <section>
                  <h3 className="section-label">
                    辞書
                    {richEntry.source === "bdb" ? (
                      <span className="ml-2 rounded bg-sky/60 px-1.5 py-0.5 text-[10px] font-normal normal-case text-primary">
                        BDB
                      </span>
                    ) : richEntry.source === "tbesh" ? (
                      <span className="ml-2 rounded bg-sky/60 px-1.5 py-0.5 text-[10px] font-normal normal-case text-primary">
                        TBESH
                      </span>
                    ) : richEntry.detailJa ? (
                      <span className="ml-2 rounded bg-sky/60 px-1.5 py-0.5 text-[10px] font-normal normal-case text-primary">
                        Abbott-Smith
                      </span>
                    ) : !richEntry.reviewed ? (
                      <span className="ml-2 rounded bg-accent/40 px-1.5 py-0.5 text-[10px] font-normal normal-case text-primary">
                        AI下書き
                      </span>
                    ) : null}
                  </h3>
                  {richEntry.detailJa ? (
                    <>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {richEntry.definitionJa}
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                        {richEntry.detailJa}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed text-foreground">
                      {richEntry.definitionJa}
                    </p>
                  )}
                </section>
              ) : (
                <section>
                  <p className="text-sm text-muted-foreground">
                    辞書エントリは準備中です。
                  </p>
                </section>
              )}

              {corpus === "nt" && <GrammarNoteSection request={grammarNoteRequest} />}

              {concordance.length > 0 && (
                <section>
                  <h3 className="section-label">
                    出現箇所
                    <span className="ml-2 font-normal normal-case text-muted-foreground">
                      {bookName.replace("による福音書", "書").replace("への手紙", "書")} {concordance.length}回
                      {corpus === "nt" && concordanceIndex && word && (concordanceIndex[word.strongs]?.total ?? 0) > concordance.length && (
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
                        globalLexicon={globalLexicon}
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

        </div>
      </div>
    </div>
  );
}
