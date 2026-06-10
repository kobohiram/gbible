"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { BOOKS, getBook, getVerseCount } from "@/data/bible";
import { getLexiconEntry, getVerseWords, DEFAULT_LOCATION } from "@/lib/verse-data";
import type { BookData, BookId, PaneId, PersonalTranslation, VerseWord } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaneLexicon } from "./PaneLexicon";
import { PaneNav } from "./PaneNav";
import { PaneNotes } from "./PaneNotes";
import { PaneVerse } from "./PaneVerse";
import { DataBackupMenu } from "./DataBackupMenu";
import { AuthButton } from "./AuthButton";

const PANES: { id: PaneId; label: string }[] = [
  { id: "nav", label: "目次" },
  { id: "verse", label: "原文" },
  { id: "lexicon", label: "辞書" },
  { id: "notes", label: "私訳" },
];

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
  const [bookId, setBookId] = useState<BookId>(DEFAULT_LOCATION.bookId);
  const [chapter, setChapter] = useState(DEFAULT_LOCATION.chapter);
  const [selectedVerse, setSelectedVerse] = useState(DEFAULT_LOCATION.verse);
  const [selectedWord, setSelectedWord] = useState<VerseWord | null>(null);
  const [activePane, setActivePane] = useState<PaneId>("verse");
  const [translations, setTranslations] = useState<PersonalTranslation[]>([]);
  const [bookData, setBookData] = useState<BookData | null>(null);

  // 書が変わったら JSON をフェッチ
  useEffect(() => {
    setBookData(null);
    let cancelled = false;
    fetch(`/data/nt/${bookId}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: BookData | null) => { if (!cancelled) setBookData(d); })
      .catch(() => { /* データなし — 静的フォールバックを使う */ });
    return () => { cancelled = true; };
  }, [bookId]);

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
    setActivePane("lexicon");
  }

  const reference = `${book.name} ${chapter}:${selectedVerse}`;

  const navPane = (
    <PaneNav
      books={BOOKS}
      bookId={bookId}
      chapter={chapter}
      selectedVerse={selectedVerse}
      translations={translations}
      bookDataLoaded={bookData !== null}
      onBookChange={handleBookChange}
      onChapterChange={handleChapterChange}
      onSelectVerse={setSelectedVerse}
    />
  );

  const versePane = (
    <PaneVerse
      reference={reference}
      words={words}
      selectedWordId={selectedWord?.id ?? null}
      onSelectWord={handleSelectWord}
    />
  );

  const lexiconPane = (
    <PaneLexicon
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
      onSaved={() => { void refreshTranslations(); }}
    />
  );

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-primary/30 bg-primary px-4 py-2.5 text-primary-foreground">
        <h1 className="text-lg font-bold tracking-tight">
          <span className="font-extrabold text-accent">G</span>bible
        </h1>
        <div className="flex items-center gap-3">
          <DataBackupMenu onImported={refreshTranslations} />
          <AuthButton />
        </div>
      </header>

      {/* Desktop: 4-pane resizable */}
      <ResizablePanelGroup
        className="hidden min-h-0 flex-1 md:flex"
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

      {/* Mobile: tabs */}
      <Tabs
        value={activePane}
        onValueChange={(value) => setActivePane(value as PaneId)}
        className="flex min-h-0 flex-1 flex-col md:hidden"
      >
        <TabsList
          variant="line"
          className="h-auto w-full shrink-0 rounded-none border-b border-primary/30 bg-primary p-0"
        >
          {PANES.map((pane) => (
            <TabsTrigger
              key={pane.id}
              value={pane.id}
              className="flex-1 rounded-none py-2.5 font-medium text-primary-foreground/75 after:bg-primary-foreground after:bottom-0 data-active:text-primary-foreground data-active:font-semibold"
            >
              {pane.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="nav"
          className="mt-0 min-h-0 flex-1 overflow-hidden data-hidden:hidden"
        >
          <PaneFrame pane="nav">{navPane}</PaneFrame>
        </TabsContent>
        <TabsContent
          value="verse"
          className="mt-0 min-h-0 flex-1 overflow-hidden data-hidden:hidden"
        >
          <PaneFrame pane="verse">{versePane}</PaneFrame>
        </TabsContent>
        <TabsContent
          value="lexicon"
          className="mt-0 min-h-0 flex-1 overflow-hidden data-hidden:hidden"
        >
          <PaneFrame pane="lexicon">{lexiconPane}</PaneFrame>
        </TabsContent>
        <TabsContent
          value="notes"
          className="mt-0 min-h-0 flex-1 overflow-hidden data-hidden:hidden"
        >
          <PaneFrame pane="notes">{notesPane}</PaneFrame>
        </TabsContent>
      </Tabs>
    </div>
  );
}
