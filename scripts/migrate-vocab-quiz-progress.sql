-- Vocabulary quiz progress (per word learned)
-- Run on Neon DB (Vercel dashboard > Storage > Neon > SQL Editor)

CREATE TABLE IF NOT EXISTS vocab_quiz_progress (
  id          SERIAL PRIMARY KEY,
  user_email  TEXT NOT NULL,
  word_id     TEXT NOT NULL,
  learned     BOOLEAN NOT NULL DEFAULT true,
  learned_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_email, word_id)
);

CREATE INDEX IF NOT EXISTS idx_vocab_quiz_progress_user
  ON vocab_quiz_progress(user_email);
