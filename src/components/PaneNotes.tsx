"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import type { BookId, CommunityMemo } from "@/types";
import type { MnspBookData } from "@/lib/translations";
import { getMnspSotaku } from "@/lib/translations";
import { useAutoSave, SaveStatus } from "@/lib/use-auto-save";

type Props = {
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
  mnspData,
  savedTranslation,
  savedMemo,
  savedMemoIsPublic,
  onSaved,
  stacked,
}: Props) {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  const projectSotaku = getMnspSotaku(mnspData, chapter, verse) ?? "";
  const resetKey = `${bookId}:${chapter}:${verse}`;

  const [memo, setMemo] = useState(savedMemo || projectSotaku);
  const [memoIsPublic, setMemoIsPublic] = useState(savedMemoIsPublic);
  const [communityMemos, setCommunityMemos] = useState<CommunityMemo[]>([]);

  useEffect(() => {
    setMemo(savedMemo || projectSotaku);
    setMemoIsPublic(savedMemoIsPublic);
  }, [savedMemo, savedMemoIsPublic, projectSotaku, resetKey]);

  useEffect(() => {
    setCommunityMemos([]);
    fetch(`/api/community-memos?bookId=${bookId}&chapter=${chapter}&verse=${verse}`)
      .then((r) => (r.ok ? (r.json() as Promise<CommunityMemo[]>) : []))
      .then(setCommunityMemos)
      .catch(() => {});
  }, [bookId, chapter, verse]);

  const persist = useCallback(async () => {
    const res = await fetch("/api/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookId,
        chapter,
        verse,
        translation: savedTranslation,
        memo,
        memoIsPublic,
      }),
    });
    if (!res.ok) throw new Error();
    onSaved();
    const r2 = await fetch(
      `/api/community-memos?bookId=${bookId}&chapter=${chapter}&verse=${verse}`,
    );
    if (r2.ok) setCommunityMemos((await r2.json()) as CommunityMemo[]);
  }, [
    bookId,
    chapter,
    verse,
    savedTranslation,
    memo,
    memoIsPublic,
    onSaved,
  ]);

  const saveStatus = useAutoSave(
    `${memo}\0${memoIsPublic}`,
    resetKey,
    { enabled: isLoggedIn, onSave: persist },
  );

  const myName = session?.user?.name ?? null;

  return (
    <div className={stacked ? "flex flex-col" : "flex h-full flex-col"}>
      <header className="pane-header px-4 py-3">
        <h2 className="pane-header-label">メモ</h2>
        <p className="mt-1 font-bold text-foreground">
          {bookName} {chapter}:{verse}
        </p>
      </header>

      <div
        className={
          stacked
            ? "flex flex-col gap-3 p-4"
            : "flex flex-1 flex-col gap-3 overflow-y-auto p-4"
        }
      >
        <label className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="section-label">メモ（素訳）</span>
            {isLoggedIn && <SaveStatus status={saveStatus} />}
          </div>
          {isLoggedIn ? (
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={
                projectSotaku
                  ? "素訳をメモとして編集できます…"
                  : "素訳メモを書く…"
              }
              rows={5}
              className="resize-none rounded-lg border border-input bg-card p-3 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          ) : projectSotaku ? (
            <p className="rounded-lg border border-border bg-card/40 p-3 text-sm leading-relaxed text-foreground/90">
              {projectSotaku}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              <button
                type="button"
                onClick={() => signIn("google")}
                className="text-primary underline-offset-2 hover:underline"
              >
                ログインしてください
              </button>
            </p>
          )}
          {projectSotaku && !isLoggedIn && (
            <p className="text-[10px] text-muted-foreground">
              出典：みんなの聖書翻訳プロジェクト
            </p>
          )}
        </label>

        {isLoggedIn && (
          <label className="flex items-center gap-2 text-xs cursor-pointer text-foreground">
            <input
              type="checkbox"
              checked={memoIsPublic}
              onChange={(e) => setMemoIsPublic(e.target.checked)}
              className="h-3.5 w-3.5 accent-primary"
            />
            メモを公開する
          </label>
        )}

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
            <p className="text-xs text-muted-foreground">
              まだ公開メモはありません。
            </p>
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
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {m.userName}
                      {myName && m.userName === myName && (
                        <span className="ml-1 font-normal text-primary">
                          （あなた）
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(m.updatedAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {m.memo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
