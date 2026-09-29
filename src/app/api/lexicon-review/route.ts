import {
  canReview,
  currentReviewUser,
  isDbConfigured,
  isReviewKind,
  reviewDb,
  sanitizeValue,
} from "@/lib/lexicon-review-server";
import {
  REVIEW_LIMITS,
  decisionKey,
  type ReviewDecision,
  type ReviewSuggestion,
  type VerseReviewState,
} from "@/lib/lexicon-review";

const MAX_IDS = 400;

function splitIds(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9:_-]{1,64}$/.test(s))
    .slice(0, MAX_IDS);
}

/** 節の単語・見出し語について、確定内容と保留中の提案を返す */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const words = splitIds(searchParams.get("words"));
  const strongs = splitIds(searchParams.get("strongs"));
  const user = await currentReviewUser();
  const state: VerseReviewState = { role: user.role, decisions: {}, pending: {} };
  if (!isDbConfigured() || (words.length === 0 && strongs.length === 0)) {
    return Response.json(state);
  }

  try {
    const sql = reviewDb();
    const decisions = await sql`
      SELECT kind, target_id AS "targetId", status, value,
             reviewer_name AS "reviewerName", decided_at AS "decidedAt"
      FROM lexicon_decisions
      WHERE (kind = 'gloss' AND target_id = ANY(${words}))
         OR (kind = 'lexicon' AND target_id = ANY(${strongs}))
    `;
    for (const d of decisions as ReviewDecision[]) {
      state.decisions[decisionKey(d.kind, d.targetId)] = d;
    }

    const pending = await sql`
      SELECT id, book_id AS "bookId", kind, target_id AS "targetId", verse_key AS "verseKey",
             action, current_value AS "currentValue", proposed_value AS "proposedValue",
             comment, user_name AS "userName", user_email, status,
             reviewer_name AS "reviewerName", reviewer_note AS "reviewerNote",
             created_at AS "createdAt"
      FROM lexicon_suggestions
      WHERE status = 'pending'
        AND ((kind = 'gloss' AND target_id = ANY(${words}))
          OR (kind = 'lexicon' AND target_id = ANY(${strongs})))
      ORDER BY created_at
    `;
    for (const row of pending) {
      const { user_email: email, ...rest } = row as ReviewSuggestion & { user_email: string };
      const s: ReviewSuggestion = { ...rest, isMine: email === user.email };
      const key = decisionKey(s.kind, s.targetId);
      (state.pending[key] ??= []).push(s);
    }
  } catch {
    // テーブル未作成などのときは、確認機能なしで表示する
  }
  return Response.json(state);
}

type PostBody = {
  bookId?: string;
  kind?: string;
  targetId?: string;
  verseKey?: string;
  action?: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  comment?: string;
};

/**
 * 提案を送る。
 * - ログインした利用者: 保留中の提案として保存（同じ語への自分の保留中の提案は置き換え）
 * - 確認者・管理者: その場で確定する
 */
export async function POST(request: Request) {
  const user = await currentReviewUser();
  if (!user.email) return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  if (!isDbConfigured()) return Response.json({ error: "データベースが設定されていません。" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as PostBody;
  const { bookId, kind, targetId, verseKey = null } = body;
  if (!bookId || !/^[a-z0-9]{2,20}$/.test(bookId) || !isReviewKind(kind) || !targetId || !/^[A-Za-z0-9_-]{1,64}$/.test(targetId)) {
    return Response.json({ error: "対象の指定が正しくありません。" }, { status: 400 });
  }
  const action = body.action === "edit" ? "edit" : "confirm";
  const currentValue = sanitizeValue(kind, body.currentValue);
  const proposedValue = action === "edit" ? sanitizeValue(kind, body.proposedValue) : null;
  if (!currentValue) return Response.json({ error: "現在の内容が正しくありません。" }, { status: 400 });
  if (action === "edit" && !proposedValue) {
    return Response.json({ error: "修正案が空か、文字数の上限を超えています。" }, { status: 400 });
  }
  const comment = (body.comment ?? "").trim().slice(0, REVIEW_LIMITS.comment);

  const sql = reviewDb();
  const reviewer = canReview(user.role);

  if (reviewer) {
    const value = proposedValue ?? currentValue;
    const status = action === "edit" ? "edited" : "verified";
    const rows = await sql`
      INSERT INTO lexicon_suggestions
        (book_id, kind, target_id, verse_key, action, current_value, proposed_value, comment,
         user_email, user_name, status, reviewer_email, reviewer_name, reviewed_at)
      VALUES
        (${bookId}, ${kind}, ${targetId}, ${verseKey}, ${action}, ${JSON.stringify(currentValue)}::jsonb,
         ${proposedValue ? JSON.stringify(proposedValue) : null}::jsonb, ${comment},
         ${user.email}, ${user.name}, 'approved', ${user.email}, ${user.name}, NOW())
      RETURNING id
    `;
    await sql`
      INSERT INTO lexicon_decisions (kind, target_id, book_id, status, value, suggestion_id, reviewer_email, reviewer_name)
      VALUES (${kind}, ${targetId}, ${bookId}, ${status}, ${JSON.stringify(value)}::jsonb, ${rows[0].id},
              ${user.email}, ${user.name})
      ON CONFLICT (kind, target_id) DO UPDATE SET
        status = EXCLUDED.status, value = EXCLUDED.value, suggestion_id = EXCLUDED.suggestion_id,
        reviewer_email = EXCLUDED.reviewer_email, reviewer_name = EXCLUDED.reviewer_name, decided_at = NOW()
    `;
    return Response.json({ ok: true, applied: true });
  }

  await sql`
    UPDATE lexicon_suggestions SET status = 'withdrawn'
    WHERE kind = ${kind} AND target_id = ${targetId} AND user_email = ${user.email} AND status = 'pending'
  `;
  await sql`
    INSERT INTO lexicon_suggestions
      (book_id, kind, target_id, verse_key, action, current_value, proposed_value, comment, user_email, user_name)
    VALUES
      (${bookId}, ${kind}, ${targetId}, ${verseKey}, ${action}, ${JSON.stringify(currentValue)}::jsonb,
       ${proposedValue ? JSON.stringify(proposedValue) : null}::jsonb, ${comment}, ${user.email}, ${user.name})
  `;
  return Response.json({ ok: true, applied: false });
}
