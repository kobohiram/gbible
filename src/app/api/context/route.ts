import {
  buildContextSystemPrompt,
  type ChatMessage,
  type ContextApiRequest,
} from "@/lib/context-llm";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

type LlmProvider = "openai" | "anthropic";

function hasServerLlmKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.ANTHROPIC_API_KEY?.trim(),
  );
}

function resolveLlmConfig(userBearer: string): { provider: LlmProvider; apiKey: string } | null {
  const userKey = userBearer.trim();
  if (userKey) return { provider: "openai", apiKey: userKey };

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) return { provider: "openai", apiKey: openaiKey };

  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) return { provider: "anthropic", apiKey: anthropicKey };

  return null;
}

export async function GET() {
  return Response.json({ serverKeyAvailable: hasServerLlmKey() });
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const userBearer = auth?.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : "";

  const llm = resolveLlmConfig(userBearer);
  if (!llm) {
    return Response.json(
      { error: "APIキーが必要です。サーバー設定がない場合は OpenAI API キーを設定してください。" },
      { status: 401 },
    );
  }

  let payload: ContextApiRequest;
  try {
    payload = (await request.json()) as ContextApiRequest;
  } catch {
    return Response.json({ error: "リクエストが不正です。" }, { status: 400 });
  }

  if (!payload.reference) {
    return Response.json({ error: "節の情報が不足しています。" }, { status: 400 });
  }

  const history: ChatMessage[] = payload.messages ?? [];
  if (history.length === 0) {
    return Response.json({ error: "メッセージが必要です。" }, { status: 400 });
  }

  const systemPrompt = buildContextSystemPrompt(payload);
  const maxTokens = history.length === 1 ? 280 : 400;

  try {
    const content =
      llm.provider === "openai"
        ? await callOpenAi(llm.apiKey, systemPrompt, history, maxTokens)
        : await callAnthropic(llm.apiKey, systemPrompt, history, maxTokens);

    if (!content) {
      return Response.json(
        { error: "LLM から応答を取得できませんでした。" },
        { status: 502 },
      );
    }

    return Response.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "応答の取得に失敗しました。";
    return Response.json({ error: message }, { status: 502 });
  }
}

async function callOpenAi(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map((msg) => ({ role: msg.role, content: msg.content })),
  ];

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401) {
      throw new Error("APIキーが無効です。OpenAI のキーを確認してください。");
    }
    throw new Error(`OpenAI API エラー (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  maxTokens: number,
): Promise<string> {
  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: history.map((msg) => ({ role: msg.role, content: msg.content })),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Anthropic API エラー (${response.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as { content?: { text: string }[] };
  return data.content?.[0]?.text?.trim() ?? "";
}
