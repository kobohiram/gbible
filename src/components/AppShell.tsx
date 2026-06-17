"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { BOOKS, getBook, getVerseCount } from "@/data/bible";
import { getLexiconEntry, getVerseWords, loadLastLocation, saveLastLocation } from "@/lib/verse-data";
import type { BookData, BookId, PersonalTranslation, VerseWord } from "@/types";
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
  const [bookId, setBookId] = useState<BookId>(() => loadLastLocation().bookId);
  const [chapter, setChapter] = useState(() => loadLastLocation().chapter);
  const [selectedVerse, setSelectedVerse] = useState(() => loadLastLocation().verse);
  const [selectedWord, setSelectedWord] = useState<VerseWord | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [translations, setTranslations] = useState<PersonalTranslation[]>([]);
  const [bookData, setBookData] = useState<BookData | null>(null);
  const mobileLexiconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.ok ? r.json() : null).then(d => {
      if (d?.users != null) setUserCount(d.users);
    }).catch(() => {});
  }, []);

  // 位置をローカルに記憶
  useEffect(() => {
    saveLastLocation(bookId, chapter, selectedVerse);
  }, [bookId, chapter, selectedVerse]);

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
    setTimeout(() => {
      mobileLexiconRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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
          <a
            href="/study/synoptic"
            className="text-sm font-semibold underline-offset-2 hover:underline"
          >
            共観福音書 →
          </a>
          <DataBackupMenu onImported={refreshTranslations} />
          <AuthButton />
        </div>
      </header>

      {/* Desktop: 4-pane resizable (wrapper controls visibility — ResizablePanelGroup applies inline display:flex which overrides Tailwind hidden) */}
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

      {/* Mobile: vertically stacked */}
      <div className="flex flex-1 flex-col overflow-y-auto md:hidden">

        {/* 目次（折りたたみ） */}
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
                books={BOOKS}
                bookId={bookId}
                chapter={chapter}
                selectedVerse={selectedVerse}
                translations={translations}
                bookDataLoaded={bookData !== null}
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

        {/* 原文 */}
        <div className="pane-surface border-b border-border" data-pane="verse">
          <PaneVerse
            stacked
            reference={reference}
            words={words}
            selectedWordId={selectedWord?.id ?? null}
            onSelectWord={handleSelectWord}
          />
        </div>

        {/* 辞書・解説 */}
        <div ref={mobileLexiconRef} className="pane-surface border-b border-border" data-pane="lexicon">
          <PaneLexicon
            stacked
            word={selectedWord}
            entry={lexiconEntry}
            reference={reference}
            verseWords={words}
            allVerseWords={bookData?.words ?? null}
            bookName={book.name}
          />
        </div>

        {/* 私訳・メモ */}
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
