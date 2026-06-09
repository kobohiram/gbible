import { auth } from "@/auth";
import { sql } from "@vercel/postgres";

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

  const result = await sql`
    SELECT book_id AS "bookId", chapter, verse, translation, memo, updated_at AS "updatedAt"
    FROM translations
    WHERE user_id = ${session.user.email}
      AND book_id = ${bookId}
      AND chapter = ${parseInt(chapter)}
    ORDER BY verse
  `;

  return Response.json(result.rows);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, chapter, verse, translation, memo } =
    (await request.json()) as {
      bookId: string;
      chapter: number;
      verse: number;
      translation: string;
      memo: string;
    };

  await sql`
    INSERT INTO translations (user_id, book_id, chapter, verse, translation, memo, updated_at)
    VALUES (${session.user.email}, ${bookId}, ${chapter}, ${verse}, ${translation}, ${memo}, NOW())
    ON CONFLICT (user_id, book_id, chapter, verse)
    DO UPDATE SET
      translation = EXCLUDED.translation,
      memo        = EXCLUDED.memo,
      updated_at  = NOW()
  `;

  return Response.json({ ok: true });
}
