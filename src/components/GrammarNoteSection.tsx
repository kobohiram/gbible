"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { GrammarNoteRequest, GrammarNoteResponse } from "@/app/api/grammar-note/route";

type Props = {
  request: GrammarNoteRequest | null;
};

const memCache = new Map<string, GrammarNoteResponse>();

export function GrammarNoteSection({ request }: Props) {
  const { data: session } = useSession();
  const [data, setData] = useState<GrammarNoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!request) { setData(null); setError(null); return; }

    const cacheKey = `${request.morph}:${request.lemma ?? ""}:${request.reference}`;
    const cached = memCache.get(cacheKey);
    if (cached) { setData(cached); setLoading(false); setError(null); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setData(null);
    setError(null);

    fetch("/api/grammar-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(r => r.json() as Promise<GrammarNoteResponse & { error?: string }>)
      .then(res => {
        if (res.error) throw new Error(res.error);
        memCache.set(cacheKey, res);
        setData(res);
      })
      .catch(err => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "生成に失敗しました");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [request?.morph, request?.lemma, request?.greek, request?.reference]);

  async function handleReview() {
    if (!data?.id) return;
    setReviewing(true);
    try {
      await fetch("/api/grammar-note", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id }),
      });
      const updated = { ...data, reviewed: true };
      setData(updated);
      if (request) {
        const cacheKey = `${request.morph}:${request.lemma ?? ""}:${request.reference}`;
        memCache.set(cacheKey, updated);
      }
    } finally {
      setReviewing(false);
    }
  }

  if (!request) return null;

  return (
    <section className="morph-note-box">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold text-[var(--grammar)]">文法のワンポイント</p>
        {data?.reviewed && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
            レビュー済み
          </span>
        )}
        {!data?.reviewed && data && (
          <span className="rounded bg-accent/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            AI生成・参考情報
          </span>
        )}
      </div>

      {loading && (
        <p className="mt-1 text-sm text-muted-foreground">解説を生成中…</p>
      )}
      {!loading && data?.content && (
        <>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{data.content}</p>
          {!data.reviewed && session?.user && data.id && (
            <button
              type="button"
              onClick={handleReview}
              disabled={reviewing}
              className="mt-2 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
            >
              {reviewing ? "保存中…" : "✓ この解説を承認"}
            </button>
          )}
        </>
      )}
      {!loading && error && (
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      )}
    </section>
  );
}
