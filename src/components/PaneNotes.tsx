"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import type { BookId } from "@/types";

type Props = {
  bookId: BookId;
  bookName: string;
  chapter: number;
  verse: number;
  savedTranslation: string;
  savedMemo: string;
  onSaved: () => void;
};

export function PaneNotes({
  bookId,
  bookName,
  chapter,
  verse,
  savedTranslation,
  savedMemo,
  onSaved,
}: Props) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const [translation, setTranslation] = useState(savedTranslation);
  const [memo, setMemo] = useState(savedMemo);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    setTranslation(savedTranslation);
    setMemo(savedMemo);
    setSaveResult(null);
  }, [savedTranslation, savedMemo, bookId, chapter, verse]);

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapter, verse, translation, memo }),
      });
      if (!res.ok) throw new Error();
      setSaveResult("saved");
      onSaved();
      setTimeout(() => setSaveResult(null), 2000);
    } catch {
      setSaveResult("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="pane-header px-4 py-3">
        <h2 className="pane-header-label">私訳・メモ</h2>
        <p className="mt-1 font-bold text-foreground">
          {bookName} {chapter}:{verse}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {!isLoggedIn && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <p className="mb-2 font-medium text-foreground">
              Googleでログインすると入力・保存できます。
            </p>
            <button
              type="button"
              onClick={() => signIn("google")}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Googleでログイン
            </button>
          </div>
        )}
        <label className="flex flex-1 flex-col gap-1">
          <span className="section-label">私訳</span>
          <textarea
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="この節の自分の訳を書く…"
            disabled={!isLoggedIn}
            className="min-h-24 flex-1 resize-none rounded-lg border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="section-label">メモ（感想・調べたこと）</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="文法の気づき、参考書、祈りなど…"
            disabled={!isLoggedIn}
            className="min-h-24 flex-1 resize-none rounded-lg border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>
        {saveResult === "error" && (
          <p className="text-xs text-red-600">保存に失敗しました。もう一度お試しください。</p>
        )}
        <button
          type="button"
          onClick={() => { void handleSave(); }}
          disabled={!isLoggedIn || saving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "保存中…" : saveResult === "saved" ? "保存しました" : "保存"}
        </button>
      </div>
    </div>
  );
}
