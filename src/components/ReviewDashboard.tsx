"use client";

import { useCallback, useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { getBook } from "@/data/bible";
import type { ReviewRole, ReviewSuggestion, ReviewValue } from "@/lib/lexicon-review";
import type { BookId } from "@/types";

type QueueItem = Omit<ReviewSuggestion, "isMine" | "reviewerName" | "reviewerNote">;
type Reviewer = { email: string; displayName: string; note: string; addedAt: string; reviewCount: number };

function describe(v: ReviewValue | null) {
  if (!v) return null;
  if ("gloss" in v) return <span className="font-medium text-[var(--gloss)]">{v.gloss}</span>;
  return (
    <span>
      <span className="font-medium text-[var(--gloss)]">{v.glossJa}</span>
      <span className="text-muted-foreground">／{v.definitionJa}</span>
    </span>
  );
}

function referenceOf(item: QueueItem): string {
  let name: string = item.bookId;
  try {
    name = getBook(item.bookId as BookId).name;
  } catch {
    // 未知の書 ID はそのまま表示
  }
  return item.kind === "gloss" && item.verseKey ? `${name} ${item.verseKey}` : `${name}（辞書 ${item.targetId}）`;
}

export function ReviewDashboard() {
  const { status } = useSession();
  const [role, setRole] = useState<ReviewRole | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/lexicon-review/queue");
    const data = (await res.json()) as { role: ReviewRole; items: QueueItem[] };
    setRole(data.role);
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    if (status !== "loading") void load();
  }, [status, load]);

  async function decide(id: number, decision: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/lexicon-review/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note: notes[id] ?? "" }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "処理できませんでした。");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理できませんでした。");
    } finally {
      setBusyId(null);
    }
  }

  const isReviewer = role === "reviewer" || role === "admin";

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">みんなで作る辞書：確認待ちの提案</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            利用者から届いた「この訳で正しい」「修正の提案」を確認します。承認した内容はすぐに原文ペインと辞書ペインに反映され、「確認済み」と表示されます。
          </p>
        </div>

        {status === "unauthenticated" ? (
          <div className="rounded-lg border border-dashed border-border p-4">
            <p className="text-sm text-muted-foreground">確認者の方は、指名されたメールアドレスの Google アカウントでログインしてください。</p>
            <Button type="button" className="mt-3 h-10 px-4" onClick={() => signIn("google")}>
              Googleでログイン
            </Button>
          </div>
        ) : role && !isReviewer ? (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            このページは確認者として指名された方のみ使えます。確認者になりたい方は、運営者にご連絡ください。
          </p>
        ) : isReviewer ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">確認待ち {items.length} 件</h2>
              <Button type="button" variant="outline" className="h-9 px-3" onClick={() => void load()}>
                更新
              </Button>
            </div>
            {items.length === 0 && (
              <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                確認待ちの提案はありません。
              </p>
            )}
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  {referenceOf(item)} ・ {item.kind === "gloss" ? "原文の下の短い訳" : "辞書の説明"} ・{" "}
                  {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">{item.userName || "利用者"}</span>
                  <span className="text-muted-foreground">
                    {item.action === "confirm" ? " さんが「この訳で正しい」と確認しました" : " さんの修正提案"}
                  </span>
                </p>
                <div className="mt-2 grid gap-1 text-sm sm:grid-cols-[6em_1fr]">
                  <span className="text-muted-foreground">現在</span>
                  <span>{describe(item.currentValue)}</span>
                  {item.action === "edit" && (
                    <>
                      <span className="text-muted-foreground">修正案</span>
                      <span>{describe(item.proposedValue)}</span>
                    </>
                  )}
                </div>
                {item.action === "edit" && item.proposedValue && "detailJa" in item.proposedValue && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-muted-foreground">説明の修正案を読む</summary>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{item.proposedValue.detailJa}</p>
                  </details>
                )}
                {item.comment && (
                  <p className="mt-2 rounded-md bg-muted/50 p-2 text-sm leading-relaxed">理由: {item.comment}</p>
                )}
                <input
                  className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="確認者のメモ（任意。却下の理由など）"
                  value={notes[item.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" className="h-10 px-4" disabled={busyId === item.id} onClick={() => void decide(item.id, "approve")}>
                    承認する
                  </Button>
                  <Button type="button" variant="outline" className="h-10 px-4" disabled={busyId === item.id} onClick={() => void decide(item.id, "reject")}>
                    却下する
                  </Button>
                </div>
              </article>
            ))}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">読み込み中…</p>
        )}

        {role === "admin" && <ReviewerAdmin />}
      </main>
    </div>
  );
}

/** 管理者向け：確認者の指名と解除 */
function ReviewerAdmin() {
  const [list, setList] = useState<Reviewer[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/lexicon-reviewers");
    if (res.ok) setList((await res.json()) as Reviewer[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add() {
    setMessage(null);
    const res = await fetch("/api/lexicon-reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName, note }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage({ ok: false, text: data.error ?? "追加できませんでした。" });
      return;
    }
    setMessage({ ok: true, text: `${email} を確認者に指名しました。` });
    setEmail("");
    setDisplayName("");
    setNote("");
    await load();
  }

  async function remove(target: string) {
    if (!window.confirm(`${target} の確認者の指名を外しますか？（これまでの承認記録は残ります）`)) return;
    await fetch(`/api/lexicon-reviewers?email=${encodeURIComponent(target)}`, { method: "DELETE" });
    await load();
  }

  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  return (
    <section className="space-y-3 border-t border-border pt-8">
      <h2 className="text-lg font-semibold">確認者の管理（管理者のみ）</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">
        確認者は、提案の承認・却下と、訳を直接「確認済み」にすることができます。本人が Google でログインするときのメールアドレスを登録してください。
      </p>
      <div className="grid gap-2 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <input className={field} placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} placeholder="表示名（例：山田牧師）" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <input className={`${field} sm:col-span-2`} placeholder="メモ（例：〇〇神学校 旧約専攻）" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="sm:col-span-2">
          <Button type="button" className="h-10 px-4" disabled={!email.trim()} onClick={() => void add()}>
            確認者に指名する
          </Button>
        </div>
        {message && (
          <p className={`text-sm sm:col-span-2 ${message.ok ? "text-[var(--review-ok)]" : "text-destructive"}`}>{message.text}</p>
        )}
      </div>
      <ul className="space-y-2">
        {list.length === 0 && <li className="text-sm text-muted-foreground">まだ確認者はいません。</li>}
        {list.map((r) => (
          <li key={r.email} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{r.displayName || r.email}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.email}{r.note ? ` ・ ${r.note}` : ""} ・ 確認 {r.reviewCount} 件
              </p>
            </div>
            <Button type="button" variant="outline" className="h-9 px-3" onClick={() => void remove(r.email)}>
              指名を外す
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
