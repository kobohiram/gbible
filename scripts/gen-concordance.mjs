#!/usr/bin/env node
/**
 * scripts/gen-concordance.mjs
 *
 * MorphGNT 全27書から Strong's 番号ごとの出現回数を集計し
 * public/data/nt/concordance.json を生成する。
 *
 * 使い方: node scripts/gen-concordance.mjs
 *
 * 出力形式:
 *   { "G2316": { "total": 1317, "books": { "john": 83, "matthew": 51, ... } }, ... }
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data', 'nt');
const CACHE_DIR = join(ROOT, '.nt-cache');

const NT_BOOKS = [
  { file: '61-Mt',  id: 'matthew' },
  { file: '62-Mk',  id: 'mark' },
  { file: '63-Lk',  id: 'luke' },
  { file: '64-Jn',  id: 'john' },
  { file: '65-Ac',  id: 'acts' },
  { file: '66-Ro',  id: 'romans' },
  { file: '67-1Co', id: '1corinthians' },
  { file: '68-2Co', id: '2corinthians' },
  { file: '69-Ga',  id: 'galatians' },
  { file: '70-Eph', id: 'ephesians' },
  { file: '71-Php', id: 'philippians' },
  { file: '72-Col', id: 'colossians' },
  { file: '73-1Th', id: '1thessalonians' },
  { file: '74-2Th', id: '2thessalonians' },
  { file: '75-1Ti', id: '1timothy' },
  { file: '76-2Ti', id: '2timothy' },
  { file: '77-Tit', id: 'titus' },
  { file: '78-Phm', id: 'philemon' },
  { file: '79-Heb', id: 'hebrews' },
  { file: '80-Jas', id: 'james' },
  { file: '81-1Pe', id: '1peter' },
  { file: '82-2Pe', id: '2peter' },
  { file: '83-1Jn', id: '1john' },
  { file: '84-2Jn', id: '2john' },
  { file: '85-3Jn', id: '3john' },
  { file: '86-Jud', id: 'jude' },
  { file: '87-Re',  id: 'revelation' },
];

const MORPHGNT_BASE = 'https://raw.githubusercontent.com/morphgnt/sblgnt/master';
const STRONGS_XML_URL = 'https://raw.githubusercontent.com/morphgnt/strongs-dictionary-xml/master/strongsgreek.xml';

async function fetchCached(url, cacheFile) {
  const cachePath = join(CACHE_DIR, cacheFile);
  if (existsSync(cachePath)) {
    return readFileSync(cachePath, 'utf-8');
  }
  console.log(`  ↓ ${url}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  const text = await r.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, text, 'utf-8');
  return text;
}

function buildStrongsMap(xml) {
  const map = new Map();
  const stripMap = new Map();
  let currentStrongs = null;
  for (const line of xml.split('\n')) {
    const em = line.match(/strongs="(\d+)"/);
    if (em) currentStrongs = 'G' + parseInt(em[1], 10);
    const gm = line.match(/unicode="([^"]+)"/);
    if (gm && currentStrongs) {
      const lemma = gm[1].toLowerCase().normalize('NFC');
      if (!map.has(lemma)) map.set(lemma, currentStrongs);
      const stripped = lemma.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (!stripMap.has(stripped)) stripMap.set(stripped, currentStrongs);
    }
  }
  return { map, stripMap };
}

function lookupStrongs(lemma, map, stripMap) {
  const key = lemma.toLowerCase().normalize('NFC');
  const stripped = key.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return map.get(key) ?? stripMap.get(stripped) ?? 'G0';
}

async function main() {
  console.log('Strong\'s XML をダウンロード中...');
  const xml = await fetchCached(STRONGS_XML_URL, 'strongs.xml');
  const { map: strongsMap, stripMap } = buildStrongsMap(xml);
  console.log(`  ${strongsMap.size} エントリ読み込み`);

  // concordance: strongs → { total, books: { bookId: count } }
  const concordance = {};

  for (const book of NT_BOOKS) {
    const url = `${MORPHGNT_BASE}/${book.file}-morphgnt.txt`;
    const text = await fetchCached(url, `${book.file}-morphgnt.txt`);

    let bookTotal = 0;
    for (const line of text.split('\n')) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 7) continue;
      const lemma = parts[6];
      const strongs = lookupStrongs(lemma, strongsMap, stripMap);

      if (!concordance[strongs]) {
        concordance[strongs] = { total: 0, books: {} };
      }
      concordance[strongs].total++;
      concordance[strongs].books[book.id] = (concordance[strongs].books[book.id] ?? 0) + 1;
      bookTotal++;
    }
    console.log(`  ${book.id}: ${bookTotal} 語`);
  }

  mkdirSync(DATA_DIR, { recursive: true });
  const outPath = join(DATA_DIR, 'concordance.json');
  writeFileSync(outPath, JSON.stringify(concordance), 'utf-8');

  const size = (readFileSync(outPath).length / 1024).toFixed(0);
  console.log(`\n完了: ${outPath}`);
  console.log(`  Strong's エントリ数: ${Object.keys(concordance).length}`);
  console.log(`  ファイルサイズ: ${size} KB`);

  // 確認: θεός (G2316) の出現数
  const theos = concordance['G2316'];
  if (theos) {
    console.log(`  G2316 (θεός) 新約全体: ${theos.total}回, ヨハネ: ${theos.books.john ?? 0}回`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
