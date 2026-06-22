import type { ReactNode } from "react";

function parseInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function GrammarNoteContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    const text = paragraphLines.join(" ").trim();
    if (text) {
      nodes.push(
        <p key={key++}>{parseInline(text)}</p>,
      );
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={key++} className="list-disc space-y-1 pl-4">
        {listItems.map((item, i) => (
          <li key={i}>{parseInline(item)}</li>
        ))}
      </ul>,
    );
    listItems = [];
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
          {parseInline(trimmed.slice(4))}
        </h4>,
      );
      continue;
    }
    if (trimmed.startsWith("## ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold text-[var(--grammar)]">
          {parseInline(trimmed.slice(3))}
        </h3>,
      );
      continue;
    }
    if (trimmed.startsWith("# ")) {
      flushList();
      flushParagraph();
      nodes.push(
        <h3 key={key++} className="text-sm font-semibold text-[var(--grammar)]">
          {parseInline(trimmed.slice(2))}
        </h3>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
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
