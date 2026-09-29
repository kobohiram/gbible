"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  REVIEW_LIMITS,
  decisionKey,
  type GlossValue,
  type LexiconValue,
  type ReviewKind,
  type ReviewSuggestion,
  type ReviewValue,
  type VerseReviewState,
} from "@/lib/lexicon-review";
import type { AiReviewInfo, LexiconEntry, VerseWord } from "@/types";

type Props = {
  bookId: string;
  word: VerseWord;
  entry: LexiconEntry | null;
  state: VerseReviewState;
  onChanged: () => void;
};

/** 3ペイン下部：みんなで作る辞書（文脈訳と辞書の確認・修正提案） */
export function CommunityReview({ bookId, word, entry, state, onChanged }: Props) {
  const verseKey = word.id.split("-").slice(-3, -1).join(":");
  const glossValue: GlossValue = { gloss: word.ctxGloss ?? "" };
  const lexValue: LexiconValue | null = entry?.detailJa
    ? { glossJa: entry.glossJa ?? "", definitionJa: entry.definitionJa, detailJa: entry.detailJa }
    : null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="section-label">みんなで作る辞書</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          この訳と辞書は AI が下書きしました。ヘブル語が分かる方に確かめていただき、確認者が承認したものから「確認済み」になります。
        </p>
        {(state.role === "reviewer" || state.role === "admin") && (
          <a href="/review" className="mt-1 inline-block text-xs font-semibold text-primary underline-offset-2 hover:underline">
            確認待ちの提案をまとめて見る →
          </a>
        )}
      </div>

      {word.ctxGloss && (
        <ReviewCard
          title="この語の訳（原文の下に出る短い訳）"
          kind="gloss"
          targetId={word.id}
          bookId={bookId}
          verseKey={verseKey}
          value={glossValue}
          review={word.review}
          state={state}
          onChanged={onChanged}
        />
      )}
      {lexValue && entry && (
        <ReviewCard
          title="辞書の説明"
          kind="lexicon"
          targetId={entry.strongs}
          bookId={bookId}
          verseKey={null}
          value={lexValue}
          review={entry.review}
          state={state}
          onChanged={onChanged}
        />
      )}
      {state.role === "guest" && (
        <div className="rounded-lg border border-dashed border-border p-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            ヘブル語が分かる方は、ログインすると「この訳で正しい」の確認や、修正の提案ができます。
          </p>
          <Button type="button" className="mt-2 h-10 px-4" onClick={() => signIn("google")}>
            Googleでログインして協力する
          </Button>
        </div>
      )}
    </section>
  );
}

type CardProps = {
  title: string;
  kind: ReviewKind;
  targetId: string;
  bookId: string;
  verseKey: string | null;
  value: ReviewValue;
  review?: AiReviewInfo;
  state: VerseReviewState;
  onChanged: () => void;
};

function StatusBadge({ status, reviewerName }: { status: AiReviewInfo["status"]; reviewerName?: string }) {
  if (status === "checked") {
    return (
      <span className="rounded-full bg-[var(--review-ok-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--review-ok)]">
        確認済み{reviewerName ? `（${reviewerName}）` : ""}
      </span>
    );
  }
  if (status === "legacy") {
    return (
      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
        旧版（作り直し予定）
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--variant-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--variant)] ring-1 ring-[var(--variant-border)]">
      AI下書き
    </span>
  );
}

