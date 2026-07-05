import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";

function db() {
  return neon(process.env.DATABASE_URL!);
}

// GET /api/vocab-quiz-progress
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ learned: [] });
  }

  try {
    const sql = db();
    const rows = await sql`
      SELECT word_id
      FROM vocab_quiz_progress
      WHERE user_email = ${session.user.email}
        AND learned = true
    `;
    return Response.json({ learned: rows.map((r) => r.word_id as string) });
  } catch {
    return Response.json({ learned: [] });
  }
}

// POST /api/vocab-quiz-progress
// Body: { wordId: string }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { wordId } = await request.json();
  if (!wordId || typeof wordId !== "string") {
    return Response.json({ error: "Missing wordId" }, { status: 400 });
  }

  try {
    const sql = db();
    await sql`
      INSERT INTO vocab_quiz_progress (user_email, word_id, learned, learned_at)
      VALUES (${session.user.email}, ${wordId}, true, NOW())
      ON CONFLICT (user_email, word_id)
      DO UPDATE SET learned = true, learned_at = NOW()
    `;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
