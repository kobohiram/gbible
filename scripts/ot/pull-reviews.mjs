#!/usr/bin/env node
/**
 * みんなで作る辞書で確定した内容（lexicon_decisions）を、元データに取り込む
 *
 *   node scripts/ot/pull-reviews.mjs            # 取り込み
 *   node scripts/ot/pull-reviews.mjs --dry-run  # 件数だけ表示
 *
 * - 確認（verified）→ status: verified
 * - 修正して確定（edited）→ 内容を差し替えて status: locked（再生成で上書きされない）
 * 取り込んだ後に publish.mjs で書き出すと、公開データにも「確認済み」が入る。
 * データベースの内容は変更しない（読むだけ）。
 */
import { neon } from '@neondatabase/serverless';
import { glossPath } from './gen-gloss.mjs';
import { MASTER_LEXICON, loadEnvLocal, parseArgs, readJson, writeJson } from './lib.mjs';

async function main() {
  const { flags } = parseArgs();
  loadEnvLocal();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL が見つかりません（.env.local に設定してください）。');
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    SELECT kind, target_id, book_id, status, value, reviewer_name, decided_at
    FROM lexicon_decisions ORDER BY decided_at
  `;

  const master = readJson(MASTER_LEXICON, {});
  const glossByBook = new Map();
  const counts = { gloss: 0, lexicon: 0, missing: 0 };

  for (const d of rows) {
    const meta = { reviewedBy: d.reviewer_name, reviewedAt: new Date(d.decided_at).toISOString() };
    if (d.kind === 'lexicon') {
      const e = master[d.target_id];
      if (!e) {
        counts.missing++;
        continue;
      }
      if (d.status === 'edited') Object.assign(e, d.value, { status: 'locked' }, meta);
      else if (e.status !== 'locked') Object.assign(e, { status: 'verified' }, meta);
      counts.lexicon++;
    } else {
      if (!glossByBook.has(d.book_id)) glossByBook.set(d.book_id, readJson(glossPath(d.book_id), {}));
      const glosses = glossByBook.get(d.book_id);
      const g = glosses[d.target_id];
      if (!g) {
        counts.missing++;
        continue;
      }
      if (d.status === 'edited') Object.assign(g, { gloss: d.value.gloss, status: 'locked' }, meta);
      else if (g.status !== 'locked') Object.assign(g, { status: 'verified' }, meta);
      counts.gloss++;
    }
  }

  console.log(`確定した内容: 文脈訳 ${counts.gloss} / 辞書 ${counts.lexicon}${counts.missing ? ` / 元データにない対象 ${counts.missing}` : ''}`);
  if (flags['dry-run']) return;
  writeJson(MASTER_LEXICON, master);
  for (const [bookId, glosses] of glossByBook) writeJson(glossPath(bookId), glosses);
  console.log(`✓ 取り込みました。公開データに反映するには publish.mjs を実行してください（例: node scripts/ot/publish.mjs ${[...glossByBook.keys()][0] ?? 'psalms'} --chapters …）`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
