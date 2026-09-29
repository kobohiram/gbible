#!/usr/bin/env node
/**
 * 手順6: レビュー画面で書き出した判断（JSON）を反映する
 *
 *   node scripts/ot/apply-review.mjs ~/Downloads/psalms-review.json
 *
 * - 承認        → status: verified
 * - 修正して承認 → 修正内容を保存し status: locked（今後の再生成で上書きされない）
 * - 作り直す    → status: redo（gen-lexicon.mjs を再実行すると作り直される）
 */
import { MASTER_LEXICON, parseArgs, readJson, writeJson } from './lib.mjs';
import { glossPath } from './gen-gloss.mjs';

function main() {
  const { positional } = parseArgs();
  const file = positional[0];
  if (!file) {
    console.error('使い方: node scripts/ot/apply-review.mjs <レビュー画面で書き出した JSON>');
    process.exit(1);
  }
  const { book, decisions } = readJson(file);
  const master = readJson(MASTER_LEXICON, {});
  const glosses = readJson(glossPath(book), {});
  const now = new Date().toISOString();
  const counts = { verified: 0, locked: 0, redo: 0, skipped: 0 };

  for (const [key, d] of Object.entries(decisions)) {
    const [kind, id] = key.split(/:(.+)/);
    const target = kind === 'lex' ? master[id] : glosses[id];
    if (!target) {
      counts.skipped++;
      continue;
    }
    if (d.action === 'ok') {
      target.status = target.status === 'locked' ? 'locked' : 'verified';
      counts.verified++;
    } else if (d.action === 'edit') {
      for (const f of kind === 'lex' ? ['glossJa', 'definitionJa', 'detailJa'] : ['gloss']) {
        if (typeof d[f] === 'string' && d[f]) target[f] = d[f];
      }
      target.status = 'locked';
      counts.locked++;
    } else if (d.action === 'redo' && kind === 'lex') {
      target.status = 'redo';
      counts.redo++;
    }
    target.reviewedAt = now;
  }

  writeJson(MASTER_LEXICON, master);
  writeJson(glossPath(book), glosses);
  console.log(`✓ 反映しました: 承認 ${counts.verified} / 修正 ${counts.locked} / 作り直し ${counts.redo}${counts.skipped ? ` / 対象なし ${counts.skipped}` : ''}`);
  if (counts.redo) console.log(`  作り直し: node scripts/ot/gen-lexicon.mjs ${book}`);
}

main();
