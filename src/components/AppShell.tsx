"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getBook,
  getBooksForCorpus,
  getCorpus,
  formatVerseLabel,
  getVerseCount,
} from "@/data/bible";
import {
  bookExpectsJsonData,
  getLexiconEntry,
  getVerseWords,
  loadLastLocation,
  saveLastLocation,
} from "@/lib/verse-data";
import { normalizeVerseWords } from "@/lib/verse-text";
import { buildBaseContextRequest, buildContextRequest } from "@/lib/context-llm";
import type { BibleLocation } from "@/lib/bible-reference";
import { fetchMnspBook, type MnspBookData } from "@/lib/translations";
import {
  EMPTY_REVIEW_STATE,
  applyEntryDecision,
  applyWordDecision,
  fetchVerseReviewState,
  type VerseReviewState,
} from "@/lib/lexicon-review";
import type { BookData, BookId, CorpusId, PersonalTranslation, VerseWord } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PaneSide } from "./PaneSide";
import { PaneLexicon } from "./PaneLexicon";
import { PaneNav } from "./PaneNav";
import { PaneVerse } from "./PaneVerse";
import { SiteHeader } from "./SiteHeader";

type PaneKind = "nav" | "verse" | "lexicon" | "side";

function PaneFrame({
  children,
  pane,
}: {
  children: React.ReactNode;
  pane: PaneKind;
}) {
  return (
    <div
      data-pane={pane}
      className="pane-surface flex h-full min-h-0 flex-col overflow-hidden"
    >
      {children}
    </div>
  );
}

