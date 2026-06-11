import { neon } from "@neondatabase/serverless";

export const revalidate = 3600;

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT COUNT(DISTINCT user_id) AS count FROM translations`;
    const count = Number(rows[0]?.count ?? 0);
    return Response.json({ users: count });
  } catch {
    return Response.json({ users: 0 });
  }
}
