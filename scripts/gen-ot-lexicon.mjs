#!/usr/bin/env node
/**
 * scripts/gen-ot-lexicon.mjs
 *
 * TBESH + Strong's + BDB（Open Scriptures, CC BY 4.0）を元に
 * Claude API で日本語辞書エントリを生成する（新約 gen-lexicon.mjs と同様、本文 JSON とは独立）。
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-ot-lexicon.mjs
 *   node scripts/gen-ot-lexicon.mjs --book genesis          # 創世記の出現語のみ（推奨）
 *   node scripts/gen-ot-lexicon.mjs --book genesis --limit 50
 *   node scripts/gen-ot-lexicon.mjs --strongs H1254,H430
 *   node scripts/gen-ot-lexicon.mjs --bootstrap            # 既存キャッシュを lexicon.json に取り込み（API不要）
 *
 * 出力: public/data/ot/lexicon.json
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data', 'ot');
const CACHE_DIR = join(ROOT, '.ot-cache');
const OUTPUT_PATH = join(DATA_DIR, 'lexicon.json');
const GENESIS_JSON = join(DATA_DIR, 'genesis.json');
const LEXICON_CACHE = join(CACHE_DIR, 'genesis-lexicon-ja.json');
const STUB_LEXICON = join(__dirname, 'genesis-1-stub-lexicon.json');

const TBESH_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt';
const STRONG_URL =
  'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml';
const BDB_URL =
  'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml';
const INDEX_URL =
  'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/LexicalIndex.xml';

function loadEnvLocal() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

// ---------------------------------------------------------------------------
async function fetchCached(url, cacheFile) {
  const cachePath = join(CACHE_DIR, cacheFile);
  if (existsSync(cachePath)) return readFileSync(cachePath, 'utf-8');
  console.log(`  ↓ ${url}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
  const text = await r.text();
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, text, 'utf-8');
  return text;
}

function cleanHtml(html, maxLen = 1200) {
  return html
    .replace(/<BR\s*\/?>/gi, '\n')
    .replace(/<b>([^<]*)<\/b>/gi, '$1')
    .replace(/<ref=[^>]*>([^<]*)<\/ref>/gi, '$1')
    .replace(/<i>([^<]*)<\/i>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLen);
}

function flattenXml(xml) {
  return xml
    .replace(/<ref r="([^"]+)">([^<]*)<\/ref>/gi, (_, r, t) => {
      const label = t.trim() || r.replace(/\./g, ' ').replace(/^(\w+) (\d+) (\d+)$/, '$1 $2:$3');
      return ` [${label}]`;
    })
    .replace(/<w[^>]*>([^<]*)<\/w>/gi, '$1')
    .replace(/<def>([^<]*)<\/def>/gi, '$1')
    .replace(/<pos>([^<]*)<\/pos>/gi, '($1)')
    .replace(/<stem>([^<]*)<\/stem>/gi, '$1: ')
    .replace(/<sense[^>]*>/gi, '\n• ')
    .replace(/<\/sense>/gi, '')
    .replace(/<foreign[^>]*>([^<]*)<\/foreign>/gi, '$1')
    .replace(/<em>([^<]*)<\/em>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseTBESH(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('H')) continue;
    const cols = trimmed.split('\t');
    if (cols.length < 8) continue;
    const eStrong = cols[0].trim();
    const morph = cols[5]?.trim() ?? '';
    if (!morph.startsWith('H:')) continue;
    const num = parseInt(eStrong.slice(1), 10);
    if (isNaN(num)) continue;
    const strongs = 'H' + num;
    if (map.has(strongs)) continue;
    map.set(strongs, {
      strongs,
      lemma: cols[3].trim(),
      translit: cols[4].trim(),
      morph,
      gloss: cols[6].trim(),
      entryText: cleanHtml(cols[7].trim()),
    });
  }
  return map;
}

function parseHebrewStrong(xml) {
  const map = new Map();
  const re = /<entry id="(H\d+)">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const strongs = m[1];
    const block = m[2];
    const lemma = block.match(/<w[^>]*>([^<]*)<\/w>/)?.[1]?.trim() ?? '';
    const translit = block.match(/xlit="([^"]*)"/)?.[1]?.trim() ?? '';
    const pos = block.match(/pos="([^"]*)"/)?.[1]?.trim() ?? '';
    const source = flattenXml(block.match(/<source>([\s\S]*?)<\/source>/)?.[1] ?? '');
    const meaning = flattenXml(block.match(/<meaning>([\s\S]*?)<\/meaning>/)?.[1] ?? '');
    const usage = flattenXml(block.match(/<usage>([\s\S]*?)<\/usage>/)?.[1] ?? '');
    map.set(strongs, { strongs, lemma, translit, pos, source, meaning, usage });
  }
  return map;
}

function parseBDB(xml) {
  const map = new Map();
  const re = /<entry id="([^"]+)"[^>]*>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const id = m[1];
    if (m[2].includes('<status')) {
      const text = flattenXml(m[2].replace(/<status[\s\S]*?<\/status>/g, ''));
      if (text.length > 3) map.set(id, text);
    }
  }
  return map;
}

function parseLexicalIndex(xml) {
  const map = new Map();
  const re = /<entry id="[^"]*">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const xref = block.match(/<xref([^>]*)\/>/);
    if (!xref) continue;
    const attrs = xref[1];
    const strongMatch = attrs.match(/strong="(\d+)"/);
    const bdbMatch = attrs.match(/bdb="([^"]*)"/);
    if (!strongMatch || !bdbMatch) continue;
    const strongs = 'H' + parseInt(strongMatch[1], 10);
    const bdbId = bdbMatch[1];
    const lemma = block.match(/<w[^>]*>([^<]*)<\/w>/)?.[1]?.trim() ?? '';
    const pos = block.match(/<pos>([^<]*)<\/pos>/)?.[1]?.trim() ?? '';
    const def = block.match(/<def>([^<]*)<\/def>/)?.[1]?.trim() ?? '';
    map.set(strongs, { bdbId, lemma, pos, def });
  }
  return map;
}

function morphToPosJa(morph) {
  const t = morph.replace(/^H:/, '').split('-')[0];
  const map = {
    N: '名詞', V: '動詞', A: '形容詞', P: '前置詞', C: '接続詞',
    D: '副詞', T: '冠詞', R: '関係詞', I: '感嘆詞',
  };
  return map[t] ?? morph;
}

function mergeLexiconSources(strongs, tbesh, strong, index, bdbMap) {
  const tb = tbesh.get(strongs);
  const st = strong.get(strongs);
  const idx = index.get(strongs);
  const bdbText = idx ? bdbMap.get(idx.bdbId) ?? '' : '';

  const parts = [];
  if (st?.source) parts.push(`[Strong's 語源] ${st.source}`);
  if (st?.meaning) parts.push(`[Strong's 意味] ${st.meaning}`);
  if (st?.usage) parts.push(`[Strong's 訳語] ${st.usage}`);
  if (tb?.entryText) parts.push(`[TBESH] ${tb.entryText}`);
  if (bdbText) parts.push(`[BDB] ${bdbText}`);
  if (idx?.def && !bdbText.includes(idx.def)) {
    parts.push(`[BDB 見出し] ${idx.def}`);
  }

  const lemma = tb?.lemma ?? st?.lemma ?? idx?.lemma ?? strongs;
  const translit = tb?.translit ?? st?.translit ?? '';
  const gloss = tb?.gloss ?? idx?.def ?? st?.meaning?.slice(0, 60) ?? '';
  const entryText = parts.join('\n\n').slice(0, 2000);

  return { strongs, lemma, translit, gloss, pos: morphToPosJa(tb?.morph ?? st?.pos ?? idx?.pos ?? ''), entryText };
}

function jaToLexiconEntry(strongs, ja, merged) {
  return {
    strongs,
    lemma: merged?.lemma ?? ja?.lemma ?? strongs,
    definitionJa: ja?.definitionJa ?? ja?.glossJa ?? merged?.gloss ?? '',
    detailJa: ja?.detailJa ?? '',
    reviewed: Boolean(ja?.reviewed ?? ja?.detailJa),
    source: 'bdb',
  };
}

function hasDetail(entry) {
  return Boolean(entry?.detailJa?.trim());
}

function loadBootstrapSources() {
  const out = {};
  for (const path of [LEXICON_CACHE, STUB_LEXICON]) {
    if (!existsSync(path)) continue;
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    for (const [strongs, ja] of Object.entries(data)) {
      if (!out[strongs] || hasDetail(ja)) out[strongs] = ja;
    }
  }
  if (existsSync(GENESIS_JSON)) {
    const genesis = JSON.parse(readFileSync(GENESIS_JSON, 'utf-8'));
    for (const [strongs, entry] of Object.entries(genesis.lexicon ?? {})) {
      if (!out[strongs] || hasDetail(entry)) {
        out[strongs] = {
          glossJa: entry.definitionJa,
          definitionJa: entry.definitionJa,
          detailJa: entry.detailJa,
          reviewed: entry.reviewed,
        };
      }
    }
  }
  return out;
}

function strongsFromBook(bookId) {
  const bookPath = join(DATA_DIR, `${bookId}.json`);
  if (!existsSync(bookPath)) {
    console.error(`エラー: ${bookPath} がありません`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(bookPath, 'utf-8'));
  const set = new Set();
  for (const wordList of Object.values(data.words ?? {})) {
    for (const w of wordList) {
      if (w.strongs && w.strongs !== 'H0') set.add(w.strongs);
    }
  }
  return set;
}

async function callClaude(model, system, user, apiKey, maxTokens = 4096) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (r.status === 429 || r.status === 529) {
      const wait = (attempt + 1) * 12000;
      console.log(`    レート制限 → ${wait / 1000}秒待機...`);
      await new Promise((res) => setTimeout(res, wait));
      continue;
    }
    if (!r.ok) throw new Error(`Claude API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data.content?.[0]?.text ?? '';
  }
  throw new Error('Claude API: リトライ上限');
}

const SYSTEM_PROMPT =
  'あなたは旧約聖書ヘブル語の専門辞書編纂者です。' +
  'TBESH（Tyndale House, CC BY 4.0）、Strong\'s Hebrew Dictionary、' +
  'Brown-Driver-Briggs（Open Scriptures, CC BY 4.0）の英語資料をもとに、' +
  'ギリシャ語版 Gbible と同品質の日本語辞書エントリを JSON 形式で作成します。' +
  '聖書箇所は和訳書名＋章:節（例: 創12:1）で表記します。';

async function generateBatchEntries(batch, apiKey) {
  const input = batch
    .map(({ strongs, lemma, translit, gloss, entryText }) =>
      JSON.stringify({
        strongs, lemma, translit, gloss,
        entry: entryText.replace(/\n/g, ' ').replace(/"/g, "'").slice(0, 900),
      }),
    )
    .join('\n');

  const user = `以下のヘブル語単語について、英語辞典資料をもとに日本語辞書エントリを作成してください。

入力（各行 JSON）:
${input}

要件:
- glossJa: 短い訳語（1〜4語）
- definitionJa: 核心的意味（15字以内）
- detailJa: 語源・主要用法を①②③で整理。旧約聖書箇所を付記（例: 創12:1）。150〜300字。

出力: JSON 配列のみ
[{"strongs":"H1234","glossJa":"...","definitionJa":"...","detailJa":"..."},...]`;

  const text = await callClaude('claude-haiku-4-5-20251001', SYSTEM_PROMPT, user, apiKey, 4096);
  const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] ?? '[]';
  try {
    return JSON.parse(jsonStr);
  } catch {
    console.warn('    JSON パース失敗、スキップ');
    return [];
  }
}

function saveLexicon(existing, bookId = null) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 0), 'utf-8');
  if (bookId) syncBookGloss(bookId, existing);
}

function syncBookGloss(bookId, lexicon) {
  const bookPath = join(DATA_DIR, `${bookId}.json`);
  if (!existsSync(bookPath)) return;
  const book = JSON.parse(readFileSync(bookPath, 'utf-8'));
  let glossCount = 0;
  for (const wordList of Object.values(book.words ?? {})) {
    for (const w of wordList) {
      const entry = lexicon[w.strongs];
      if (entry?.definitionJa) {
        w.glossJa = entry.definitionJa;
        glossCount++;
      }
    }
  }
  for (const [strongs, entry] of Object.entries(lexicon)) {
    if (!book.lexicon[strongs]) continue;
    if (entry.detailJa || entry.definitionJa) {
      book.lexicon[strongs] = { ...book.lexicon[strongs], ...entry };
    }
  }
  writeFileSync(bookPath, JSON.stringify(book), 'utf-8');
  console.log(`  → ${bookId}.json の訳語を同期 (${glossCount} 箇所)`);
}

async function main() {
  const args = process.argv.slice(2);
  const bootstrapOnly = args.includes('--bootstrap');
  const bookArg = args.findIndex((a) => a === '--book');
  const bookId = bookArg !== -1 ? args[bookArg + 1] : null;
  const limitArg = args.findIndex((a) => a === '--limit');
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
  const strongsArg = args.findIndex((a) => a === '--strongs');
  const strongsFilter = strongsArg !== -1
    ? new Set(args[strongsArg + 1].split(',').map((s) => s.trim()))
    : null;

  console.log('\n=== Gbible 旧約辞書生成 (TBESH + BDB → 日本語) ===');
  if (bookId) console.log(`モード: ${bookId} の出現語`);
  else if (strongsFilter) console.log(`モード: 指定語 ${[...strongsFilter].join(', ')}`);
  else console.log('モード: TBESH 全ヘブル語');
  if (limit !== Infinity) console.log(`上限: ${limit} 語`);

  let existing = {};
  if (existsSync(OUTPUT_PATH)) {
    try { existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')); } catch { /* */ }
  }
  const bootstrap = loadBootstrapSources();
  for (const [strongs, ja] of Object.entries(bootstrap)) {
    const merged = { lemma: ja.lemma };
    const entry = jaToLexiconEntry(strongs, ja, merged);
    if (!existing[strongs] || (hasDetail(entry) && !hasDetail(existing[strongs]))) {
      existing[strongs] = entry;
    }
  }
  console.log(`\n既存 lexicon.json: ${Object.keys(existing).length} エントリ（キャッシュ取込済み）`);

  if (bootstrapOnly) {
    saveLexicon(existing, bookId);
    const kb = Math.round(Buffer.byteLength(JSON.stringify(existing)) / 1024);
    console.log(`\n完了: ${Object.keys(existing).length} エントリ → ${OUTPUT_PATH} (${kb} KB)`);
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('\nエラー: ANTHROPIC_API_KEY が未設定です（--bootstrap なら不要）');
    process.exit(1);
  }

  console.log('\n[1/3] 辞典ソースを読み込み中...');
  const [tbeshText, strongXml, bdbXml, indexXml] = await Promise.all([
    fetchCached(TBESH_URL, 'tbesh.txt'),
    fetchCached(STRONG_URL, 'hebrew-strong.xml'),
    fetchCached(BDB_URL, 'bdb.xml'),
    fetchCached(INDEX_URL, 'lexical-index.xml'),
  ]);
  const tbeshMap = parseTBESH(tbeshText);
  const strongMap = parseHebrewStrong(strongXml);
  const bdbMap = parseBDB(bdbXml);
  const indexMap = parseLexicalIndex(indexXml);
  console.log(`  TBESH ${tbeshMap.size} / Strong ${strongMap.size} / BDB ${bdbMap.size}`);

  let targetStrongs;
  if (strongsFilter) {
    targetStrongs = [...strongsFilter];
  } else if (bookId) {
    targetStrongs = [...strongsFromBook(bookId)];
  } else {
    targetStrongs = [...tbeshMap.keys()];
  }

  const todo = targetStrongs
    .filter((s) => s !== 'H0')
    .filter((s) => !hasDetail(existing[s]))
    .map((s) => mergeLexiconSources(s, tbeshMap, strongMap, indexMap, bdbMap))
    .filter((e) => e.entryText.length > 0 || e.gloss)
    .slice(0, limit === Infinity ? undefined : limit);

  const withDetail = targetStrongs.filter((s) => hasDetail(existing[s])).length;
  console.log(`\n[2/3] 対象 ${targetStrongs.length} 語 / 詳細あり ${withDetail} / 未生成 ${todo.length}`);

  if (todo.length === 0) {
    saveLexicon(existing, bookId);
    console.log('\n詳細辞書はすべて揃っています。');
    return;
  }

  const BATCH = 8;
  console.log(`\n[3/3] Haiku で生成中（${BATCH}語/バッチ）...`);
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const progress = `${i + 1}〜${Math.min(i + BATCH, todo.length)}/${todo.length}`;
    process.stdout.write(`  バッチ ${progress}... `);

    try {
      const results = await generateBatchEntries(chunk, apiKey);
      for (const r of results) {
        if (!r?.strongs) continue;
        const merged = mergeLexiconSources(r.strongs, tbeshMap, strongMap, indexMap, bdbMap);
        existing[r.strongs] = jaToLexiconEntry(r.strongs, r, merged);
      }
      console.log(`✓ (${results.length}語)`);
    } catch (e) {
      console.log(`✗ (${e.message.slice(0, 60)})`);
    }

    saveLexicon(existing, bookId);
    if (i + BATCH < todo.length) await new Promise((res) => setTimeout(res, 800));
  }

  const total = Object.keys(existing).length;
  const kb = Math.round(Buffer.byteLength(JSON.stringify(existing)) / 1024);
  console.log(`\n完了: ${total} エントリ → ${OUTPUT_PATH} (${kb} KB)`);
  const remaining = targetStrongs.filter((s) => !hasDetail(existing[s]) && s !== 'H0').length;
  if (remaining > 0) {
    console.log(`残り ${remaining} 語。続き: node scripts/gen-ot-lexicon.mjs${bookId ? ` --book ${bookId}` : ''}${limit !== Infinity ? ` --limit ${limit}` : ''}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
