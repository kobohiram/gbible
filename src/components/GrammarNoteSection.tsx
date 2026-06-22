"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { GrammarNoteRequest, GrammarNoteResponse } from "@/app/api/grammar-note/route";
import { GrammarNoteContent } from "./GrammarNoteContent";

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

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(false);

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

  async function handleSaveEdit() {
    if (!data?.id || !editText.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/grammar-note", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: data.id, content: editText.trim(), reviewed: true }),
      });
      const updated = { ...data, content: editText.trim(), reviewed: true };
      setData(updated);
      if (request) {
        const cacheKey = `${request.morph}:${request.lemma ?? ""}:${request.reference}`;
        memCache.set(cacheKey, updated);
      }
      setEditing(false);
    } finally {
      setSaving(false);
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
          {editing ? (
            <div className="mt-1 space-y-2">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={6}
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="rounded bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? "保存中…" : "保存してレビュー済みにする"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <GrammarNoteContent content={data.content} />
          )}
          {!editing && data.id && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-3">
                {!data.reviewed && (
                  <button
                    type="button"
                    onClick={session?.user ? handleReview : () => setLoginPrompt(true)}
                    disabled={reviewing}
                    className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                  >
                    {reviewing ? "保存中…" : "✓ 承認"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={session?.user ? () => { setEditText(data.content); setEditing(true); } : () => setLoginPrompt(true)}
                  className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  ✎ 編集
                </button>
              </div>
              {loginPrompt && !session?.user && (
                <p className="text-[11px] text-muted-foreground">
                  Googleでログインすると承認・編集できます。
                </p>
              )}
            </div>
          )}
        </>
      )}
      {!loading && error && (
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
      )}
    </section>
  );
}
