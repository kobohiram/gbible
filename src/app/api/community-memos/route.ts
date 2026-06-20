import { neon } from "@neondatabase/serverless";

function db() {
  return neon(process.env.DATABASE_URL!);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bookId  = searchParams.get("bookId");
  const chapter = searchParams.get("chapter");
  const verse   = searchParams.get("verse");

  if (!bookId || !chapter || !verse) {
    return Response.json({ error: "Missing params" }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json([]);
  }

  try {
    const sql = db();
    const rows = await sql`
      SELECT
        id,
        user_name  AS "userName",
        memo,
        updated_at AS "updatedAt"
      FROM translations
      WHERE book_id       = ${bookId}
        AND chapter       = ${parseInt(chapter)}
        AND verse         = ${parseInt(verse)}
        AND memo_is_public = TRUE
        AND memo          != ''
      ORDER BY updated_at DESC
      LIMIT 50
    `;

    return Response.json(rows);
  } catch {
    return Response.json([]);
  }
}
