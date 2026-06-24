"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import type { ChatMessage, ContextApiRequest } from "@/lib/context-llm";
import type { BibleLocation } from "@/lib/bible-reference";
import type { BookId } from "@/types";
import {
  clearLlmApiKey,
  getLlmApiKey,
  hasLlmApiKey,
  isLikelyOpenAiKey,
  saveLlmApiKey,
} from "@/lib/llm-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GrammarNoteContent } from "./GrammarNoteContent";
import { Send, ChevronDown } from "lucide-react";

const OPENAI_API_KEYS_URL = "https://platform.openai.com/api-keys";
const COLLAPSED_KEY = "gbible-grammar-collapsed";

type Props = {
  contextRequest: ContextApiRequest;
  reference: string;
  stacked?: boolean;
  embedded?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  contextBookId?: BookId;
  onNavigateToVerse?: (location: BibleLocation) => void;
};

type ChatDisplayItem =
  | { kind: "divider"; label: string }
  | { kind: "chat"; message: ChatMessage };

function chatSessionKey(request: ContextApiRequest): string {
  if (request.word) {
    return `word:${request.word.id}:${request.reference}`;
  }
  return `general:${request.reference}`;
}

function contextDividerLabel(request: ContextApiRequest, reference: string): string {
  if (request.word?.greek) {
    return `${reference}（${request.word.greek}）`;
  }
  return reference;
}

function chatHistoryFromDisplay(items: ChatDisplayItem[]): ChatMessage[] {
  return items
    .filter((item): item is { kind: "chat"; message: ChatMessage } => item.kind === "chat")
    .map((item) => item.message);
}

