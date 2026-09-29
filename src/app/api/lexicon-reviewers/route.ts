import { currentReviewUser, isDbConfigured, reviewDb } from "@/lib/lexicon-review-server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin() {
  const user = await currentReviewUser();
  if (user.role !== "admin") {
    return { user, error: Response.json({ error: "管理者の権限が必要です。" }, { status: 403 }) };
  }
  if (!isDbConfigured()) {
    return { user, error: Response.json({ error: "データベースが設定されていません。" }, { status: 503 }) };
  }
  return { user, error: null };
}

/** 管理者向け：確認者の一覧 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const rows = await reviewDb()`
    SELECT r.email, r.display_name AS "displayName", r.note, r.added_at AS "addedAt",
           (SELECT COUNT(*)::int FROM lexicon_suggestions s WHERE s.reviewer_email = r.email) AS "reviewCount"
    FROM lexicon_reviewers r
    ORDER BY r.added_at
  `;
  return Response.json(rows);
}

/** 管理者向け：確認者を指名する（同じメールなら名前・メモを更新） */
export async function POST(request: Request) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const body = (await request.json().catch(() => ({}))) as { email?: string; displayName?: string; note?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return Response.json({ error: "メールアドレスが正しくありません。" }, { status: 400 });
  const displayName = (body.displayName ?? "").trim().slice(0, 60);
  const note = (body.note ?? "").trim().slice(0, 200);
  await reviewDb()`
    INSERT INTO lexicon_reviewers (email, display_name, note, added_by)
    VALUES (${email}, ${displayName}, ${note}, ${user.email})
    ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, note = EXCLUDED.note
  `;
  return Response.json({ ok: true });
}

/** 管理者向け：確認者の指名を外す（これまでの承認記録は残る） */
export async function DELETE(request: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const email = (new URL(request.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return Response.json({ error: "メールアドレスが正しくありません。" }, { status: 400 });
  await reviewDb()`DELETE FROM lexicon_reviewers WHERE email = ${email}`;
  return Response.json({ ok: true });
}
