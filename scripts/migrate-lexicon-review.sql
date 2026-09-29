-- みんなで作る辞書（旧約の文脈訳・辞書の確認と修正提案）
-- Run on Neon DB (Vercel dashboard > Storage > Neon > SQL Editor)

-- 確認者（管理者が指名する。管理者は環境変数 LEXICON_ADMIN_EMAILS で指定）
CREATE TABLE IF NOT EXISTS lexicon_reviewers (
  email         TEXT PRIMARY KEY,
  display_name  TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  added_by      TEXT NOT NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 提案（ログインした人が送る。確認者が承認・却下する）
--   kind      : 'gloss'（2ペインの文脈訳。target_id = 単語ID）/ 'lexicon'（3ペインの辞書。target_id = Strong's）
--   action    : 'confirm'（今の訳で正しい）/ 'edit'（修正案）
--   *_value   : { "gloss": "..." } または { "glossJa": "...", "definitionJa": "...", "detailJa": "..." }
CREATE TABLE IF NOT EXISTS lexicon_suggestions (
  id              SERIAL PRIMARY KEY,
  book_id         TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('gloss', 'lexicon')),
  target_id       TEXT NOT NULL,
  verse_key       TEXT,
  action          TEXT NOT NULL CHECK (action IN ('confirm', 'edit')),
  current_value   JSONB NOT NULL,
  proposed_value  JSONB,
  comment         TEXT NOT NULL DEFAULT '',
  user_email      TEXT NOT NULL,
  user_name       TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewer_email  TEXT,
  reviewer_name   TEXT,
  reviewer_note   TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lexicon_suggestions_target
  ON lexicon_suggestions(kind, target_id);
CREATE INDEX IF NOT EXISTS idx_lexicon_suggestions_status
  ON lexicon_suggestions(status, created_at);

-- 確定した内容（確認者が承認したもの）。アプリはこれを公開データより優先して表示する
--   status : 'verified'（今の訳を確認）/ 'edited'（修正して確定）
CREATE TABLE IF NOT EXISTS lexicon_decisions (
  kind            TEXT NOT NULL CHECK (kind IN ('gloss', 'lexicon')),
  target_id       TEXT NOT NULL,
  book_id         TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('verified', 'edited')),
  value           JSONB NOT NULL,
  suggestion_id   INTEGER REFERENCES lexicon_suggestions(id),
  reviewer_email  TEXT NOT NULL,
  reviewer_name   TEXT NOT NULL DEFAULT '',
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kind, target_id)
);

CREATE INDEX IF NOT EXISTS idx_lexicon_decisions_book
  ON lexicon_decisions(book_id, kind);