export function loadGrammarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function PaneGrammarPoint({
  contextRequest,
  reference,
  stacked,
  embedded,
  collapsed = false,
  onCollapsedChange,
  contextBookId,
  onNavigateToVerse,
}: Props) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";

  const sessionKey = useMemo(() => chatSessionKey(contextRequest), [contextRequest]);
  const dividerLabel = useMemo(
    () => contextDividerLabel(contextRequest, reference),
    [contextRequest, reference],
  );

  const [serverKeyAvailable, setServerKeyAvailable] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [editingKey, setEditingKey] = useState(false);
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);

  const [displayItems, setDisplayItems] = useState<ChatDisplayItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSessionKeyRef = useRef<string | null>(null);

  const refreshKeyState = useCallback((serverAvailable: boolean) => {
    const hasUserKey = hasLlmApiKey();
    const ready = hasUserKey || serverAvailable;
    setConfigured(ready);
    if (!hasUserKey && !serverAvailable) {
      setEditingKey(true);
      setUseOwnKey(true);
    }
  }, []);

  useEffect(() => {
    fetch("/api/context")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { serverKeyAvailable?: boolean } | null) => {
        const available = Boolean(data?.serverKeyAvailable);
        setServerKeyAvailable(available);
        refreshKeyState(available);
      })
      .catch(() => refreshKeyState(false));
  }, [refreshKeyState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [displayItems, loading]);

  useEffect(() => {
    if (!isLoggedIn || !configured) {
      setDisplayItems([]);
      setChatError(null);
      setLoading(false);
      lastSessionKeyRef.current = null;
      abortRef.current?.abort();
      return;
    }

    const prevKey = lastSessionKeyRef.current;
    if (prevKey !== null && prevKey !== sessionKey) {
      setDisplayItems((prev) => {
        const hasChat = prev.some((item) => item.kind === "chat");
        if (!hasChat) return prev;
        const last = prev[prev.length - 1];
        if (last?.kind === "divider" && last.label === dividerLabel) return prev;
        return [...prev, { kind: "divider", label: dividerLabel }];
      });
    }
    lastSessionKeyRef.current = sessionKey;
  }, [isLoggedIn, configured, sessionKey, dividerLabel]);

  const callChat = useCallback(
    async (request: ContextApiRequest, history: ChatMessage[], signal: AbortSignal) => {
      const apiKey = getLlmApiKey();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

      const response = await fetch("/api/context", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...request, messages: history }),
        signal,
      });

      const data = (await response.json()) as { content?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "応答の取得に失敗しました。");
      }
      return data.content?.trim() ?? "";
    },
    [],
  );

  async function sendMessages(history: ChatMessage[]) {
    setChatError(null);
    setLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const content = await callChat(contextRequest, history, controller.signal);
      setDisplayItems((prev) => [...prev, { kind: "chat", message: { role: "assistant", content } }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setChatError(err instanceof Error ? err.message : "送信に失敗しました。");
      setDisplayItems((prev) => {
        const items = [...prev];
        const last = items[items.length - 1];
        if (last?.kind === "chat" && last.message.role === "user") {
          items.pop();
        }
        return items;
      });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextHistory = [...chatHistoryFromDisplay(displayItems), userMessage];
    setDisplayItems((prev) => [...prev, { kind: "chat", message: userMessage }]);
    setInput("");
    await sendMessages(nextHistory);
  }

  function handleSaveKey() {
    setKeyError(null);
    const trimmed = draftKey.trim();
    if (!trimmed) {
      setKeyError("APIキーを入力してください。");
      return;
    }
    if (!isLikelyOpenAiKey(trimmed)) {
      setKeyError("OpenAI の API キーは通常「sk-」で始まります。");
      return;
    }
    saveLlmApiKey(trimmed);
    setDraftKey("");
    setEditingKey(false);
    setUseOwnKey(true);
    refreshKeyState(serverKeyAvailable);
  }

  function handleClearKey() {
    clearLlmApiKey();
    setDraftKey("");
    setKeyError(null);
    if (serverKeyAvailable) {
      setEditingKey(false);
      setUseOwnKey(false);
    } else {
      setEditingKey(true);
      setUseOwnKey(true);
    }
    refreshKeyState(serverKeyAvailable);
  }

  const showKeyForm = useOwnKey && (editingKey || (!hasLlmApiKey() && !serverKeyAvailable));
  const hasUserKey = hasLlmApiKey();
  const hasChat = displayItems.some((item) => item.kind === "chat");

  const chatAreaClassName = embedded
    ? "mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3"
    : stacked
      ? "mb-3 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3"
      : "mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3";

  const idleHint = (
    <p className="text-sm leading-relaxed text-muted-foreground">
      使い方などご質問をどうぞ。
    </p>
  );

  const loggedOutHint = (
    <div className="mr-2 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed text-foreground">
      <span className="mb-1 block text-[10px] font-semibold text-[var(--grammar)]">Gbible bot</span>
      <p className="text-sm leading-relaxed text-muted-foreground">
        ログインするとチャットボットが利用できます。
      </p>
      <button
        type="button"
        onClick={() => signIn("google")}
        className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Googleでログイン
      </button>
    </div>
  );

  return (
    <div className={embedded && !collapsed ? "flex h-full min-h-0 flex-col" : "flex shrink-0 flex-col"}>
      <header className="pane-header shrink-0 px-4 py-3">
        <button
          type="button"
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={!collapsed}
        >
          <div className="min-w-0 flex-1 truncate">
            <h2 className="truncate text-sm leading-tight">
              <span className="pane-header-label normal-case">Gbible bot</span>
              <span className="font-semibold text-foreground">　{reference}</span>
            </h2>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
            aria-hidden
          />
        </button>
      </header>

      {!collapsed && (
      <div className={embedded ? "flex min-h-0 flex-1 flex-col p-4" : stacked ? "flex flex-col p-4" : "flex min-h-0 flex-1 flex-col p-4"}>
        {isLoggedIn && showKeyForm && (
              <div className="mb-3 shrink-0 space-y-2 rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="grammar-api-key" className="text-xs font-semibold">
                    OpenAI API キー
                  </Label>
                  <a
                    href={OPENAI_API_KEYS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-primary underline-offset-2 hover:underline"
                  >
                    キーを取得
                  </a>
                </div>
                <Input
                  id="grammar-api-key"
                  type="password"
                  autoComplete="off"
                  placeholder="sk-..."
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={handleSaveKey}>
                    保存
                  </Button>
                  {hasUserKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingKey(false);
                        setDraftKey("");
                        setKeyError(null);
                      }}
                    >
                      キャンセル
                    </Button>
                  )}
                </div>
                {keyError && <p className="text-xs text-red-600">{keyError}</p>}
                <p className="text-[11px] text-muted-foreground">
                  キーはブラウザにのみ保存されます（gpt-4o-mini を使用）。
                </p>
              </div>
            )}

            {isLoggedIn && configured && !showKeyForm && serverKeyAvailable && !hasUserKey && (
              <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <button
                  type="button"
                  className="underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => {
                    setUseOwnKey(true);
                    setEditingKey(true);
                  }}
                >
                  独自のキーを使う
                </button>
              </div>
            )}

            <div ref={scrollRef} className={chatAreaClassName}>
              {!isLoggedIn ? (
                loggedOutHint
              ) : (
                <>
                  {!hasChat && idleHint}
                  {displayItems.map((item, i) => {
                    if (item.kind === "divider") {
                      return (
                        <div
                          key={`divider-${i}`}
                          className="flex items-center gap-2 py-1 text-[11px] text-muted-foreground"
                          aria-label={`${item.label} へ移動`}
                        >
                          <span className="h-px flex-1 bg-border" aria-hidden />
                          <span className="shrink-0 font-medium">{item.label}</span>
                          <span className="h-px flex-1 bg-border" aria-hidden />
                        </div>
                      );
                    }

                    const msg = item.message;
                    return (
                      <div
                        key={`chat-${i}`}
                        className={
                          msg.role === "user"
                            ? "ml-6 rounded-lg bg-primary/10 px-3 py-2 text-sm leading-relaxed text-foreground"
                            : "mr-2 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-relaxed text-foreground"
                        }
                      >
                        {msg.role === "user" && (
                          <span className="mb-1 block text-[10px] font-semibold text-primary">あなた</span>
                        )}
                        {msg.role === "assistant" && (
                          <span className="mb-1 block text-[10px] font-semibold text-[var(--grammar)]">Gbible bot</span>
                        )}
                        {msg.role === "assistant" ? (
                          <GrammarNoteContent
                            content={msg.content}
                            contextBookId={contextBookId}
                            onNavigateToVerse={onNavigateToVerse}
                          />
                        ) : (
                          msg.content
                        )}
                      </div>
                    );
                  })}
                  {loading && (
                    <p className="text-sm text-muted-foreground">考え中…</p>
                  )}
                </>
              )}
            </div>

            {isLoggedIn && chatError && (
              <p className="mb-2 shrink-0 text-sm text-red-600">{chatError}</p>
            )}

            <form
              className="flex shrink-0 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!isLoggedIn) {
                  void signIn("google");
                  return;
                }
                void handleSend();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={!isLoggedIn || !configured || loading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!isLoggedIn || !configured || loading || !input.trim()}
                aria-label="送信"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
      </div>
      )}
    </div>
  );
}
