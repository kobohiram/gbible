import { canReview, currentReviewUser, isDbConfigured, reviewDb } from "@/lib/lexicon-review-server";

/** 確認者向け：保留中の提案の一覧（古い順） */
export async function GET() {
  const user = await currentReviewUser();
  if (!canReview(user.role)) {
    return Response.json({ role: user.role, items: [] }, { status: user.email ? 403 : 401 });
  }
  if (!isDbConfigured()) return Response.json({ role: user.role, items: [] });
  try {
    const items = await reviewDb()`
      SELECT id, book_id AS "bookId", kind, target_id AS "targetId", verse_key AS "verseKey",
             action, current_value AS "currentValue", proposed_value AS "proposedValue",
             comment, user_name AS "userName", status, created_at AS "createdAt"
      FROM lexicon_suggestions
      WHERE status = 'pending'
      ORDER BY created_at
      LIMIT 200
    `;
    return Response.json({ role: user.role, items });
  } catch {
    return Response.json({ role: user.role, items: [] });
  }
}
