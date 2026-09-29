import { neon } from "@neondatabase/serverless";
import { auth } from "@/auth";
import {
  REVIEW_LIMITS,
  type ReviewKind,
  type ReviewRole,
  type ReviewValue,
} from "@/lib/lexicon-review";

export function reviewDb() {
  return neon(process.env.DATABASE_URL!);
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** 管理者（確認者を指名できる人）。環境変数 LEXICON_ADMIN_EMAILS にカンマ区切りで指定 */
function adminEmails(): Set<string> {
  return new Set(
    (process.env.LEXICON_ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export type ReviewUser = {
  email: string | null;
  name: string;
  role: ReviewRole;
};

/** ログイン中の利用者と、その権限を返す */
export async function currentReviewUser(): Promise<ReviewUser> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) return { email: null, name: "", role: "guest" };
  const name = session?.user?.name ?? email;
  if (adminEmails().has(email)) return { email, name, role: "admin" };
  if (!isDbConfigured()) return { email, name, role: "member" };
  try {
    const rows = await reviewDb()`SELECT 1 FROM lexicon_reviewers WHERE email = ${email}`;
    return { email, name, role: rows.length ? "reviewer" : "member" };
  } catch {
    return { email, name, role: "member" };
  }
}

export function canReview(role: ReviewRole): boolean {
  return role === "reviewer" || role === "admin";
}

/** 提案・確定の値を検証して整える。不正なら null */
export function sanitizeValue(kind: ReviewKind, raw: unknown): ReviewValue | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const str = (key: string, max: number) => {
    const s = typeof v[key] === "string" ? (v[key] as string).trim() : "";
    return s && [...s].length <= max ? s : null;
  };
  if (kind === "gloss") {
    const gloss = str("gloss", REVIEW_LIMITS.gloss);
    return gloss ? { gloss } : null;
  }
  const glossJa = str("glossJa", REVIEW_LIMITS.glossJa);
  const definitionJa = str("definitionJa", REVIEW_LIMITS.definitionJa);
  const detailJa = str("detailJa", REVIEW_LIMITS.detailJa);
  return glossJa && definitionJa && detailJa ? { glossJa, definitionJa, detailJa } : null;
}

export function isReviewKind(k: unknown): k is ReviewKind {
  return k === "gloss" || k === "lexicon";
}
