#!/usr/bin/env node
/**
 * Gbible bot（チャット）用の検索索引を作る
 *
 *   node scripts/build-chat-index.mjs
 *
 * 出力: public/data/search/
 *   lexicon.json … 見出し語の一覧 [strongs, 見出し語, 短い訳, 中心的な意味, 出現回数, 書の数]
 *   verses.json  … 節ごとの Strong's と語ごとの訳 { 書ID: { "章:節": [Strong's の並び, 訳の並び] } }
 * 本文データ（public/data/nt, public/data/ot）を更新したら作り直す。
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'public', 'data');
const OUT = join(DATA, 'search');

const published = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'ot-published.json'), 'utf-8'));

function readBook(corpus, id) {
  const path = join(DATA, corpus, `${id}.json`);
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf-8')) : null;
}

const ntBooks = readdirSync(join(DATA, 'nt'))
  .filter((f) => f.endsWith('.json') && !['lexicon.json', 'concordance.json'].includes(f))
  .map((f) => f.replace('.json', ''));
const otBooks = Object.keys(published);

const verses = {};
const freq = new Map(); // strongs → { n, books:Set, glosses: Map }
const lexicon = new Map(); // strongs → { lemma, def }

function addWord(bookId, w, gloss) {
  if (!w.strongs || w.strongs === 'H0' || w.strongs === 'G0') return;
  const f = freq.get(w.strongs) ?? { n: 0, books: new Set(), glosses: new Map() };
  f.n++;
  f.books.add(bookId);
  if (gloss) f.glosses.set(gloss, (f.glosses.get(gloss) ?? 0) + 1);
  freq.set(w.strongs, f);
}

for (const [corpus, ids] of [['nt', ntBooks], ['ot', otBooks]]) {
  for (const id of ids) {
    const data = readBook(corpus, id);
    if (!data) continue;
    const chapters = corpus === 'ot' ? new Set(published[id].chapters) : null;
    const book = {};
    for (const [key, ws] of Object.entries(data.words)) {
      if (chapters && !chapters.has(Number(key.split(':')[0]))) continue;
      const strongs = ws.map((w) => w.strongs).join(' ');
      const glosses = ws.map((w) => (w.ctxGloss || w.glossJa || '').replace(/\s+/g, '')).join(' ');
      book[key] = [strongs, glosses];
      for (const w of ws) addWord(id, w, (w.glossJa || '').trim());
    }
    verses[id] = book;
    for (const e of Object.values(data.lexicon ?? {})) {
      if (!lexicon.has(e.strongs)) lexicon.set(e.strongs, { lemma: e.lemma, def: e.definitionJa ?? '' });
    }
  }
}

// 新約の共通辞書（書ごとの辞書より詳しい）
const ntLex = JSON.parse(readFileSync(join(DATA, 'nt', 'lexicon.json'), 'utf-8'));
for (const e of Object.values(ntLex)) {
  lexicon.set(e.strongs, { lemma: e.lemma, def: e.definitionJa ?? '' });
}

const rows = [];
for (const [s, f] of freq) {
  const lex = lexicon.get(s);
  const topGloss = [...f.glosses.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([g]) => g).join('・');
  rows.push([s, lex?.lemma ?? '', topGloss, (lex?.def ?? '').slice(0, 60), f.n, f.books.size]);
}
rows.sort((a, b) => b[4] - a[4]);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'lexicon.json'), JSON.stringify(rows));
writeFileSync(join(OUT, 'verses.json'), JSON.stringify(verses));
const kb = (p) => Math.round(readFileSync(join(OUT, p)).length / 1024);
console.log(`✓ 見出し語 ${rows.length} 語（${kb('lexicon.json')} KB）/ 書 ${Object.keys(verses).length}（新約 ${ntBooks.length}・旧約 ${otBooks.length}）/ 節 ${Object.values(verses).reduce((n, b) => n + Object.keys(b).length, 0)}（${kb('verses.json')} KB）`);
