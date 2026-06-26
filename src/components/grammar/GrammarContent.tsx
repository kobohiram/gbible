"use client";

import { useEffect, useRef } from "react";
import type { ContentNode, GreekWord } from "@/types/grammar";
import { GreekWordPopover } from "./GreekWordPopover";

type Props = {
  content: ContentNode[];
  highlightSectionId?: string | null;
};

function GreekInline({ words }: { words: GreekWord[] }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      {words.map((w, i) => (
        <GreekWordPopover key={i} word={w} />
      ))}
    </span>
  );
}

function renderNode(node: ContentNode, highlightId?: string | null) {
  const nodeId = node.type !== "blank" ? node.id : undefined;
  const highlighted = highlightId && nodeId === highlightId;
  const hlClass = highlighted ? "ring-2 ring-yellow-400 rounded-md bg-yellow-50 dark:bg-yellow-900/20" : "";

  switch (node.type) {
    case "heading": {
      const Tag = node.level === 2 ? "h2" : node.level === 3 ? "h3" : "h4";
      const sizeClass =
        node.level === 2
          ? "text-lg font-bold mt-6 mb-2"
          : node.level === 3
            ? "text-base font-semibold mt-4 mb-1.5"
            : "text-sm font-semibold mt-3 mb-1";
      return (
        <Tag
          key={node.id ?? node.text}
          id={node.id}
          className={`${sizeClass} text-foreground scroll-mt-4 ${hlClass}`}
        >
          {node.text}
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p
          key={node.id ?? node.text.slice(0, 20)}
          id={node.id}
          className={`text-sm leading-relaxed text-foreground/90 ${hlClass}`}
        >
          {node.text}
        </p>
      );

    case "highlight":
      return (
        <div
          key={node.id ?? node.text.slice(0, 20)}
          id={node.id}
          className={`rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed ${hlClass}`}
        >
          {node.text}
        </div>
      );

    case "note":
      return (
        <p
          key={nodeId ?? node.text.slice(0, 20)}
          id={nodeId}
          className={`text-xs text-muted-foreground italic ${hlClass}`}
        >
          {node.text}
        </p>
      );

    case "list":
      return node.ordered ? (
        <ol
          key={node.id ?? "ol"}
          id={node.id}
          className={`list-decimal list-inside space-y-1.5 text-sm text-foreground/90 ${hlClass}`}
        >
          {node.items.map((item, i) => (
            <li key={i} className="leading-relaxed pl-1">
              {item}
            </li>
          ))}
        </ol>
      ) : (
        <ul
          key={node.id ?? "ul"}
          id={node.id}
          className={`list-disc list-inside space-y-1.5 text-sm text-foreground/90 ${hlClass}`}
        >
          {node.items.map((item, i) => (
            <li key={i} className="leading-relaxed pl-1">
              {item}
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div key={node.id ?? "table"} id={node.id} className={`overflow-x-auto ${hlClass}`}>
          {node.caption && (
            <p className="mb-1 text-xs text-muted-foreground">{node.caption}</p>
          )}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                {node.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border border-border px-3 py-1.5 text-left text-xs font-semibold text-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {node.rows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? "bg-muted/20" : ""}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border border-border px-3 py-1.5 font-greek text-sm text-foreground/90"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "greek-chars":
      return (
        <div
          key={node.id ?? node.label}
          id={node.id}
          className={`space-y-1 ${hlClass}`}
        >
          <p className="text-xs text-muted-foreground">{node.label}</p>
          <div className="flex flex-wrap gap-2">
            {node.chars.map((ch, i) => (
              <span
                key={i}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted/30 font-greek text-xl text-foreground"
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      );

    case "example":
      return (
        <div
          key={node.id ?? "example"}
          id={node.id}
          className={`rounded-lg border border-border bg-muted/20 px-4 py-3 ${hlClass}`}
        >
          {node.reference && (
            <p className="mb-1 text-xs font-semibold text-muted-foreground">{node.reference}</p>
          )}
          <p className="mb-1 font-greek text-base leading-loose text-foreground">
            <GreekInline words={node.greek} />
          </p>
          <p className="text-sm text-foreground/80">{node.japaneseTranslation}</p>
          {node.note && <p className="mt-1 text-xs text-muted-foreground">{node.note}</p>}
        </div>
      );

    case "formula":
      return (
        <div
          key={node.id ?? node.text}
          id={node.id}
          className={`rounded-md bg-muted/40 px-4 py-2 font-mono text-sm ${hlClass}`}
        >
          <span className="font-greek">{node.text}</span>
          {node.note && <span className="ml-2 text-xs text-muted-foreground">{node.note}</span>}
        </div>
      );

    case "blank":
      return <div key="blank" className="h-2" />;

    default:
      return null;
  }
}

export function GrammarContent({ content, highlightSectionId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!highlightSectionId) return;
    const el = document.getElementById(highlightSectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightSectionId]);

  return (
    <div ref={containerRef} className="space-y-4 px-5 py-4">
      {content.map((node) => renderNode(node, highlightSectionId))}
    </div>
  );
}
