"use client";

import { useEffect, useRef, useState } from "react";
import type { GrammarNoteRequest } from "@/app/api/grammar-note/route";

type Props = {
  request: GrammarNoteRequest | null;
};

const cache = new Map<string, string>();

export function GrammarNoteSection({ request }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!request) {
      setContent(null);
      setError(null);
      return;
    }

    const cacheKey = `${request.morph}:${request.lemma ?? request.greek}:${request.reference}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      setContent(cached);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setContent(null);
    setError(null);

    fetch("/api/grammar-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(r => r.json() as Promise<{ content?: string; error?: string }>)
      .then(data => {
        if (data.error) throw new Error(data.error);
        const text = data.content ?? "";
        cache.set(cacheKey, text);
        setContent(text);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "生成に失敗しました");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [request?.morph, request?.lemma, request?.greek, request?.reference]);

  if (!request) return null;

  return (
    <section className="morph-note-box">
      <p className="text-xs font-semibold text-[var(--grammar)]">文法のワンポイント</p>
      {loading && (
        <p className="mt-1 text-sm text-muted-foreground">解説を生成中…</p>
      )}
      {!loading && content && (
        <p className="mt-1 text-sm leading-relaxed text-foreground">{content}</p>
      )}
      {!loading && error && (
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      )}
    </section>
  );
}
