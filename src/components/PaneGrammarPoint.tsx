"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import type { ChatMessage, ContextApiRequest } from "@/lib/context-llm";
import type { BibleLocation } from "@/lib/bible-reference";
import type { BookId } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GrammarNoteContent } from "./GrammarNoteContent";
import { Send, ChevronDown } from "lucide-react";

const COLLAPSED_KEY = "gbible-grammar-collapsed";

/** 最初に表示する質問の例 */
const EXAMPLE_QUESTIONS = [
  "「正義」はヘブル語とギリシャ語で何？",
  "「空の鳥を見なさい」と言っている箇所は？",
  "敬老の日のお祝いに贈る聖書の言葉は？",
  "クリスマスによく読まれるイザヤの言葉は？",
];

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

  const [configured, setConfigured] = useState(false);

  const [displayItems, setDisplayItems] = useState<ChatDisplayItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSessionKeyRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/context")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { serverKeyAvailable?: boolean } | null) => setConfigured(Boolean(data?.serverKeyAvailable)))
      .catch(() => setConfigured(false));
  }, []);

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
      const response = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  async function handleSend(text = input) {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text.trim() };
    const nextHistory = [...chatHistoryFromDisplay(displayItems), userMessage];
    setDisplayItems((prev) => [...prev, { kind: "chat", message: userMessage }]);
    setInput("");
    await sendMessages(nextHistory);
  }

  function handleNewConversation() {
    abortRef.current?.abort();
    setLoading(false);
    setChatError(null);
    setDisplayItems([]);
  }

  const hasChat = displayItems.some((item) => item.kind === "chat");

  const chatAreaClassName = embedded
    ? "mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3"
    : stacked
      ? "mb-3 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3"
      : "mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3";

  const idleHint = (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed text-muted-foreground">
        聖書の言葉・原語・箇所探しなど、何でもどうぞ。Gbible の本文と辞書で確かめながら答えます。
      </p>
      <div className="flex flex-col gap-1.5">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={!configured || loading}
            onClick={() => void handleSend(q)}
            className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-accent/20 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
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
        {isLoggedIn && hasChat && (
          <div className="mb-2 flex shrink-0 justify-end">
            <button
              type="button"
              onClick={handleNewConversation}
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              新しい会話
            </button>
          </div>
        )}
        {isLoggedIn && !configured && (
          <p className="mb-2 shrink-0 text-xs text-muted-foreground">チャットボットは準備中です。</p>
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
                    <p className="text-sm text-muted-foreground">Gbible の本文と辞書を調べています…（数十秒かかることがあります）</p>
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
