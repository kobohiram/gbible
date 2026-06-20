#!/usr/bin/env node
/**
 * lexicon.json / genesis.json の glossJa を 2ペイン向けの短い訳語に同期する。
 * definitionJa・detailJa（3ペイン辞書）は変更しない。
 *   node scripts/sync-ot-short-gloss.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractPaneGloss } from './ot-pane-gloss.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'public', 'data', 'ot');
const LEXICON_PATH = join(DATA, 'lexicon.json');
const GENESIS_PATH = join(DATA, 'genesis.json');
const STUB_PATH = join(__dirname, 'genesis-1-stub-lexicon.json');

const stub = JSON.parse(readFileSync(STUB_PATH, 'utf-8'));
const lexicon = JSON.parse(readFileSync(LEXICON_PATH, 'utf-8'));

let updated = 0;
for (const entry of Object.values(lexicon)) {
  const short = extractPaneGloss(entry, stub[entry.strongs]?.glossJa);
  if (short && entry.glossJa !== short) {
    entry.glossJa = short;
    updated++;
  }
}
writeFileSync(LEXICON_PATH, JSON.stringify(lexicon));

const genesis = JSON.parse(readFileSync(GENESIS_PATH, 'utf-8'));
let synced = 0;
for (const wordList of Object.values(genesis.words)) {
  for (const w of wordList) {
    const entry = lexicon[w.strongs];
    if (!entry?.glossJa) continue;
    if (w.glossJa !== entry.glossJa) {
      w.glossJa = entry.glossJa;
      synced++;
    }
  }
}
writeFileSync(GENESIS_PATH, JSON.stringify(genesis));
console.log(`glossJa 更新: ${updated} / genesis 同期: ${synced} 箇所`);