function ReviewCard({ title, kind, targetId, bookId, verseKey, value, review, state, onChanged }: CardProps) {
  const key = decisionKey(kind, targetId);
  const decision = state.decisions[key];
  const pending = state.pending[key] ?? [];
  const status = decision ? "checked" : (review?.status ?? "ai");
  const isReviewer = state.role === "reviewer" || state.role === "admin";

  const [mode, setMode] = useState<"idle" | "edit">("idle");
  const [draft, setDraft] = useState<ReviewValue>(value);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function startEdit(initial?: ReviewValue) {
    setDraft(initial ?? value);
    setComment("");
    setMessage(null);
    setMode("edit");
  }

  async function submit(action: "confirm" | "edit") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/lexicon-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId, kind, targetId, verseKey, action,
          currentValue: value,
          proposedValue: action === "edit" ? draft : undefined,
          comment,
        }),
      });
      const data = (await res.json()) as { applied?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "送信できませんでした。");
      setMode("idle");
      setMessage({
        ok: true,
        text: data.applied
          ? "確定しました。"
          : "ありがとうございます。提案を送りました。確認者が確認します。",
      });
      onChanged();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "送信できませんでした。" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <StatusBadge status={status} reviewerName={decision?.reviewerName} />
      </div>

      {status === "ai" && review?.aiNote && (
        <div className="mt-2 rounded-md bg-[var(--variant-bg)] p-2 text-sm leading-relaxed">
          <p className="text-[var(--variant)]">AI の点検で指摘があります: {review.aiNote}</p>
          {review.aiSuggestion && (
            <p className="mt-1 text-xs text-muted-foreground">AI の修正案: {review.aiSuggestion}</p>
          )}
        </div>
      )}

      {pending.length > 0 && (
        <PendingList items={pending} isReviewer={isReviewer} onChanged={onChanged} />
      )}

      {mode === "edit" ? (
        <EditForm
          kind={kind}
          draft={draft}
          setDraft={setDraft}
          comment={comment}
          setComment={setComment}
          aiSuggestion={kind === "gloss" ? review?.aiSuggestion : undefined}
          busy={busy}
          submitLabel={isReviewer ? "修正して確定する" : "修正を提案する"}
          onSubmit={() => void submit("edit")}
          onCancel={() => setMode("idle")}
        />
      ) : status === "legacy" ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          この説明は旧版で、AI で作り直す予定です。作り直した後に確認をお願いします。
        </p>
      ) : state.role === "guest" ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          {status !== "checked" && (
            <Button type="button" className="h-10 px-4" disabled={busy} onClick={() => void submit("confirm")}>
              {isReviewer ? "確認済みにする" : "この訳で正しい"}
            </Button>
          )}
          <Button type="button" variant="outline" className="h-10 px-4" disabled={busy} onClick={() => startEdit()}>
            {isReviewer ? "修正して確定" : "修正を提案する"}
          </Button>
        </div>
      )}

      {message && (
        <p className={`mt-2 text-sm ${message.ok ? "text-[var(--review-ok)]" : "text-destructive"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

function EditForm({
  kind, draft, setDraft, comment, setComment, aiSuggestion, busy, submitLabel, onSubmit, onCancel,
}: {
  kind: ReviewKind;
  draft: ReviewValue;
  setDraft: (v: ReviewValue) => void;
  comment: string;
  setComment: (v: string) => void;
  aiSuggestion?: string;
  busy: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground";
  const label = "text-xs font-semibold text-muted-foreground";
  const counter = (s: string, max: number) => (
    <span className={[...s].length > max ? "text-destructive" : ""}>{[...s].length}/{max}</span>
  );

  return (
    <div className="mt-3 space-y-3 rounded-md border border-border bg-background/60 p-3">
      {kind === "gloss" && "gloss" in draft ? (
        <label className="block space-y-1">
          <span className={`${label} flex justify-between`}>
            訳（10文字以内） {counter(draft.gloss, REVIEW_LIMITS.gloss)}
          </span>
          <input className={field} value={draft.gloss} onChange={(e) => setDraft({ gloss: e.target.value })} />
          {aiSuggestion && [...aiSuggestion].length <= REVIEW_LIMITS.gloss && (
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => setDraft({ gloss: aiSuggestion })}
            >
              AI の修正案「{aiSuggestion}」を入れる
            </button>
          )}
        </label>
      ) : "detailJa" in draft ? (
        <>
          <label className="block space-y-1">
            <span className={`${label} flex justify-between`}>
              代表訳（8文字以内） {counter(draft.glossJa, REVIEW_LIMITS.glossJa)}
            </span>
            <input className={field} value={draft.glossJa} onChange={(e) => setDraft({ ...draft, glossJa: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className={`${label} flex justify-between`}>
              中心的な意味（15文字以内） {counter(draft.definitionJa, REVIEW_LIMITS.definitionJa)}
            </span>
            <input className={field} value={draft.definitionJa} onChange={(e) => setDraft({ ...draft, definitionJa: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className={`${label} flex justify-between`}>
              説明 {counter(draft.detailJa, REVIEW_LIMITS.detailJa)}
            </span>
            <textarea
              className={`${field} min-h-40 leading-relaxed`}
              value={draft.detailJa}
              onChange={(e) => setDraft({ ...draft, detailJa: e.target.value })}
            />
          </label>
        </>
      ) : null}

      <label className="block space-y-1">
        <span className={label}>理由・根拠（任意。確認者が判断しやすくなります）</span>
        <textarea
          className={`${field} min-h-16`}
          value={comment}
          maxLength={REVIEW_LIMITS.comment}
          placeholder="例：前置詞 ב は手段を表すので「油で」が正確です（BDB 88）"
          onChange={(e) => setComment(e.target.value)}
        />
      </label>

      <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
        <li>新改訳などの日本語訳聖書の本文は、そのまま貼り付けないでください（著作権のため）。</li>
        <li>送った内容は Gbible の辞書として CC BY 4.0 で公開され、改良されることがあります。</li>
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="h-10 px-4" disabled={busy} onClick={onSubmit}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" className="h-10 px-4" disabled={busy} onClick={onCancel}>
          やめる
        </Button>
      </div>
    </div>
  );
}

function describeValue(v: ReviewValue | null): string {
  if (!v) return "";
  if ("gloss" in v) return v.gloss;
  return `${v.glossJa}／${v.definitionJa}`;
}

function PendingList({
  items, isReviewer, onChanged,
}: {
  items: ReviewSuggestion[];
  isReviewer: boolean;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: number, method: "PATCH" | "DELETE", decision?: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/lexicon-review/${id}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PATCH" ? JSON.stringify({ decision }) : undefined,
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "処理できませんでした。");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理できませんでした。");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">確認待ちの提案（{items.length}件）</p>
      {items.map((s) => (
        <div key={s.id} className="rounded-md border border-border p-2 text-sm">
          <p>
            <span className="font-semibold">{s.userName || "利用者"}</span>
            <span className="text-muted-foreground">
              {s.action === "confirm" ? " さん：この訳で正しい" : " さんの修正案："}
            </span>
            {s.action === "edit" && <span className="font-medium text-[var(--gloss)]">{describeValue(s.proposedValue)}</span>}
          </p>
          {s.action === "edit" && s.proposedValue && "detailJa" in s.proposedValue && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-muted-foreground">説明の修正案を見る</summary>
              <p className="mt-1 whitespace-pre-line text-xs leading-relaxed">{s.proposedValue.detailJa}</p>
            </details>
          )}
          {s.comment && <p className="mt-1 text-xs text-muted-foreground">理由: {s.comment}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {isReviewer && (
              <>
                <Button type="button" size="sm" className="h-9 px-3" disabled={busyId === s.id} onClick={() => void act(s.id, "PATCH", "approve")}>
                  承認する
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-9 px-3" disabled={busyId === s.id} onClick={() => void act(s.id, "PATCH", "reject")}>
                  却下する
                </Button>
              </>
            )}
            {s.isMine && (
              <Button type="button" size="sm" variant="ghost" className="h-9 px-3" disabled={busyId === s.id} onClick={() => void act(s.id, "DELETE")}>
                取り下げる
              </Button>
            )}
          </div>
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
