import {
  buildContextSystemPrompt,
  type ChatMessage,
  type ContextApiRequest,
} from "@/lib/context-llm";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const apiKey = auth?.startsWith("Bearer ")
    ? auth.slice("Bearer ".length).trim()
    : "";

  if (!apiKey) {
    return Response.json({ error: "APIキーが必要です。" }, { status: 401 });
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

  const openAiMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: buildContextSystemPrompt(payload) },
  ];

  for (const msg of history) {
    openAiMessages.push({ role: msg.role, content: msg.content });
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: openAiMessages,
        max_tokens: history.length === 1 ? 280 : 400,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      if (response.status === 401) {
        return Response.json(
          { error: "APIキーが無効です。OpenAI のキーを確認してください。" },
          { status: 401 },
        );
      }
      return Response.json(
        { error: `OpenAI API エラー (${response.status}): ${detail.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      return Response.json(
        { error: "LLM から応答を取得できませんでした。" },
        { status: 502 },
      );
    }

    return Response.json({ content });
  } catch {
    return Response.json(
      { error: "OpenAI への接続に失敗しました。" },
      { status: 502 },
    );
  }
}
