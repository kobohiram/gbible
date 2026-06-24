"use client";

import type { ContextApiRequest } from "@/lib/context-llm";
import type { MnspBookData } from "@/lib/translations";
import type { BookId } from "@/types";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { PaneContext } from "./PaneContext";
import { PaneNotes } from "./PaneNotes";

type Props = {
  contextRequest: ContextApiRequest | null;
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
  const context = (
    <PaneContext
      embedded={!stacked}
      stacked={stacked}
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
        {context}
        <div className="border-t border-border" />
        {notes}
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
        id="context"
        minSize="22%"
      >
        {context}
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
