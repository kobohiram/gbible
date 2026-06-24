"use client";

import { useEffect, useState } from "react";
import type { ContextApiRequest } from "@/lib/context-llm";
import type { MnspBookData } from "@/lib/translations";
import type { BookId } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { loadGrammarCollapsed, PaneGrammarPoint } from "./PaneGrammarPoint";
import { PaneNotes } from "./PaneNotes";

const GRAMMAR_COLLAPSED_KEY = "gbible-grammar-collapsed";

type Props = {
  contextRequest: ContextApiRequest;
  reference: string;
  bookId: BookId;
  bookName: string;
  chapter: number;
  verse: number;
  mnspData: MnspBookData | null;
  savedTranslation: string;
  savedMemo: string;
  savedMemoIsPublic: boolean;
  onSaved: () => void;
  stacked?: boolean;
};

export function PaneSide({
  contextRequest,
  reference,
  bookId,
  bookName,
  chapter,
  verse,
  mnspData,
  savedTranslation,
  savedMemo,
  savedMemoIsPublic,
  onSaved,
  stacked,
}: Props) {
  const [grammarCollapsed, setGrammarCollapsed] = useState(false);

  useEffect(() => {
    setGrammarCollapsed(loadGrammarCollapsed());
  }, []);

  function handleGrammarCollapsedChange(collapsed: boolean) {
    setGrammarCollapsed(collapsed);
    try {
      localStorage.setItem(GRAMMAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }

  const grammar = (
    <PaneGrammarPoint
      embedded={!stacked}
      stacked={stacked}
      collapsed={grammarCollapsed}
      onCollapsedChange={handleGrammarCollapsedChange}
      contextRequest={contextRequest}
      reference={reference}
    />
  );

  const notes = (
    <PaneNotes
      embedded={!stacked}
      stacked={stacked}
      bookId={bookId}
      bookName={bookName}
      reference={reference}
      chapter={chapter}
      verse={verse}
      mnspData={mnspData}
      savedTranslation={savedTranslation}
      savedMemo={savedMemo}
      savedMemoIsPublic={savedMemoIsPublic}
      onSaved={onSaved}
    />
  );

  if (stacked) {
    return (
      <div className="flex flex-col">
        {grammar}
        {!grammarCollapsed && <div className="border-t border-border" />}
        {notes}
      </div>
    );
  }

  if (grammarCollapsed) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {grammar}
        <div className="min-h-0 flex-1">{notes}</div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      className="h-full min-h-0"
      id="gbible-side-panes"
      orientation="vertical"
    >
      <ResizablePanel
        className="min-h-0"
        collapsible={false}
        defaultSize="48%"
        id="grammar"
        minSize="22%"
      >
        {grammar}
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel
        className="min-h-0"
        collapsible={false}
        defaultSize="52%"
        id="notes"
        minSize="22%"
      >
        {notes}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
