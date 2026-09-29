import Anthropic from "@anthropic-ai/sdk";
import { buildChatSystem, type ChatMessage, type ContextApiRequest } from "@/lib/context-llm";
import {
  bookIdList,
  coverageSummary,
  findVerses,
  getVerses,
  searchWords,
} from "@/lib/bible-search-server";

/** Gbible bot：道具（Gbible の本文・辞書の検索）を使って答える */

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ROUNDS = 6;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "search_words",
    description:
      "日本語（または英語・原語・Strong's 番号）から、Gbible の辞書にあるヘブル語・ギリシャ語の見出し語を探す。例: 「正義」→ δικαιοσύνη, מִשְׁפָּט。結果には Strong's 番号・短い訳・意味・Gbible 内の出現回数が入る。",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "探す語。日本語なら「正義」「鳥」のような短い語" },
        corpus: { type: "string", enum: ["ot", "nt", "both"], description: "ot=旧約（ヘブル語）, nt=新約（ギリシャ語）" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "find_verses",
    description:
      "指定した Strong's 番号の語が（すべて）出てくる節を、Gbible の本文から探す。1語なら用例一覧、複数語なら一緒に出る節（例: G4071 鳥 と G3772 天 → マタイ6:26）。結果は節の場所と語ごとの訳。",
    input_schema: {
      type: "object",
      properties: {
        strongs: { type: "array", items: { type: "string" }, description: "例: [\"G4071\", \"G3772\"]" },
        books: { type: "array", items: { type: "string" }, description: "書IDで絞り込む（任意）" },
        limit: { type: "integer", description: "最大件数（既定 15、最大 40）" },
      },
      required: ["strongs"],
      additionalProperties: false,
    },
  },
  {
    name: "get_verses",
    description:
      "節の原文と語ごとの訳を取得する（最大10節）。「みんなの聖書」の訳がある節はそれも返す。聖書箇所を答える前に、内容が合っているか確かめるのに使う。",
    input_schema: {
      type: "object",
      properties: {
        book: { type: "string", description: "書ID（例: matthew, isaiah, psalms）" },
        chapter: { type: "integer" },
        verse: { type: "integer", description: "開始節" },
        toVerse: { type: "integer", description: "終わりの節（任意）" },
      },
      required: ["book", "chapter", "verse"],
      additionalProperties: false,
    },
  },
];

async function runTool(origin: string, name: string, input: Record<string, unknown>): Promise<string> {
  try {
    let result: unknown;
    if (name === "search_words") {
      result = await searchWords(origin, String(input.query ?? ""), (input.corpus as "ot" | "nt" | "both") ?? "both");
    } else if (name === "find_verses") {
      result = await findVerses(origin, (input.strongs as string[]) ?? [], {
        books: input.books as string[] | undefined,
        limit: typeof input.limit === "number" ? input.limit : undefined,
      });
    } else if (name === "get_verses") {
      result = await getVerses(
        origin,
        String(input.book ?? ""),
        Number(input.chapter),
        Number(input.verse),
        typeof input.toVerse === "number" ? input.toVerse : undefined,
      );
    } else {
      result = { error: `未知の道具です: ${name}` };
    }
    return JSON.stringify(result);
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : "道具の実行に失敗しました" });
  }
}

export type ChatResult =
  | { ok: true; content: string; toolCalls: { name: string; input: unknown }[] }
  | { ok: false; status: number; error: string };

export async function runChat(opts: {
  payload: ContextApiRequest;
  history: ChatMessage[];
  origin: string;
  apiKey: string;
}): Promise<ChatResult> {
  const { payload, history, origin, apiKey } = opts;
  const { staticPrompt, contextPrompt } = buildChatSystem(payload, {
    coverage: coverageSummary(),
    bookIds: bookIdList(),
  });
  const client = new Anthropic({ apiKey });
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const toolCalls: { name: string; input: unknown }[] = [];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: [
          { type: "text", text: staticPrompt, cache_control: { type: "ephemeral" } },
          { type: "text", text: contextPrompt },
        ],
        // 道具の回数が上限に達したら、道具なしで答えをまとめさせる
        tools: round < MAX_TOOL_ROUNDS ? TOOLS : [],
        messages,
      });

      if (response.stop_reason === "refusal") {
        return { ok: false, status: 422, error: "この質問にはお答えできませんでした。言い方を変えてお試しください。" };
      }

      const toolUses = response.content.filter(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use",
      );
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const text = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();
        if (!text) return { ok: false, status: 502, error: "応答を取得できませんでした。" };
        const truncated = response.stop_reason === "max_tokens";
        return { ok: true, content: truncated ? `${text}\n\n（回答が長くなったため途中で切れています）` : text, toolCalls };
      }

      messages.push({ role: "assistant", content: response.content });
      const results = await Promise.all(
        toolUses.map(async (t) => {
          toolCalls.push({ name: t.name, input: t.input });
          return {
            type: "tool_result" as const,
            tool_use_id: t.id,
            content: await runTool(origin, t.name, (t.input ?? {}) as Record<string, unknown>),
          };
        }),
      );
      messages.push({ role: "user", content: results });
    }
    return { ok: false, status: 502, error: "調べる回数が多くなりすぎました。質問を短くしてお試しください。" };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, status: 429, error: "混み合っています。少し待ってからお試しください。" };
    }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, status: 502, error: `応答の取得に失敗しました（${err.status ?? "通信エラー"}）。` };
    }
    return { ok: false, status: 502, error: "応答の取得に失敗しました。" };
  }
}
