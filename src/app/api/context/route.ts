import { type ChatMessage, type ContextApiRequest } from "@/lib/context-llm";
import { runChat } from "@/lib/chat-agent";
import { currentReviewUser, isDbConfigured, reviewDb } from "@/lib/lexicon-review-server";

export const maxDuration = 120;

const MAX_HISTORY = 20;
/** 1人1日あたりの質問数の上限（管理者は無制限）。環境変数 CHAT_DAILY_LIMIT で変更できる */
const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 50);

let usageTableReady: Promise<void> | null = null;

/** 1日の利用回数を数え、上限を超えていれば false を返す */
async function countUsage(email: string): Promise<{ ok: boolean; used: number }> {
  if (!isDbConfigured() || !Number.isFinite(DAILY_LIMIT) || DAILY_LIMIT <= 0) return { ok: true, used: 0 };
  const sql = reviewDb();
  usageTableReady ??= sql`
    CREATE TABLE IF NOT EXISTS chat_usage (
      user_email TEXT NOT NULL,
      day        DATE NOT NULL,
      count      INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_email, day)
    )
  `.then(() => undefined);
  await usageTableReady;
  const rows = await sql`
    INSERT INTO chat_usage (user_email, day, count)
    VALUES (${email}, (NOW() AT TIME ZONE 'Asia/Tokyo')::date, 1)
    ON CONFLICT (user_email, day) DO UPDATE SET count = chat_usage.count + 1
    RETURNING count
  `;
  const used = Number(rows[0]?.count ?? 0);
  return { ok: used <= DAILY_LIMIT, used };
}

export async function GET() {
  return Response.json({ serverKeyAvailable: Boolean(process.env.ANTHROPIC_API_KEY?.trim()) });
}

export async function POST(request: Request) {
  const user = await currentReviewUser();
  if (!user.email) {
    return Response.json({ error: "ログインするとチャットボットが利用できます。" }, { status: 401 });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ error: "チャットボットの設定（API キー）がまだ済んでいません。" }, { status: 503 });
  }

  let payload: ContextApiRequest;
  try {
    payload = (await request.json()) as ContextApiRequest;
  } catch {
    return Response.json({ error: "リクエストが正しくありません。" }, { status: 400 });
  }
  const history: ChatMessage[] = (payload.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY);
  if (!payload.reference || history.length === 0 || history[history.length - 1].role !== "user") {
    return Response.json({ error: "質問が空です。" }, { status: 400 });
  }
  // 会話は user から始める必要がある
  while (history.length && history[0].role !== "user") history.shift();

  if (user.role !== "admin") {
    try {
      const { ok } = await countUsage(user.email);
      if (!ok) {
        return Response.json(
          { error: `今日の質問は上限（${DAILY_LIMIT}回）に達しました。明日またご利用ください。` },
          { status: 429 },
        );
      }
    } catch {
      // 利用回数を数えられないときも回答は続ける
    }
  }

  const result = await runChat({ payload, history, origin: new URL(request.url).origin, apiKey });
  return result.ok
    ? Response.json({ content: result.content })
    : Response.json({ error: result.error }, { status: result.status });
}
