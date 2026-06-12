import { expandMorphologyJa } from "@/lib/morphology";
import { neon } from "@neondatabase/serverless";

export type GrammarNoteRequest = {
  greek: string;
  lemma?: string;
  morph: string;
  glossJa: string;
  reference: string;
  verseGreek: string;
};

export type GrammarNoteResponse = {
  content: string;
  reviewed: boolean;
  id?: number;
};

function db() {
  return neon(process.env.DATABASE_URL!);
}

// 固有名詞かどうか判定（ギリシャ語の大文字始まり）
function isProperNoun(req: GrammarNoteRequest): boolean {
  const target = req.lemma ?? req.greek;
  const first = target[0];
  return first === first.toUpperCase() && first !== first.toLowerCase();
}

function buildPrompt(req: GrammarNoteRequest): string {
  const morphJa = expandMorphologyJa(req.morph);

  if (isProperNoun(req)) {
    return `あなたは聖書の地理・歴史・文化の専門家です。
新約聖書に登場するこの固有名詞について、読者が聖書を読む助けになる情報を日本語で解説してください。

## 対象
- ギリシャ語: ${req.greek}${req.lemma ? `（見出し語: ${req.lemma}）` : ""}
- 日本語訳: ${req.glossJa}

## 文脈（${req.reference}）
${req.verseGreek}

## 解説の要件
- 地名なら：場所・地理的特徴・歴史的背景・新約時代の状況
- 人名なら：その人物の概要・聖書での役割・興味深い事実
- 語源・ヘブライ語/アラム語との関連があれば紹介
- 知っていると聖書理解が深まるトリビアを含める
- 3〜5文程度、読みやすい日本語、箇条書き不可
- 不確かな情報は「〜とも言われています」の形にする`;
  }

  return `あなたは新約聖書コイネーギリシャ語の文法・解釈の専門家です。
以下の語形について、文法的なニュアンスを日本語で解説してください。

## 対象の語
- ギリシャ語: ${req.greek}${req.lemma ? `（見出し語: ${req.lemma}）` : ""}
- 日本語の基本訳: ${req.glossJa}
- 語形コード: ${req.morph}（${morphJa}）

## 文脈（${req.reference}）
${req.verseGreek}

## 解説の要件

**文法的説明（客観的事実として述べてよい）：**
- 動詞の場合：時制・態・法の文法的機能と一般的なニュアンス
  - アオリスト：点的・完結的行為の描写。未完了との対比
  - 未完了：継続・反復・進行中の行為。情景描写としての機能
  - 完了形：過去の行為が現在も効力を持つことを示す
  - 命令形：現在命令（継続・反復）かアオリスト命令（一回的行為）か
- 名詞の場合：格の文法的機能。属格絶対構文・不定詞の主語としての属格などの特殊用法があれば解説
- 日本語訳では表現しにくいニュアンス

**解釈的内容（可能性・推測として述べること）：**
- 著者がこの語形を選んだ可能性のある意図は「〜とも考えられます」「〜という解釈もあります」の形で述べる
- 神学的含意は断定せず「〜を示唆するかもしれません」の形にする
- 学者間で議論があるものは「諸説あります」と明記する

**スタイル：**
- 3〜5文程度、読みやすい日本語
- 箇条書きにせず一つの段落として書く
- 断定的・権威的な言い方を避ける`;
}

// メモリキャッシュ（DBアクセスの補助）
const memCache = new Map<string, GrammarNoteResponse>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const morph = searchParams.get("morph");
  const lemma = searchParams.get("lemma") ?? "";
  const reference = searchParams.get("reference") ?? "";

  if (!morph) return Response.json({ error: "morph が必要です" }, { status: 400 });

  const cacheKey = `${morph}:${lemma}:${reference}`;
  const cached = memCache.get(cacheKey);
  if (cached) return Response.json(cached);

  try {
    const sql = db();
    const rows = await sql`
      SELECT id, content, reviewed FROM grammar_notes
      WHERE morph = ${morph} AND lemma = ${lemma} AND reference = ${reference}
      LIMIT 1
    `;
    if (rows.length > 0) {
      const row = rows[0] as { id: number; content: string; reviewed: boolean };
      const result: GrammarNoteResponse = { content: row.content, reviewed: row.reviewed, id: row.id };
      memCache.set(cacheKey, result);
      return Response.json(result);
    }
    return Response.json(null);
  } catch {
    return Response.json(null);
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "サーバー設定エラー" }, { status: 500 });

  let body: GrammarNoteRequest;
  try {
    body = (await request.json()) as GrammarNoteRequest;
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  if (!body.greek || !body.morph) {
    return Response.json({ error: "語形情報が不足しています" }, { status: 400 });
  }

  const cacheKey = `${body.morph}:${body.lemma ?? ""}:${body.reference}`;

  // DB確認
  try {
    const sql = db();
    const rows = await sql`
      SELECT id, content, reviewed FROM grammar_notes
      WHERE morph = ${body.morph} AND lemma = ${body.lemma ?? ""} AND reference = ${body.reference}
      LIMIT 1
    `;
    if (rows.length > 0) {
      const row = rows[0] as { id: number; content: string; reviewed: boolean };
      const result: GrammarNoteResponse = { content: row.content, reviewed: row.reviewed, id: row.id };
      memCache.set(cacheKey, result);
      return Response.json(result);
    }
  } catch { /* DB未作成などは無視して生成へ */ }

  // Claude で生成
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        messages: [{ role: "user", content: buildPrompt(body) }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: `API エラー: ${err.slice(0, 100)}` }, { status: 502 });
    }

    const data = (await res.json()) as { content?: { text: string }[] };
    const content = data.content?.[0]?.text?.trim() ?? "";

    // DB保存
    let id: number | undefined;
    try {
      const sql = db();
      const rows = await sql`
        INSERT INTO grammar_notes (morph, lemma, reference, content, reviewed)
        VALUES (${body.morph}, ${body.lemma ?? ""}, ${body.reference}, ${content}, false)
        ON CONFLICT (morph, lemma, reference) DO UPDATE SET content = EXCLUDED.content
        RETURNING id
      `;
      id = (rows[0] as { id: number }).id;
    } catch { /* DB未作成なら保存スキップ */ }

    const result: GrammarNoteResponse = { content, reviewed: false, id };
    memCache.set(cacheKey, result);
    return Response.json(result);
  } catch {
    return Response.json({ error: "生成に失敗しました" }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as { id: number; content?: string; reviewed?: boolean };
  if (!body.id) return Response.json({ error: "id が必要です" }, { status: 400 });

  try {
    const sql = db();
    if (body.content !== undefined) {
      await sql`UPDATE grammar_notes SET content = ${body.content}, reviewed = true WHERE id = ${body.id}`;
    } else {
      await sql`UPDATE grammar_notes SET reviewed = true WHERE id = ${body.id}`;
    }
    memCache.clear();
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
