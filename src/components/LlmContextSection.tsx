"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContextApiRequest } from "@/lib/context-llm";
import {
  clearLlmApiKey,
  getLlmApiKey,
  hasLlmApiKey,
  isLikelyOpenAiKey,
  saveLlmApiKey,
} from "@/lib/llm-settings";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const OPENAI_API_KEYS_URL = "https://platform.openai.com/api-keys";

type Props = {
  contextRequest: ContextApiRequest | null;
  open: boolean;
  onClose: () => void;
};

const cache = new Map<string, string>();

export function LlmContextSection({ contextRequest, open, onClose }: Props) {
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [supplement, setSupplement] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    const isConfigured = hasLlmApiKey();
    setConfigured(isConfigured);
    if (!isConfigured) setEditing(true);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const fetchSupplement = useCallback(async (request: ContextApiRequest) => {
    const apiKey = getLlmApiKey();
    if (!apiKey) return;

    const cached = cache.get(request.word.id);
    if (cached) {
      setSupplement(cached);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setSupplement(null);

    try {
      const response = await fetch("/api/context", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data = (await response.json()) as {
        content?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "文脈補足の取得に失敗しました。");
      }

      const content = data.content ?? "";
      cache.set(request.word.id, content);
      setSupplement(content);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "文脈補足の取得に失敗しました。",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !configured || !contextRequest) {
      setSupplement(null);
      setLoading(false);
      return;
    }
    void fetchSupplement(contextRequest);
    return () => abortRef.current?.abort();
  }, [open, configured, contextRequest, fetchSupplement]);

  function handleSave() {
    setError(null);
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("APIキーを入力してください。");
      return;
    }
    if (!isLikelyOpenAiKey(trimmed)) {
      setError("OpenAI の API キーは通常「sk-」で始まります。");
      return;
    }
    saveLlmApiKey(trimmed);
    setDraft("");
    setEditing(false);
    refresh();
    if (contextRequest) void fetchSupplement(contextRequest);
  }

  function handleClear() {
    clearLlmApiKey();
    setDraft("");
    setEditing(true);
    setError(null);
    setSupplement(null);
    refresh();
  }

  function handleRetry() {
    if (contextRequest) {
      cache.delete(contextRequest.word.id);
      void fetchSupplement(contextRequest);
    }
  }

  if (!open) return null;

  return (
    <section className="rounded-lg border border-dashed border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 flex-nowrap min-w-0">
        <h3 className="shrink-0 text-xs font-bold uppercase tracking-wide text-[var(--grammar)]">
          文脈補足（LLM）
        </h3>
        <Badge
          variant={configured ? "default" : "secondary"}
          className={
            configured
              ? "shrink-0 bg-accent/50 font-medium text-[var(--grammar)] hover:bg-accent/50"
              : "shrink-0 bg-muted text-muted-foreground hover:bg-muted"
          }
        >
          {configured ? "設定済み" : "未設定"}
        </Badge>
        {!configured && (
          <a
            href={OPENAI_API_KEYS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "xs" }),
              "shrink-0",
            )}
          >
            キーを取得
          </a>
        )}
        {configured && !editing && (
          <>
            <button
              type="button"
              className="shrink-0 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              onClick={() => {
                setEditing(true);
                setDraft("");
                setError(null);
              }}
            >
              キーを変更
            </button>
            <span className="shrink-0 text-[11px] text-border">·</span>
            <button
              type="button"
              className="shrink-0 text-[11px] text-red-500 underline-offset-2 hover:text-red-700 hover:underline"
              onClick={handleClear}
            >
              キーを削除
            </button>
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="閉じる"
        >
          <X />
        </Button>
      </div>

      {(!configured || editing) && (
        <div className="mt-3 space-y-2">
          <Label htmlFor="llm-api-key" className="text-xs text-foreground">
            OpenAI API キー
          </Label>
          <Input
            id="llm-api-key"
            type="password"
            autoComplete="off"
            placeholder="sk-..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleSave}>
              保存
            </Button>
            {configured && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setDraft("");
                  setError(null);
                }}
              >
                キャンセル
              </Button>
            )}
          </div>
          {!configured && (
            <p className="text-xs text-muted-foreground">
              APIキーを設定すると、この節での用法を LLM で補足表示します。
            </p>
          )}
        </div>
      )}

      {error && (!configured || editing) && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {configured && !editing && contextRequest && (
        <div className="mt-3">
          {loading && (
            <p className="text-sm text-muted-foreground">文脈補足を生成中…</p>
          )}
          {!loading && supplement && (
            <p className="text-sm leading-relaxed text-foreground">{supplement}</p>
          )}
          {!loading && !supplement && !error && (
            <p className="text-sm text-muted-foreground">補足を読み込んでいます…</p>
          )}
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
              >
                再試行
              </Button>
            </div>
          )}
        </div>
      )}

      {configured && !editing && !contextRequest && (
        <p className="mt-3 text-sm text-muted-foreground">
          原文ペインで単語をクリックすると、文脈補足を生成します。
        </p>
      )}
    </section>
  );
}
