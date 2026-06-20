#!/usr/bin/env node
/**
 * lexicon.json に glossJa（短い訳語）を付与し、genesis.json の glossJa を同期する。
 *   node scripts/sync-ot-short-gloss.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'public', 'data', 'ot');
const LEXICON_PATH = join(DATA, 'lexicon.json');
const GENESIS_PATH = join(DATA, 'genesis.json');

const COMMON_GLOSS = {
  H1004: '家',
  H776: '地',
  H8064: '天',
  H430: '神',
  H853: '（対格）',
  H854: 'と共に',
  H5921: '〜に',
  H413: '〜へ',
};

function extractShortGloss(entry) {
  if (COMMON_GLOSS[entry.strongs]) return COMMON_GLOSS[entry.strongs];
  if (entry.glossJa?.trim() && !looksLikeVerseFragment(entry.glossJa.trim())) {
    return entry.glossJa.trim();
  }
  const def = entry.definitionJa?.trim() ?? '';
  if (def && def.length <= 18 && !def.includes('。')) return def.split('、')[0] ?? def;
  const literal = entry.detailJa?.match(/字義的には([^\s、。]{1,6})/);
  if (literal) return literal[1];
  const quoted = entry.detailJa?.match(/「([^」]{1,8})」/g);
  if (quoted) {
    for (const q of quoted) {
      const inner = q.match(/「([^」]+)」/)?.[1]?.trim();
      if (inner && inner.length <= 8 && !looksLikeVerseFragment(inner)) return inner;
    }
  }
  if (def) {
    const first = def.split(/[。、]/)[0] ?? '';
    return first.length <= 10 ? first : first.slice(0, 10);
  }
  return '';
}

function looksLikeVerseFragment(text) {
  return /[にへでをがはと]$/.test(text) || /\d+:\d+/.test(text);
}

const lexicon = JSON.parse(readFileSync(LEXICON_PATH, 'utf-8'));
let added = 0;
for (const entry of Object.values(lexicon)) {
  const g = extractShortGloss(entry);
  if (g && entry.glossJa !== g) {
    entry.glossJa = g;
    added++;
  }
}
writeFileSync(LEXICON_PATH, JSON.stringify(lexicon));

const genesis = JSON.parse(readFileSync(GENESIS_PATH, 'utf-8'));
let synced = 0;
for (const wordList of Object.values(genesis.words)) {
  for (const w of wordList) {
    const entry = lexicon[w.strongs];
    if (!entry) continue;
    const short = entry.glossJa || extractShortGloss(entry);
    if (short) {
      w.glossJa = short;
      synced++;
    }
  }
}
writeFileSync(GENESIS_PATH, JSON.stringify(genesis));
console.log(`glossJa 追加: ${added} / 同期: ${synced} 箇所`);
