import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";

function db() {
  return neon(process.env.DATABASE_URL!);
}

const VALID_EMOJIS = ["❤️", "🙏", "💡", "✨"];

async function ensureTable() {
  const sql = db();
  await sql`
    CREATE TABLE IF NOT EXISTS memo_reactions (
      id             SERIAL PRIMARY KEY,
      translation_id INTEGER NOT NULL,
      user_id        TEXT NOT NULL,
      emoji          TEXT NOT NULL,
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(translation_id, user_id, emoji)
    )
  `;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const memoIdsParam = searchParams.get("memoIds");

  if (!memoIdsParam || !process.env.DATABASE_URL) {
    return Response.json({});
  }

  const memoIds = memoIdsParam.split(",").map(Number).filter(Boolean);
  if (memoIds.length === 0) return Response.json({});

  const session = await auth();
  const userId = session?.user?.email ?? "";

  try {
    await ensureTable();
    const sql = db();

    const rows = await sql`
      SELECT
        translation_id,
        emoji,
        COUNT(*)::int AS count,
        BOOL_OR(user_id = ${userId}) AS reacted
      FROM memo_reactions
      WHERE translation_id = ANY(${memoIds}::integer[])
      GROUP BY translation_id, emoji
    `;

    const result: Record<number, { counts: Record<string, number>; mine: string[] }> = {};
    for (const row of rows) {
      const mid = row.translation_id as number;
      if (!result[mid]) result[mid] = { counts: {}, mine: [] };
      result[mid].counts[row.emoji as string] = row.count as number;
      if (row.reacted && userId) result[mid].mine.push(row.emoji as string);
    }

    return Response.json(result);
  } catch {
    return Response.json({});
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "No database" }, { status: 500 });
  }

  const body = await request.json() as { translationId?: number; emoji?: string };
  const { translationId, emoji } = body;

  if (!translationId || !emoji || !VALID_EMOJIS.includes(emoji)) {
    return Response.json({ error: "Invalid params" }, { status: 400 });
  }

  const userId = session.user.email;

  try {
    await ensureTable();
    const sql = db();

    const existing = await sql`
      SELECT id FROM memo_reactions
      WHERE translation_id = ${translationId}
        AND user_id = ${userId}
        AND emoji   = ${emoji}
    `;

    if (existing.length > 0) {
      await sql`
        DELETE FROM memo_reactions
        WHERE translation_id = ${translationId}
          AND user_id = ${userId}
          AND emoji   = ${emoji}
      `;
      return Response.json({ added: false });
    } else {
      await sql`
        INSERT INTO memo_reactions (translation_id, user_id, emoji)
        VALUES (${translationId}, ${userId}, ${emoji})
      `;
      return Response.json({ added: true });
    }
  } catch {
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
