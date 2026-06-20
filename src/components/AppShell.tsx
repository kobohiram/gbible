"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import {
  getBook,
  getBooksForCorpus,
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
import type { BookData, BookId, CorpusId, PersonalTranslation, VerseWord } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PaneLexicon } from "./PaneLexicon";
import { PaneNav } from "./PaneNav";
import { PaneNotes } from "./PaneNotes";
import { PaneVerse } from "./PaneVerse";
import { DataBackupMenu } from "./DataBackupMenu";
import { AuthButton } from "./AuthButton";

type PaneKind = "nav" | "verse" | "lexicon" | "notes";

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
  const [userCount, setUserCount] = useState<number | null>(null);
  const [corpus, setCorpus] = useState<CorpusId>("nt");
  const [bookId, setBookId] = useState<BookId>(() => loadLastLocation("nt").bookId);
  const [chapter, setChapter] = useState(() => loadLastLocation("nt").chapter);
  const [selectedVerse, setSelectedVerse] = useState(() => loadLastLocation("nt").verse);
  const [selectedWord, setSelectedWord] = useState<VerseWord | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [translations, setTranslations] = useState<PersonalTranslation[]>([]);
  const [bookData, setBookData] = useState<BookData | null>(null);
  const mobileLexiconRef = useRef<HTMLDivElement>(null);

  const books = getBooksForCorpus(corpus);

  useEffect(() => {
    fetch('/api/stats').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.users != null) setUserCount(d.users);
    }).catch(() => {});
  }, []);

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

  const book = getBook(bookId);
  const words =
    bookData?.words[`${chapter}:${selectedVerse}`] ??
    getVerseWords(bookId, chapter, selectedVerse);
  const lexiconEntry = selectedWord
    ? (bookData?.lexicon[selectedWord.strongs] ?? getLexiconEntry(selectedWord.strongs))
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

  const reference = `${book.name} ${chapter}:${selectedVerse}`;

  const navPane = (
    <PaneNav
      corpus={corpus}
      books={books}
      bookId={bookId}
      chapter={chapter}
      selectedVerse={selectedVerse}
      translations={translations}
      bookDataLoaded={bookData !== null}
      onCorpusChange={handleCorpusChange}
      onBookChange={handleBookChange}
      onChapterChange={handleChapterChange}
      onSelectVerse={setSelectedVerse}
    />
  );

  const versePane = (
    <PaneVerse
      corpus={corpus}
      reference={reference}
      words={words}
      selectedWordId={selectedWord?.id ?? null}
      onSelectWord={handleSelectWord}
    />
  );

  const lexiconPane = (
    <PaneLexicon
      corpus={corpus}
      word={selectedWord}
      entry={lexiconEntry}
      reference={reference}
      verseWords={words}
      allVerseWords={bookData?.words ?? null}
      bookName={book.name}
    />
  );

  const currentTranslation = translations.find((t) => t.verse === selectedVerse);

  const notesPane = (
    <PaneNotes
      bookId={bookId}
      bookName={book.name}
      chapter={chapter}
      verse={selectedVerse}
      savedTranslation={currentTranslation?.translation ?? ""}
      savedMemo={currentTranslation?.memo ?? ""}
      savedMemoIsPublic={currentTranslation?.memoIsPublic ?? false}
      onSaved={() => { void refreshTranslations(); }}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-primary/30 bg-primary px-4 py-2.5 text-primary-foreground">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="font-extrabold text-accent">G</span>bible
          {userCount != null && userCount > 0 && (
            <span className="ml-2 text-xs font-normal opacity-70">{userCount}人が利用中</span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          {corpus === "nt" && (
            <a
              href="/study/synoptic"
              className="text-sm font-semibold underline-offset-2 hover:underline"
            >
              共観福音書 →
            </a>
          )}
          <DataBackupMenu onImported={refreshTranslations} />
          <AuthButton />
        </div>
      </header>

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
            id="notes"
            minSize="15%"
          >
            <PaneFrame pane="notes">{notesPane}</PaneFrame>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto md:hidden">
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            className="pane-header flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <span className="pane-header-label">目次</span>
              <span className="text-sm font-medium text-foreground">{reference}</span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground/70 transition-transform duration-200 ${navOpen ? "rotate-180" : ""}`}
            />
          </button>
          {navOpen && (
            <div className="pane-surface" data-pane="nav">
              <PaneNav
                stacked
                corpus={corpus}
                books={books}
                bookId={bookId}
                chapter={chapter}
                selectedVerse={selectedVerse}
                translations={translations}
                bookDataLoaded={bookData !== null}
                onCorpusChange={handleCorpusChange}
                onBookChange={handleBookChange}
                onChapterChange={handleChapterChange}
                onSelectVerse={(verse) => {
                  setSelectedVerse(verse);
                  setNavOpen(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="pane-surface border-b border-border" data-pane="verse">
          <PaneVerse
            stacked
            corpus={corpus}
            reference={reference}
            words={words}
            selectedWordId={selectedWord?.id ?? null}
            onSelectWord={handleSelectWord}
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
            bookName={book.name}
          />
        </div>

        <div className="pane-surface" data-pane="notes">
          <PaneNotes
            stacked
            bookId={bookId}
            bookName={book.name}
            chapter={chapter}
            verse={selectedVerse}
            savedTranslation={currentTranslation?.translation ?? ""}
            savedMemo={currentTranslation?.memo ?? ""}
            savedMemoIsPublic={currentTranslation?.memoIsPublic ?? false}
            onSaved={() => { void refreshTranslations(); }}
          />
        </div>
      </div>
    </div>
  );
}
