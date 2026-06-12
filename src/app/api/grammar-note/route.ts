import { expandMorphologyJa } from "@/lib/morphology";

export type GrammarNoteRequest = {
  greek: string;
  lemma?: string;
  morph: string;
  glossJa: string;
  reference: string;
  verseGreek: string;
};

function buildPrompt(req: GrammarNoteRequest): string {
  const morphJa = expandMorphologyJa(req.morph);

  return `あなたは新約聖書コイネーギリシャ語の文法・解釈の専門家です。
以下の語形について、著者がこの語形を選んだ意図とニュアンスを日本語で解説してください。

## 対象の語
- ギリシャ語: ${req.greek}${req.lemma ? `（見出し語: ${req.lemma}）` : ""}
- 日本語の基本訳: ${req.glossJa}
- 語形コード: ${req.morph}（${morphJa}）

## 文脈（${req.reference}）
${req.verseGreek}

## 解説の要件
この語形が持つ文法的ニュアンスを以下の観点から丁寧に説明してください：

**動詞の場合：**
- アオリストなら：点的・完結的行為として描写した意図。未完了形との違い（未完了なら継続・反復を示していたが、ここではなぜアオリストか）
- 未完了なら：継続・反復・進行の豊かなニュアンス。情景描写としての機能
- 完了形なら：過去の行為が現在に影響を持続していることの神学的意義
- 命令形なら：継続命令（現在）か一回的命令（アオリスト）か、その違い
- 仮定法・希求法なら：著者の意図する可能性・願望・条件の表現

**名詞・形容詞の場合：**
- 格の機能（属格絶対構文、不定詞の主語としての属格、目的語属格など特殊用法があれば詳述）
- 複数・単数の選択に意味がある場合はその解説

**全般：**
- 日本語訳では失われがちなニュアンス
- 著者（ヨハネ、パウロ等）がこの語形を選んだことで何を表現しようとしたか
- 3〜5文程度、学術的だが読みやすい日本語で
- 箇条書きにせず、一つの段落として書く`;
}

// サーバーサイドキャッシュ（morph + strongs でキャッシュ）
const cache = new Map<string, string>();

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "サーバー設定エラー" }, { status: 500 });
  }

  let body: GrammarNoteRequest;
  try {
    body = (await request.json()) as GrammarNoteRequest;
  } catch {
    return Response.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  if (!body.greek || !body.morph) {
    return Response.json({ error: "語形情報が不足しています" }, { status: 400 });
  }

  // 同じ語形・同じ節は再利用
  const cacheKey = `${body.morph}:${body.lemma ?? body.greek}:${body.reference}`;
  const cached = cache.get(cacheKey);
  if (cached) return Response.json({ content: cached });

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

    cache.set(cacheKey, content);
    return Response.json({ content });
  } catch {
    return Response.json({ error: "生成に失敗しました" }, { status: 502 });
  }
}
