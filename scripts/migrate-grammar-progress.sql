-- Grammar progress table
-- Run this on the Neon DB (Vercel dashboard > Storage > Neon > SQL Editor)

CREATE TABLE IF NOT EXISTS grammar_progress (
  id              SERIAL PRIMARY KEY,
  user_email      TEXT    NOT NULL,
  chapter_number  INTEGER NOT NULL,
  lesson_number   INTEGER NOT NULL,
  balloon_index   INTEGER NOT NULL DEFAULT 0,
  passed          BOOLEAN NOT NULL DEFAULT false,
  passed_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_email, chapter_number, lesson_number, balloon_index)
);

CREATE INDEX IF NOT EXISTS idx_grammar_progress_user
  ON grammar_progress(user_email, chapter_number);

-- Migration from old schema (if the table already exists without balloon_index):
-- ALTER TABLE grammar_progress ADD COLUMN IF NOT EXISTS balloon_index INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE grammar_progress DROP CONSTRAINT IF EXISTS grammar_progress_user_email_chapter_number_lesson_number_key;
-- ALTER TABLE grammar_progress ADD CONSTRAINT grammar_progress_unique UNIQUE (user_email, chapter_number, lesson_number, balloon_index);
