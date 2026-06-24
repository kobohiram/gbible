"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { WORD_NUANCE_REQUEST, type ChatMessage, type ContextApiRequest } from "@/lib/context-llm";
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

type Props = {
  contextRequest: ContextApiRequest;
  reference: string;
  stacked?: boolean;
  embedded?: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
};

function chatSessionKey(request: ContextApiRequest): string {
  if (request.word) {
    return `word:${request.word.id}:${request.reference}`;
  }
  return `general:${request.reference}`;
}

export function PaneContext({
  contextRequest,
  reference,
  stacked,
  embedded,
  collapsed = false,
  onCollapsedChange,
}: Props) {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const hasWord = Boolean(contextRequest.word);

  const sessionKey = useMemo(() => chatSessionKey(contextRequest), [contextRequest]);

  const [configured, setConfigured] = useState(false);
  const [editingKey, setEditingKey] = useState(false);
  const [draftKey, setDraftKey] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeKeyRef = useRef<string | null>(null);

  const refreshKeyState = useCallback(() => {
    const ok = hasLlmApiKey();
    setConfigured(ok);
    if (!ok) setEditingKey(true);
  }, []);

  useEffect(() => {
    refreshKeyState();
  }, [refreshKeyState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!isLoggedIn || !configured) {
      setMessages([]);
      setChatError(null);
      setLoading(false);
      activeKeyRef.current = null;
      return;
    }

    activeKeyRef.current = sessionKey;
    setMessages([]);
    setChatError(null);
    setInput("");
    abortRef.current?.abort();
    setLoading(false);
  }, [isLoggedIn, configured, sessionKey]);

  const callChat = useCallback(
    async (request: ContextApiRequest, history: ChatMessage[], signal: AbortSignal) => {
      const apiKey = getLlmApiKey();
      if (!apiKey) throw new Error("APIキーを設定してください。");

      const response = await fetch("/api/context", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
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
    const key = sessionKey;

    try {
      const content = await callChat(contextRequest, history, controller.signal);
      if (activeKeyRef.current !== key) return;
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (activeKeyRef.current !== key) return;
      setChatError(err instanceof Error ? err.message : "送信に失敗しました。");
      setMessages(history.slice(0, -1));
    } finally {
      if (activeKeyRef.current === key && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setInput("");
    await sendMessages(nextHistory);
  }

  async function handleGenerateNuances() {
    if (!hasWord || loading) return;

    const userMessage: ChatMessage = { role: "user", content: WORD_NUANCE_REQUEST };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
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
    refreshKeyState();
  }

  function handleClearKey() {
    clearLlmApiKey();
    setDraftKey("");
    setEditingKey(true);
    setKeyError(null);
    refreshKeyState();
  }

  const idleHint = hasWord ? (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">{contextRequest.word!.greek}</span>
        {contextRequest.word!.glossJa && (
          <span className="text-muted-foreground"> — {contextRequest.word!.glossJa}</span>
        )}
      </p>
      <p>この語の文法・時制・構文のニュアンスについて、AI に質問できます。</p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!configured || loading}
        onClick={() => void handleGenerateNuances()}
      >
        この語のニュアンスを解説する
      </Button>
      <p className="text-xs">または下の入力欄にご質問をどうぞ。</p>
    </div>
  ) : (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      <p>
        原文の語をクリックすると、その語について文法・ニュアンスを質問できます。
      </p>
      <p>
        Gbible の使い方（画面の見方、メモの保存、API キーの設定など）についても、こちらでお答えします。
      </p>
      <p className="text-xs">ご質問をどうぞ（下の入力欄）。例:「使い方を教えて」「メモの保存方法は？」</p>
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
          <div className="min-w-0">
            <h2 className="pane-header-label">AI 文脈補足</h2>
            {!collapsed && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{reference}</p>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
            aria-hidden
          />
        </button>
      </header>

      {!collapsed && (
      <div className={embedded ? "flex min-h-0 flex-1 flex-col p-4" : stacked ? "flex flex-col p-4" : "flex min-h-0 flex-1 flex-col p-4"}>
        {!isLoggedIn ? (
          <div className="rounded-lg border border-dashed border-border bg-card/80 p-4 text-left">
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              原文の語を選んで文法・構文のニュアンスを質問したり、Gbible の使い方を聞いたりできます。利用には Google ログインと OpenAI API キー（ご自身のもの）が必要です。
            </p>
            <button
              type="button"
              onClick={() => signIn("google")}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              Googleでログイン
            </button>
          </div>
        ) : (
          <>
            {(!configured || editingKey) && (
              <div className="mb-3 shrink-0 space-y-2 rounded-lg border border-border bg-card/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="context-api-key" className="text-xs font-semibold">
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
                  id="context-api-key"
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
                  {configured && (
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

            {configured && !editingKey && (
              <div className="mb-2 flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded bg-accent/40 px-1.5 py-0.5 font-medium">API 設定済み</span>
                <button
                  type="button"
                  className="underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => {
                    setEditingKey(true);
                    setDraftKey("");
                  }}
                >
                  変更
                </button>
                <span>·</span>
                <button
                  type="button"
                  className="text-red-500 underline-offset-2 hover:text-red-700 hover:underline"
                  onClick={handleClearKey}
                >
                  削除
                </button>
              </div>
            )}

            <div
              ref={scrollRef}
              className={
                embedded
                  ? "mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3"
                  : stacked
                    ? "mb-3 max-h-64 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3"
                    : "mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card/40 p-3"
              }
            >
              {messages.length === 0 && idleHint}
              {messages.map((msg, i) => (
                <div
                  key={i}
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
                    <span className="mb-1 block text-[10px] font-semibold text-[var(--grammar)]">AI</span>
                  )}
                  {msg.role === "assistant" ? (
                    <GrammarNoteContent content={msg.content} />
                  ) : (
                    msg.content
                  )}
                </div>
              ))}
              {loading && (
                <p className="text-sm text-muted-foreground">考え中…</p>
              )}
            </div>

            {chatError && (
              <p className="mb-2 shrink-0 text-sm text-red-600">{chatError}</p>
            )}

            <form
              className="flex shrink-0 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={hasWord ? "この語について質問…" : "ご質問をどうぞ…"}
                disabled={!configured || loading}
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!configured || loading || !input.trim()}
                aria-label="送信"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
      )}
    </div>
  );
}
