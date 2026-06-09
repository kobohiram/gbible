"use client";

import { useEffect, useState } from "react";
import type { BookId } from "@/types";
import { getTranslation, saveTranslation } from "@/lib/storage";
import { LoginGate } from "./LoginGate";

type Props = {
  bookId: BookId;
  bookName: string;
  chapter: number;
  verse: number;
  onSaved: () => void;
};

export function PaneNotes({
  bookId,
  bookName,
  chapter,
  verse,
  onSaved,
}: Props) {
  const [translation, setTranslation] = useState("");
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = getTranslation(bookId, chapter, verse);
    setTranslation(existing?.translation ?? "");
    setMemo(existing?.memo ?? "");
    setSaved(false);
  }, [bookId, chapter, verse]);

  function handleSave() {
    saveTranslation({
      bookId,
      chapter,
      verse,
      translation,
      memo,
    });
    setSaved(true);
    onSaved();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <LoginGate>
    <div className="flex h-full flex-col">
      <header className="pane-header px-4 py-3">
        <h2 className="pane-header-label">私訳・メモ</h2>
        <p className="mt-1 font-bold text-foreground">
          {bookName} {chapter}:{verse}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="section-label">私訳</span>
          <textarea
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="この節の自分の訳を書く…"
            className="min-h-24 flex-1 resize-none rounded-lg border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="section-label">
            メモ（感想・調べたこと）
          </span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="文法の気づき、参考書、祈りなど…"
            className="min-h-24 flex-1 resize-none rounded-lg border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {saved ? "保存しました" : "保存"}
        </button>
      </div>
    </div>
    </LoginGate>
  );
}
