import type { ReactNode } from "react";
import { splitTextWithReferences, type BibleLocation } from "@/lib/bible-reference";
import type { BookId } from "@/types";

type Props = {
  content: string;
  contextBookId?: BookId;
  onNavigateToVerse?: (location: BibleLocation) => void;
};

function parseFormatting(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function parseInline(
  text: string,
  keyPrefix: string,
  contextBookId?: BookId,
  onNavigateToVerse?: (location: BibleLocation) => void,
): ReactNode[] {
  if (!onNavigateToVerse) {
    return parseFormatting(text, keyPrefix);
  }

  const segments = splitTextWithReferences(text, contextBookId);
  const nodes: ReactNode[] = [];

  segments.forEach((segment, i) => {
    if (segment.type === "text") {
      nodes.push(...parseFormatting(segment.value, `${keyPrefix}-t${i}`));
      return;
    }

    nodes.push(
      <button
        key={`${keyPrefix}-r${i}`}
        type="button"
        onClick={() => onNavigateToVerse(segment.location)}
        className="font-medium text-primary underline-offset-2 hover:underline"
        title={`${segment.location.chapter}:${segment.location.verse} へ移動`}
      >
        {parseFormatting(segment.value, `${keyPrefix}-r${i}`)}
      </button>,
    );
  });

  return nodes;
}

export function GrammarNoteContent({
  content,
  contextBookId,
  onNavigateToVerse,
}: Props) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listOrdered = false;
  let key = 0;

  const inlineOpts = { contextBookId, onNavigateToVerse };

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(" ").trim();
    if (text) {
      nodes.push(
        <p key={key++}>
          {parseInline(text, `p${key}`, inlineOpts.contextBookId, inlineOpts.onNavigateToVerse)}
        </p>,
      );
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    const ListTag = listOrdered ? "ol" : "ul";
    const listClass = listOrdered ? "list-decimal" : "list-disc";
    nodes.push(
      <ListTag key={key++} className={`${listClass} space-y-1 pl-4`}>
        {listItems.map((item, i) => (
          <li key={i}>
            {parseInline(item, `li${key}-${i}`, inlineOpts.contextBookId, inlineOpts.onNavigateToVerse)}
          </li>
        ))}
      </ListTag>,
    );
    listItems = [];
    listOrdered = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h4 key={key++} className="text-xs font-semibold text-[var(--grammar)]">
          {parseInline(trimmed.slice(4), `h4${key}`, inlineOpts.contextBookId, inlineOpts.onNavigateToVerse)}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold text-[var(--grammar)]">
          {parseInline(trimmed.slice(3), `h3${key}`, inlineOpts.contextBookId, inlineOpts.onNavigateToVerse)}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold text-[var(--grammar)]">
          {parseInline(trimmed.slice(2), `h1${key}`, inlineOpts.contextBookId, inlineOpts.onNavigateToVerse)}
        </h3>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const ordered = /^\d+\.\s+/.test(trimmed);
      if (listItems.length > 0 && listOrdered !== ordered) {
        flushList();
      }
      listOrdered = ordered;
      listItems.push(trimmed.replace(/^[-*]\s+|^\d+\.\s+/, ""));
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushList();
  flushParagraph();

  return (
    <div className="mt-1 space-y-2 text-sm leading-relaxed text-foreground">
      {nodes}
    </div>
  );
}
