import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";

function db() {
  return neon(process.env.DATABASE_URL!);
}

// GET  /api/grammar-progress?chapter=1
// Returns all passed lessons for the user in the given chapter
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ passed: [] });
  }

  const { searchParams } = new URL(request.url);
  const chapter = searchParams.get("chapter");

  try {
    const sql = db();
    const rows = chapter
      ? await sql`
          SELECT chapter_number, lesson_number, balloon_index
          FROM grammar_progress
          WHERE user_email = ${session.user.email}
            AND chapter_number = ${Number(chapter)}
            AND passed = true
        `
      : await sql`
          SELECT chapter_number, lesson_number, balloon_index
          FROM grammar_progress
          WHERE user_email = ${session.user.email}
            AND passed = true
        `;
    return Response.json({ passed: rows });
  } catch {
    return Response.json({ passed: [] });
  }
}

// POST /api/grammar-progress
// Body: { chapterNumber, lessonNumber }
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chapterNumber, lessonNumber, balloonIndex = 0 } = await request.json();
  if (!chapterNumber || !lessonNumber) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const sql = db();
    await sql`
      INSERT INTO grammar_progress (user_email, chapter_number, lesson_number, balloon_index, passed, passed_at)
      VALUES (${session.user.email}, ${chapterNumber}, ${lessonNumber}, ${balloonIndex}, true, NOW())
      ON CONFLICT (user_email, chapter_number, lesson_number, balloon_index)
      DO UPDATE SET passed = true, passed_at = NOW()
    `;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "DB error" }, { status: 500 });
  }
}
