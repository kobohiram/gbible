# 旧約ヘブル語データの収録手順

2ペインの短い訳（文脈訳）と3ペインの辞書を、質を保ちながら1書ずつ（大きな書は区切って）収録するための手順です。

## 収録の順番（説教でよく使われる順）

| 段階 | 書 | 区切り方 |
|---|---|---|
| 0 | 創世記・出エジプト記の作り直し | 辞書を作り直し → 文脈訳を追加 |
| 1 | 詩篇 | 第1巻 1–41 → 第2巻 42–72 → 第3巻 73–89 → 第4巻 90–106 → 第5巻 107–150 |
| 2 | イザヤ書 | 40–66 → 1–39 |
| 3 | 箴言・ルツ記・ヨナ書 | 書ごと |
| 4 | 申命記 | 書ごと |
| 5 | ダニエル書・エレミヤ書・ミカ書 | ダニエル書はアラム語部分（2:4後半–7:28）あり |

## 1回分の流れ（例: 詩篇 第1巻）

```bash
npm run ot:text -- psalms                                  # 1. 本文（AI なし）
npm run ot:lexicon -- psalms --chapters 1-41 --dry-run     #    費用の確認
npm run ot:lexicon -- psalms --chapters 1-41               # 2. 辞書（この書で初めて出る語）
npm run ot:gloss -- psalms --chapters 1-41                 # 3. 文脈訳
npm run ot:verify -- psalms --chapters 1-41                # 4. AI による二重チェック
npm run ot:revise -- psalms --chapters 1-41                # 4.5 指摘を受けて自動修正（作成側の AI が判断）
npm run ot:verify -- psalms --chapters 1-41 --revised      #     直した項目だけを再点検（新たな指摘があれば 4.5 をもう一度。2回まで）
npm run ot:check -- psalms --chapters 1-41                 # 5. 自動チェック＋レビュー画面の作成（任意）
npm run ot:apply-review -- ~/Downloads/psalms-review.json  # 6. レビュー画面の判断を反映（任意）
npm run ot:publish -- psalms --chapters 1-41               # 7. 公開（訳・辞書の抜けや AI 点検漏れがあれば止まる）
```

- 2〜4 は Batch API（料金半額）で送ります。結果が出るまで通常1時間以内です。途中で止めても、同じコマンドをもう一度実行すれば続きから受け取れます。
- 数件だけ試すときは `--direct` を付けると即時に実行します（料金は通常）。
- API キーは `.env.local` の `ANTHROPIC_API_KEY` を使います。

## みんなで作る辞書（公開後の人の確認）

公開した訳・辞書は「AI下書き」と表示され、3ペインの「みんなで作る辞書」で確認を集めます。

- ログインした人: 「この訳で正しい」「修正を提案する」
- 確認者（管理者が `/review` で指名）: 提案の承認・却下、「確認済みにする」「修正して確定」
- 管理者: 環境変数 `LEXICON_ADMIN_EMAILS`（カンマ区切り）で指定

確定した内容はすぐアプリに反映されます（データベースの `lexicon_decisions`）。元データにも取り込むときは:

```bash
npm run ot:pull-reviews          # 確定内容を lexicon-master.json / gloss に取り込む（再生成で上書きされなくなる）
npm run ot:publish -- psalms --chapters 1-41
```

データベースの表は `scripts/migrate-lexicon-review.sql` で作ります。

## 運営者のレビュー画面（任意）

レビュー画面には、次のものだけが出ます。それ以外は AI の二重チェックを通ったものとして扱います。

- 辞書: この書で新しく作った見出し語のうち、固有名詞・出現頻度の上位60語・ルール違反・AI 校閲の指摘があるもの
- 文脈訳: ルール違反・AI 校閲の指摘があるもの

「修正して承認」した項目は固定され、今後作り直しても上書きされません。

## 表記の基準

- [style/style-guide.md](style/style-guide.md) — 訳と辞書の書き方（新改訳2017準拠）
- [style/names-ja.json](style/names-ja.json) — 固有名詞の対照表。ここに加えた表記は常に優先されます

## ファイル

| 場所 | 内容 | Git |
|---|---|---|
| `data/ot/lexicon-master.json` | 全書共通の辞書（status: legacy / draft / verified / locked / redo） | 管理する |
| `data/ot/gloss/<書>.json` | 文脈訳 | 管理する |
| `data/ot/verify/<書>.json` | AI 校閲の指摘 | 管理する |
| `data/ot/work/`・`data/ot/review/` | 本文の中間データ・レビュー画面 | 管理しない（再生成できる） |
| `public/data/ot/<書>.json` | アプリが読むデータ | 管理する |
| `src/data/ot-published.json` | 公開済みの書と章 | 管理する |

## 節番号

- 詩篇以降の書は新改訳2017と同じ節番号です。詩篇の表題は「0節」としてアプリに「表題」と表示されます。
- 創世記・出エジプト記は、保存済みのメモ・私訳とずれないよう、ヘブル語本文の節番号のままです（創32章、出8章・22章などで邦訳と1節ずれます）。
