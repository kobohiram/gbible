import { neon } from "@neondatabase/serverless";

const MIGRATION_TOKEN = "gbible-migrate-2026";

export async function POST(request: Request) {
  const { token } = (await request.json()) as { token?: string };
  if (token !== MIGRATION_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    ALTER TABLE translations
    ADD COLUMN IF NOT EXISTS memo_is_public BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS user_name TEXT
  `;

  return Response.json({ ok: true, message: "Migration complete" });
}