export function AppShell() {
  const { data: session } = useSession();
  const [corpus, setCorpus] = useState<CorpusId>("nt");
  const [bookId, setBookId] = useState<BookId>(() => loadLastLocation("nt").bookId);
  const [chapter, setChapter] = useState(() => loadLastLocation("nt").chapter);
  const [selectedVerse, setSelectedVerse] = useState(() => loadLastLocation("nt").verse);
  const [selectedWord, setSelectedWord] = useState<VerseWord | null>(null);
  const [translations, setTranslations] = useState<PersonalTranslation[]>([]);
  const [bookData, setBookData] = useState<BookData | null>(null);
  const [mnspData, setMnspData] = useState<MnspBookData | null>(null);
  const mobileLexiconRef = useRef<HTMLDivElement>(null);
  const mobileVerseRef = useRef<HTMLDivElement>(null);

  const books = getBooksForCorpus(corpus);

  useEffect(() => {
    saveLastLocation(corpus, bookId, chapter, selectedVerse);
  }, [corpus, bookId, chapter, selectedVerse]);

  useEffect(() => {
    if (!bookExpectsJsonData(bookId)) {
      setBookData(null);
      return;
    }
    setBookData(null);
    let cancelled = false;
    const dataPath = corpus === "ot" ? `/data/ot/${bookId}.json` : `/data/nt/${bookId}.json`;
    fetch(dataPath)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BookData | null) => {
        if (!cancelled && d) {
          const normalized: BookData = {
            ...d,
            words: Object.fromEntries(
              Object.entries(d.words).map(([k, ws]) => [k, normalizeVerseWords(ws)]),
            ),
          };
          setBookData(normalized);
        }
      })
      .catch(() => { /* データなし */ });
    return () => { cancelled = true; };
  }, [bookId, corpus]);

  useEffect(() => {
    let cancelled = false;
    fetchMnspBook(bookId).then((d) => {
      if (!cancelled) setMnspData(d);
    });
    return () => { cancelled = true; };
  }, [bookId]);

  const book = getBook(bookId);
  const rawWords =
    bookData?.words[`${chapter}:${selectedVerse}`] ??
    getVerseWords(bookId, chapter, selectedVerse);

  // みんなで作る辞書：確認状況（旧約でパイプライン公開済みの節のみ）
  const [reviewState, setReviewState] = useState<VerseReviewState>(EMPTY_REVIEW_STATE);
  const [reviewNonce, setReviewNonce] = useState(0);
  const reviewable = corpus === "ot" && rawWords.some((w) => w.review);
  const reviewKey = reviewable ? rawWords.map((w) => w.id).join(",") : "";
  useEffect(() => {
    if (!reviewKey) {
      setReviewState(EMPTY_REVIEW_STATE);
      return;
    }
    let cancelled = false;
    const ids = reviewKey.split(",");
    const strongs = [...new Set(rawWords.map((w) => w.strongs).filter((s) => s !== "H0"))];
    void fetchVerseReviewState(bookId, ids, strongs).then((st) => {
      if (!cancelled) setReviewState(st);
    });
    return () => { cancelled = true; };
    // rawWords は reviewKey と同じ内容を表すため依存から外す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, reviewKey, reviewNonce, session?.user?.email]);

  const words = useMemo(
    () => (reviewable ? rawWords.map((w) => applyWordDecision(w, reviewState)) : rawWords),
    [rawWords, reviewable, reviewState],
  );
  const selectedWordView = selectedWord
    ? (words.find((w) => w.id === selectedWord.id) ?? selectedWord)
    : null;
  const lexiconEntry = selectedWord
    ? applyEntryDecision(
        bookData?.lexicon[selectedWord.strongs] ?? getLexiconEntry(selectedWord.strongs),
        reviewState,
      )
    : null;

  const refreshTranslations = useCallback(async () => {
    if (!session?.user) {
      setTranslations([]);
      return;
    }
    try {
      const res = await fetch(`/api/translations?bookId=${bookId}&chapter=${chapter}`);
      if (res.ok) setTranslations(await res.json() as PersonalTranslation[]);
    } catch {
      // ネットワーク断などは無視
    }
  }, [bookId, chapter, session]);

  useEffect(() => {
    refreshTranslations();
  }, [refreshTranslations]);

  useEffect(() => {
    const maxVerse = getVerseCount(bookId, chapter);
    if (selectedVerse > maxVerse) {
      setSelectedVerse(maxVerse > 0 ? maxVerse : 1);
    }
  }, [bookId, chapter, selectedVerse]);

  useEffect(() => {
    setSelectedWord(null);
  }, [bookId, chapter, selectedVerse]);

  function handleCorpusChange(nextCorpus: CorpusId) {
    if (nextCorpus === corpus) return;
    const loc = loadLastLocation(nextCorpus);
    setCorpus(nextCorpus);
    setBookId(loc.bookId);
    setChapter(loc.chapter);
    setSelectedVerse(loc.verse);
    setSelectedWord(null);
  }

  function handleBookChange(nextBookId: BookId) {
    setBookId(nextBookId);
    setChapter(1);
    setSelectedVerse(1);
    setSelectedWord(null);
  }

  function handleChapterChange(nextChapter: number) {
    setChapter(nextChapter);
    setSelectedVerse(1);
    setSelectedWord(null);
  }

  function handleSelectWord(word: VerseWord) {
    setSelectedWord(word);
    setTimeout(() => {
      mobileLexiconRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const handleNavigateToVerse = useCallback(
    (loc: BibleLocation) => {
      const targetCorpus = getCorpus(loc.bookId);
      const maxVerse = getVerseCount(loc.bookId, loc.chapter);
      const verse = maxVerse > 0 ? Math.min(loc.verse, maxVerse) : loc.verse;

      if (targetCorpus !== corpus) {
        setCorpus(targetCorpus);
      }
      setBookId(loc.bookId);
      setChapter(loc.chapter);
      setSelectedVerse(verse);
      setSelectedWord(null);
      setTimeout(() => {
        mobileVerseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },
    [corpus],
  );

  const reference = `${book.name} ${formatVerseLabel(chapter, selectedVerse)}`;
  const currentTranslation = translations.find((t) => t.verse === selectedVerse);
  const savedTranslation = currentTranslation?.translation ?? "";
  const savedMemo = currentTranslation?.memo ?? "";
  const savedMemoIsPublic = currentTranslation?.memoIsPublic ?? false;

  const navPane = (
    <PaneNav
      corpus={corpus}
      books={books}
      bookId={bookId}
      chapter={chapter}
      selectedVerse={selectedVerse}
      translations={translations}
      mnspData={mnspData}
      bookDataLoaded={bookData !== null}
      onCorpusChange={handleCorpusChange}
      onBookChange={handleBookChange}
      onChapterChange={handleChapterChange}
      onSelectVerse={setSelectedVerse}
    />
  );

  const versePane = (
    <PaneVerse
      bookId={bookId}
      chapter={chapter}
      verse={selectedVerse}
      corpus={corpus}
      reference={reference}
      words={words}
      selectedWordId={selectedWord?.id ?? null}
      onSelectWord={handleSelectWord}
      mnspData={mnspData}
      savedTranslation={savedTranslation}
      savedMemo={savedMemo}
      savedMemoIsPublic={savedMemoIsPublic}
      onSaved={() => { void refreshTranslations(); }}
    />
  );

  const contextRequest = useMemo(
    () =>
      selectedWordView
        ? buildContextRequest(
            reference,
            words,
            selectedWordView,
            lexiconEntry,
            corpus,
          )
        : buildBaseContextRequest(reference, words, corpus),
    [selectedWordView, reference, words, lexiconEntry, corpus],
  );

  const lexiconPane = (
    <PaneLexicon
      corpus={corpus}
      word={selectedWordView}
      entry={lexiconEntry}
      reviewState={reviewable ? reviewState : null}
      onReviewChanged={() => setReviewNonce((n) => n + 1)}
      reference={reference}
      verseWords={words}
      allVerseWords={bookData?.words ?? null}
      bookId={bookId}
      bookName={book.name}
    />
  );

  const sidePane = (
    <PaneSide
      contextRequest={contextRequest}
      reference={reference}
      bookId={bookId}
      bookName={book.name}
      chapter={chapter}
      verse={selectedVerse}
      mnspData={mnspData}
      savedTranslation={savedTranslation}
      savedMemo={savedMemo}
      savedMemoIsPublic={savedMemoIsPublic}
      onSaved={() => { void refreshTranslations(); }}
      onNavigateToVerse={handleNavigateToVerse}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader onDataImported={refreshTranslations} />

      <div className="hidden min-h-0 flex-1 md:flex">
        <ResizablePanelGroup
          className="min-h-0 flex-1"
          id="gbible-desktop-panes"
          orientation="horizontal"
        >
          <ResizablePanel
            className="min-w-0"
            collapsible={false}
            defaultSize="18%"
            id="nav"
            maxSize="28%"
            minSize="12%"
          >
            <PaneFrame pane="nav">{navPane}</PaneFrame>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            className="min-w-0"
            collapsible={false}
            defaultSize="28%"
            id="verse"
            minSize="18%"
          >
            <PaneFrame pane="verse">{versePane}</PaneFrame>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            className="min-w-0"
            collapsible={false}
            defaultSize="28%"
            id="lexicon"
            minSize="18%"
          >
            <PaneFrame pane="lexicon">{lexiconPane}</PaneFrame>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            className="min-w-0"
            collapsible={false}
            defaultSize="26%"
            id="side"
            minSize="18%"
          >
            <PaneFrame pane="side">{sidePane}</PaneFrame>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto md:hidden">
        <div className="border-b border-border">
          <div className="pane-surface" data-pane="nav">
            <PaneNav
              stacked
              corpus={corpus}
              books={books}
              bookId={bookId}
              chapter={chapter}
              selectedVerse={selectedVerse}
              translations={translations}
              mnspData={mnspData}
              bookDataLoaded={bookData !== null}
              onCorpusChange={handleCorpusChange}
              onBookChange={handleBookChange}
              onChapterChange={handleChapterChange}
              onSelectVerse={(verse) => {
                setSelectedVerse(verse);
              }}
            />
          </div>
        </div>

        <div ref={mobileVerseRef} className="pane-surface border-b border-border" data-pane="verse">
          <PaneVerse
            stacked
            bookId={bookId}
            chapter={chapter}
            verse={selectedVerse}
            corpus={corpus}
            reference={reference}
            words={words}
            selectedWordId={selectedWord?.id ?? null}
            onSelectWord={handleSelectWord}
            mnspData={mnspData}
            savedTranslation={savedTranslation}
            savedMemo={savedMemo}
            savedMemoIsPublic={savedMemoIsPublic}
            onSaved={() => { void refreshTranslations(); }}
          />
        </div>

        <div ref={mobileLexiconRef} className="pane-surface border-b border-border" data-pane="lexicon">
          <PaneLexicon
            stacked
            corpus={corpus}
            word={selectedWord}
            entry={lexiconEntry}
            reference={reference}
            verseWords={words}
            allVerseWords={bookData?.words ?? null}
            bookId={bookId}
            bookName={book.name}
          />
        </div>

        <div className="pane-surface border-b border-border" data-pane="side">
          <PaneSide
            stacked
            contextRequest={contextRequest}
            reference={reference}
            bookId={bookId}
            bookName={book.name}
            chapter={chapter}
            verse={selectedVerse}
            mnspData={mnspData}
            savedTranslation={savedTranslation}
            savedMemo={savedMemo}
            savedMemoIsPublic={savedMemoIsPublic}
            onSaved={() => { void refreshTranslations(); }}
            onNavigateToVerse={handleNavigateToVerse}
          />
        </div>
      </div>
    </div>
  );
}
