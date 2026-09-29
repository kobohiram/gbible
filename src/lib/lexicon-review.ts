/** みんなで作る辞書：画面とサーバーで共通の型 */

export type ReviewRole = "guest" | "member" | "reviewer" | "admin";

export type ReviewKind = "gloss" | "lexicon";

export type GlossValue = { gloss: string };
export type LexiconValue = { glossJa: string; definitionJa: string; detailJa: string };
export type ReviewValue = GlossValue | LexiconValue;

export type ReviewDecision = {
  kind: ReviewKind;
  targetId: string;
  status: "verified" | "edited";
  value: ReviewValue;
  reviewerName: string;
  decidedAt: string;
};

export type ReviewSuggestion = {
  id: number;
  bookId: string;
  kind: ReviewKind;
  targetId: string;
  verseKey: string | null;
  action: "confirm" | "edit";
  currentValue: ReviewValue;
  proposedValue: ReviewValue | null;
  comment: string;
  userName: string;
  isMine: boolean;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  reviewerName: string | null;
  reviewerNote: string;
  createdAt: string;
};

/** 節ごとに取得する確認状況 */
export type VerseReviewState = {
  role: ReviewRole;
  /** 対象ID（単語ID / Strong's）→ 確定内容 */
  decisions: Record<string, ReviewDecision>;
  /** 対象ID → 保留中の提案 */
  pending: Record<string, ReviewSuggestion[]>;
};

export const EMPTY_REVIEW_STATE: VerseReviewState = { role: "guest", decisions: {}, pending: {} };

export function decisionKey(kind: ReviewKind, targetId: string): string {
  return `${kind}:${targetId}`;
}

/** 入力の上限（サーバー側でも同じ値で検証する） */
export const REVIEW_LIMITS = {
  gloss: 10,
  glossJa: 8,
  definitionJa: 15,
  detailJa: 900,
  comment: 500,
} as const;

/** 画面向け：確認状況の読み込み */
export async function fetchVerseReviewState(
  bookId: string,
  wordIds: string[],
  strongs: string[],
): Promise<VerseReviewState> {
  const params = new URLSearchParams({
    bookId,
    words: wordIds.join(","),
    strongs: strongs.join(","),
  });
  try {
    const res = await fetch(`/api/lexicon-review?${params}`);
    if (!res.ok) return EMPTY_REVIEW_STATE;
    return (await res.json()) as VerseReviewState;
  } catch {
    return EMPTY_REVIEW_STATE;
  }
}

/** 確認者が確定した文脈訳を、単語に反映する */
export function applyWordDecision<W extends { id: string; ctxGloss?: string; review?: { status: string } }>(
  word: W,
  state: VerseReviewState,
): W {
  const d = state.decisions[decisionKey("gloss", word.id)];
  if (!d || !("gloss" in d.value)) return word;
  return { ...word, ctxGloss: d.value.gloss, review: { status: "checked" } };
}

/** 確認者が確定した辞書の内容を、辞書項目に反映する */
export function applyEntryDecision<
  E extends { strongs: string; glossJa?: string; definitionJa: string; detailJa?: string; reviewed: boolean },
>(entry: E | null, state: VerseReviewState): E | null {
  if (!entry) return entry;
  const d = state.decisions[decisionKey("lexicon", entry.strongs)];
  if (!d || !("detailJa" in d.value)) return entry;
  return { ...entry, ...d.value, reviewed: true, review: { status: "checked" } };
}
