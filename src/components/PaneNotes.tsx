"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import type { BookId, CommunityMemo } from "@/types";

type Props = {
  bookId: BookId;
  bookName: string;
  chapter: number;
  verse: number;
  savedTranslation: string;
  savedMemo: string;
  savedMemoIsPublic: boolean;
  onSaved: () => void;
  stacked?: boolean;
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  return `${Math.floor(diff / 86400)}日前`;
}

export function PaneNotes({
  bookId,
  bookName,
  chapter,
  verse,
  savedTranslation,
  savedMemo,
  savedMemoIsPublic,
  onSaved,
  stacked,
}: Props) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const [translation, setTranslation] = useState(savedTranslation);
  const [memo, setMemo] = useState(savedMemo);
  const [memoIsPublic, setMemoIsPublic] = useState(savedMemoIsPublic);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<"saved" | "error" | null>(null);
  const [communityMemos, setCommunityMemos] = useState<CommunityMemo[]>([]);

  useEffect(() => {
    setTranslation(savedTranslation);
    setMemo(savedMemo);
    setMemoIsPublic(savedMemoIsPublic);
    setSaveResult(null);
  }, [savedTranslation, savedMemo, savedMemoIsPublic, bookId, chapter, verse]);

  useEffect(() => {
    setCommunityMemos([]);
    fetch(`/api/community-memos?bookId=${bookId}&chapter=${chapter}&verse=${verse}`)
      .then(r => r.ok ? r.json() as Promise<CommunityMemo[]> : [])
      .then(setCommunityMemos)
      .catch(() => {});
  }, [bookId, chapter, verse]);

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/translations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, chapter, verse, translation, memo, memoIsPublic }),
      });
      if (!res.ok) throw new Error();
      setSaveResult("saved");
      onSaved();
      // 公開状態が変わったのでコミュニティ一覧を再取得
      const r2 = await fetch(`/api/community-memos?bookId=${bookId}&chapter=${chapter}&verse=${verse}`);
      if (r2.ok) setCommunityMemos(await r2.json() as CommunityMemo[]);
      setTimeout(() => setSaveResult(null), 2000);
    } catch {
      setSaveResult("error");
    } finally {
      setSaving(false);
    }
  }

  const myName = session?.user?.name ?? null;

  return (
    <div className={stacked ? "flex flex-col" : "flex h-full flex-col"}>
      <header className="pane-header px-4 py-3">
        <h2 className="pane-header-label">私訳・メモ</h2>
        <p className="mt-1 font-bold text-foreground">
          {bookName} {chapter}:{verse}
        </p>
      </header>

      <div className={stacked ? "flex flex-col gap-3 p-4" : "flex flex-1 flex-col gap-3 overflow-y-auto p-4"}>
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

        {/* 私訳 */}
        <label className="flex flex-col gap-1">
          <span className="section-label">私訳</span>
          <textarea
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="この節の自分の訳を書く…"
            disabled={!isLoggedIn}
            rows={3}
            className="resize-none rounded-lg border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>

        {/* メモ */}
        <label className="flex flex-col gap-1">
          <span className="section-label">メモ</span>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="文法の気づき、感想、祈りなど…"
            disabled={!isLoggedIn}
            rows={3}
            className="resize-none rounded-lg border border-input bg-card p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </label>

        {/* 公開チェック + 保存ボタン */}
        <div className="flex items-center justify-between gap-3">
          <label className={`flex items-center gap-2 text-xs ${isLoggedIn ? "cursor-pointer text-foreground" : "cursor-not-allowed opacity-40"}`}>
            <input
              type="checkbox"
              checked={memoIsPublic}
              onChange={(e) => setMemoIsPublic(e.target.checked)}
              disabled={!isLoggedIn}
              className="h-3.5 w-3.5 accent-primary"
            />
            メモを公開する
          </label>
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={!isLoggedIn || saving}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "保存中…" : saveResult === "saved" ? "保存しました" : "保存"}
          </button>
        </div>
        {saveResult === "error" && (
          <p className="text-xs text-red-600">保存に失敗しました。もう一度お試しください。</p>
        )}

        {/* コミュニティメモ */}
        <section className="mt-1 border-t border-border pt-3">
          <h3 className="section-label mb-2">
            みんなのメモ
            {communityMemos.length > 0 && (
              <span className="ml-1 font-normal normal-case text-muted-foreground">
                {communityMemos.length}件
              </span>
            )}
          </h3>
          {communityMemos.length === 0 ? (
            <p className="text-xs text-muted-foreground">まだ公開メモはありません。</p>
          ) : (
            <ul className="space-y-2">
              {communityMemos.map((m) => (
                <li
                  key={m.id}
                  className={`rounded-lg border px-3 py-2.5 text-sm ${
                    myName && m.userName === myName
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {m.userName}
                      {myName && m.userName === myName && (
                        <span className="ml-1 text-primary font-normal">（あなた）</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.updatedAt)}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{m.memo}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
