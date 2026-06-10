import { auth } from "@/auth";
import { neon } from "@neondatabase/serverless";

function db() {
  return neon(process.env.DATABASE_URL!);
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  const chapter = searchParams.get("chapter");

  if (!bookId || !chapter) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  const sql = db();
  const rows = await sql`
    SELECT
      book_id       AS "bookId",
      chapter,
      verse,
      translation,
      memo,
      memo_is_public AS "memoIsPublic",
      updated_at    AS "updatedAt"
    FROM translations
    WHERE user_id = ${session.user.email}
      AND book_id = ${bookId}
      AND chapter = ${parseInt(chapter)}
    ORDER BY verse
  `;

  return Response.json(rows);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, chapter, verse, translation, memo, memoIsPublic } =
    (await request.json()) as {
      bookId: string;
      chapter: number;
      verse: number;
      translation: string;
      memo: string;
      memoIsPublic: boolean;
    };

  const userName = session.user.name ?? session.user.email;

  const sql = db();
  await sql`
    INSERT INTO translations (user_id, book_id, chapter, verse, translation, memo, memo_is_public, user_name, updated_at)
    VALUES (${session.user.email}, ${bookId}, ${chapter}, ${verse}, ${translation}, ${memo}, ${memoIsPublic}, ${userName}, NOW())
    ON CONFLICT (user_id, book_id, chapter, verse)
    DO UPDATE SET
      translation    = EXCLUDED.translation,
      memo           = EXCLUDED.memo,
      memo_is_public = EXCLUDED.memo_is_public,
      user_name      = EXCLUDED.user_name,
      updated_at     = NOW()
  `;

  return Response.json({ ok: true });
}
