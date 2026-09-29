"use client";

import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import type { BookData, BookId, LexiconEntry } from "@/types";
import type { Pericope } from "@/types/synoptic";
import { loadPericopes, buildWordMarkMap } from "@/lib/synoptic-data";
import { getBook } from "@/data/bible";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PericopeListPane } from "./PericopeListPane";
import { SynopticPane } from "./SynopticPane";

const SYNOPTIC_BOOKS: BookId[] = ["matthew", "mark", "luke"];
const SHOW_JOHN_KEY = "gbible-synoptic-show-john";

function shortBookName(bookId: BookId): string {
  return getBook(bookId).name.replace("による福音書", "");
}

let globalLexiconCache: Record<string, LexiconEntry> | null = null;
let globalLexiconPromise: Promise<Record<string, LexiconEntry>> | null = null;
function loadGlobalLexicon(): Promise<Record<string, LexiconEntry>> {
  if (globalLexiconCache) return Promise.resolve(globalLexiconCache);
  if (!globalLexiconPromise) {
    globalLexiconPromise = fetch("/data/nt/lexicon.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        globalLexiconCache = data;
        return data;
      })
      .catch(() => ({}));
  }
  return globalLexiconPromise;
}

const LEGEND = [
  { label: "三者共通", varName: "--match-triple" },
  { label: "マタイ+ルカ", varName: "--match-mt-lk" },
  { label: "マタイ+マルコ", varName: "--match-mt-mk" },
  { label: "マルコ+ルカ", varName: "--match-mk-lk" },
];

export function SynopticShell() {
  const [pericopes, setPericopes] = useState<Pericope[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showJohn, setShowJohn] = useState(false);
  const [bookDataMap, setBookDataMap] = useState<Partial<Record<BookId, BookData>>>({});
  const [globalLexicon, setGlobalLexicon] = useState<Record<string, LexiconEntry> | null>(null);

  useEffect(() => {
    void loadPericopes().then((file) => {
      setPericopes(file.pericopes);
      setSelectedId((prev) => prev ?? file.pericopes[0]?.id ?? null);
    });
    void loadGlobalLexicon().then(setGlobalLexicon);
  }, []);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(SHOW_JOHN_KEY) : null;
    if (saved === "1") setShowJohn(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SHOW_JOHN_KEY, showJohn ? "1" : "0");
  }, [showJohn]);

  const paneBooks = useMemo<BookId[]>(
    () => (showJohn ? [...SYNOPTIC_BOOKS, "john"] : SYNOPTIC_BOOKS),
    [showJohn],
  );

  useEffect(() => {
    for (const bookId of paneBooks) {
      if (bookDataMap[bookId]) continue;
      fetch(`/data/nt/${bookId}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<BookData>) : null))
        .then((data) => {
          if (data) setBookDataMap((prev) => ({ ...prev, [bookId]: data }));
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneBooks]);

  const selectedPericope = pericopes.find((p) => p.id === selectedId) ?? null;
  const wordMarkMap = useMemo(() => buildWordMarkMap(selectedPericope), [selectedPericope]);

  const panelChildren: React.ReactNode[] = [
    <ResizablePanel
      key="pericope-list"
      className="min-w-0"
      collapsible={false}
      defaultSize="14%"
      id="pane-pericope-list"
      maxSize="20%"
      minSize="10%"
    >
      <div className="pane-surface flex h-full min-h-0 flex-col overflow-hidden" data-pane="nav">
        <PericopeListPane pericopes={pericopes} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
    </ResizablePanel>,
    <ResizableHandle key="handle-pericope-list" withHandle />,
  ];
  paneBooks.forEach((bookId, i) => {
    if (i > 0) panelChildren.push(<ResizableHandle key={`handle-${bookId}`} withHandle />);
    const passage = selectedPericope?.passages.find((p) => p.bookId === bookId) ?? null;
    panelChildren.push(
      <ResizablePanel
        key={bookId}
        className="min-w-0"
        collapsible={false}
        defaultSize={`${Math.floor(86 / paneBooks.length)}%`}
        id={`pane-${bookId}`}
        minSize="18%"
      >
        <div
          className="pane-surface flex h-full min-h-0 flex-col overflow-hidden"
          data-pane="synoptic"
        >
          <SynopticPane
            bookName={shortBookName(bookId)}
            participates={passage !== null}
            ranges={passage?.ranges ?? []}
            bookData={bookDataMap[bookId] ?? null}
            wordMarkMap={wordMarkMap}
            globalLexicon={globalLexicon}
          />
        </div>
      </ResizablePanel>,
    );
  });

  return (
    <div className="flex h-dvh flex-col">
      <SiteHeader />

      <div className="flex shrink-0 flex-wrap items-center gap-4 border-b border-border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
        <h1 className="text-sm font-bold text-foreground">共観福音書</h1>
        <button
          type="button"
          onClick={() => setShowJohn((v) => !v)}
          aria-pressed={showJohn}
          className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
            showJohn
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-foreground hover:bg-muted"
          }`}
        >
          {showJohn ? "− ヨハネを隠す" : "+ ヨハネも並べる"}
        </button>
        <span className="font-semibold">一致マーカー:</span>
        {LEGEND.map((item) => (
          <span key={item.varName} className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: `var(${item.varName})` }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1">
        <ResizablePanelGroup className="min-h-0 flex-1" id="synoptic-panes" orientation="horizontal">
          {panelChildren}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
