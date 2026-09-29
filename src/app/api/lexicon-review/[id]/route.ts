import {
  canReview,
  currentReviewUser,
  isDbConfigured,
  reviewDb,
  sanitizeValue,
} from "@/lib/lexicon-review-server";
import { REVIEW_LIMITS, type ReviewKind } from "@/lib/lexicon-review";

type Params = { params: Promise<{ id: string }> };

/** 確認者が提案を承認・却下する */
export async function PATCH(request: Request, { params }: Params) {
  const user = await currentReviewUser();
  if (!user.email || !canReview(user.role)) {
    return Response.json({ error: "確認者の権限が必要です。" }, { status: 403 });
  }
  if (!isDbConfigured()) return Response.json({ error: "データベースが設定されていません。" }, { status: 503 });

  const id = parseInt((await params).id, 10);
  const body = (await request.json().catch(() => ({}))) as {
    decision?: string;
    note?: string;
    /** 承認時に確認者が手直しした内容（任意） */
    value?: unknown;
  };
  if (Number.isNaN(id) || (body.decision !== "approve" && body.decision !== "reject")) {
    return Response.json({ error: "指定が正しくありません。" }, { status: 400 });
  }
  const note = (body.note ?? "").trim().slice(0, REVIEW_LIMITS.comment);

  const sql = reviewDb();
  const rows = await sql`
    SELECT id, book_id, kind, target_id, action, current_value, proposed_value
    FROM lexicon_suggestions WHERE id = ${id} AND status = 'pending'
  `;
  const s = rows[0] as
    | { book_id: string; kind: ReviewKind; target_id: string; action: string; current_value: unknown; proposed_value: unknown }
    | undefined;
  if (!s) return Response.json({ error: "保留中の提案が見つかりません。" }, { status: 404 });

  if (body.decision === "reject") {
    await sql`
      UPDATE lexicon_suggestions
      SET status = 'rejected', reviewer_email = ${user.email}, reviewer_name = ${user.name},
          reviewer_note = ${note}, reviewed_at = NOW()
      WHERE id = ${id}
    `;
    return Response.json({ ok: true });
  }

  const edited = body.value !== undefined ? sanitizeValue(s.kind, body.value) : null;
  if (body.value !== undefined && !edited) {
    return Response.json({ error: "手直しした内容が空か、文字数の上限を超えています。" }, { status: 400 });
  }
  const value = edited ?? (s.action === "edit" ? s.proposed_value : s.current_value);
  const status = s.action === "edit" || edited ? "edited" : "verified";

  await sql`
    UPDATE lexicon_suggestions
    SET status = 'approved', reviewer_email = ${user.email}, reviewer_name = ${user.name},
        reviewer_note = ${note}, reviewed_at = NOW()
    WHERE id = ${id}
  `;
  await sql`
    INSERT INTO lexicon_decisions (kind, target_id, book_id, status, value, suggestion_id, reviewer_email, reviewer_name)
    VALUES (${s.kind}, ${s.target_id}, ${s.book_id}, ${status}, ${JSON.stringify(value)}::jsonb, ${id},
            ${user.email}, ${user.name})
    ON CONFLICT (kind, target_id) DO UPDATE SET
      status = EXCLUDED.status, value = EXCLUDED.value, suggestion_id = EXCLUDED.suggestion_id,
      reviewer_email = EXCLUDED.reviewer_email, reviewer_name = EXCLUDED.reviewer_name, decided_at = NOW()
  `;
  return Response.json({ ok: true });
}

/** 提案した本人が、保留中の提案を取り下げる */
export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentReviewUser();
  if (!user.email) return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  if (!isDbConfigured()) return Response.json({ error: "データベースが設定されていません。" }, { status: 503 });
  const id = parseInt((await params).id, 10);
  if (Number.isNaN(id)) return Response.json({ error: "指定が正しくありません。" }, { status: 400 });
  await reviewDb()`
    UPDATE lexicon_suggestions SET status = 'withdrawn'
    WHERE id = ${id} AND user_email = ${user.email} AND status = 'pending'
  `;
  return Response.json({ ok: true });
}
