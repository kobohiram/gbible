#!/usr/bin/env node
/**
 * scripts/generate-ot-data.mjs
 *
 * OSHB（本文・形態論）+ TBESH + OpenScriptures（Strong's + BDB）→ Claude API で日本語化
 * → public/data/ot/[bookId].json
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-ot-data.mjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-ot-data.mjs genesis
 *   node scripts/generate-ot-data.mjs --use-cache genesis
 *   node scripts/generate-ot-data.mjs --use-cache genesis --from 2 --to 11  # 2〜11章を追加
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-ot-data.mjs --lexicon-only genesis  # 辞書のみ生成
 *   node scripts/generate-ot-data.mjs --lexicon-only genesis --limit 50  # 50語ずつ
 *   node scripts/generate-ot-data.mjs --export-sources genesis  # 英語ソースを .ot-cache に出力
 */

import {
  writeFileSync, mkdirSync, existsSync, readFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** .env.local を読み込む（Next.js と同じ場所・gitignore 済み） */
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

const DATA_DIR = join(ROOT, 'public', 'data', 'ot');
const CACHE_DIR = join(ROOT, '.ot-cache');

const TBESH_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt';
const STRONG_URL =
  'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml';
const BDB_URL =
  'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml';
const INDEX_URL =
  'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/LexicalIndex.xml';

const OSHB_BOOKS = {
  genesis: { id: 'genesis', file: 'Gen.xml', osis: 'Gen', name: '創世記', chapters: 50 },
};

const LEXICON_CACHE = join(CACHE_DIR, 'genesis-lexicon-ja.json');
const STUB_LEXICON = join(__dirname, 'genesis-1-stub-lexicon.json');
const SOURCES_EXPORT = join(CACHE_DIR, 'genesis-lexicon-sources.json');

// 創世記1章：神学的・文脈上重要な語は Sonnet で詳細生成
const GENESIS_1_SONNET = new Set([
  'H7225', 'H1254', 'H430', 'H776', 'H8414', 'H922', 'H7307', 'H1961',
  'H216', 'H2822', 'H8064', 'H4325', 'H7200', 'H2896', 'H6213', 'H914',
  'H2506', 'H3117', 'H3915', 'H2233', 'H6212', 'H6754', 'H5315', 'H2416',
  'H1876', 'H6509', 'H7430', 'H5775', 'H120', 'H127', 'H559', 'H1288',
  'H7121', 'H3588', 'H3605', 'H834', 'H853', 'H5921', 'H6440', 'H996',
  'H8478', 'H8432', 'H5921', 'H3117', 'H3915',
]);

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
    'N': '名詞', 'V': '動詞', 'A': '形容詞', 'P': '前置詞', 'C': '接続詞',
    'D': '副詞', 'T': '冠詞', 'R': '関係詞', 'I': '感嘆詞',
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
  const rich = entryText.length >= 200;

  return {
    strongs,
    lemma,
    translit,
    gloss,
    pos: morphToPosJa(tb?.morph ?? st?.pos ?? idx?.pos ?? ''),
    entryText,
    rich,
    sourceLen: entryText.length,
  };
}

function lemmaToStrongs(lemma) {
  const parts = lemma.split('/');
  const last = parts[parts.length - 1].trim();
  const num = parseInt(last.split(/\s+/)[0], 10);
  return isNaN(num) ? 'H0' : 'H' + num;
}

function normalizeHebrewText(raw) {
  return raw.replace(/\//g, '').trim();
}

function parseOshbChapter(xml, osisPrefix, chapter) {
  const verses = new Map();
  const re = new RegExp(
    `<verse osisID="${osisPrefix}\\.${chapter}\\.(\\d+)">([\\s\\S]*?)<\\/verse>`,
    'g',
  );
  let m;
  while ((m = re.exec(xml)) !== null) {
    const verse = parseInt(m[1], 10);
    const inner = m[2];
    const words = [];
    const wRe = /<w lemma="([^"]+)"[^>]* morph="([^"]+)"[^>]*>([^<]*)<\/w>/g;
    let wm;
    while ((wm = wRe.exec(inner)) !== null) {
      words.push({
        lemma: wm[1],
        morph: wm[2],
        text: normalizeHebrewText(wm[3]),
      });
    }
    verses.set(verse, words);
  }
  return verses;
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
  '聖書箇所は創世記を中心に、和訳書名＋章:節（例: 創12:1）で表記します。';

async function generateDetailedEntry(entry, apiKey) {
  const { strongs, lemma, translit, gloss, entryText } = entry;
  const user = `ヘブル語「${lemma}」（${translit}、Strong's ${strongs}）の詳細な日本語辞書エントリを作成してください。

【英語辞典資料（TBESH + Strong's + BDB, CC BY 4.0）】
${entryText}

要件:
- glossJa: 短い訳語（1〜4語）
- definitionJa: 核心的意味（15字以内）
- detailJa: 語源・主要用法を①②③…で整理。各用法に旧約聖書箇所を付記（例: 創1:2, エレ4:23）。創世記1章の文脈があれば丁寧に説明。300〜450字。

JSONのみ出力:
{"strongs":"${strongs}","glossJa":"...","definitionJa":"...","detailJa":"..."}`;

  const text = await callClaude('claude-sonnet-4-6', SYSTEM_PROMPT, user, apiKey, 1024);
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error(`JSON 抽出失敗 (${strongs})`);
  return JSON.parse(json);
}

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
- detailJa: 語源・主要用法を①②③で整理。旧約聖書箇所を付記（例: 創1:1）。150〜300字。創世記1章の文脈があれば触れる。

出力: JSON 配列のみ
[{"strongs":"H1234","glossJa":"...","definitionJa":"...","detailJa":"..."},...]`;

  const text = await callClaude('claude-haiku-4-5-20251001', SYSTEM_PROMPT, user, apiKey, 4096);
  const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] ?? '[]';
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn('  JSON パース失敗:', e.message);
    return [];
  }
}

async function generateLexiconJa(entries, apiKey) {
  const results = {};
  const list = [...entries].filter((e) => e.entryText.length > 0 || e.gloss);

  const sonnetList = list.filter((e) =>
    GENESIS_1_SONNET.has(e.strongs) || e.entryText.length < 180,
  );
  const haikuList = list.filter((e) => !sonnetList.includes(e));

  console.log(`  Sonnet（詳細）: ${sonnetList.length} 語 / Haiku（一括）: ${haikuList.length} 語`);

  for (let i = 0; i < sonnetList.length; i++) {
    const entry = sonnetList[i];
    console.log(`  Sonnet ${i + 1}/${sonnetList.length}: ${entry.strongs} ${entry.lemma}`);
    try {
      const item = await generateDetailedEntry(entry, apiKey);
      if (item.strongs) results[item.strongs] = item;
    } catch (e) {
      console.warn(`    失敗: ${e.message}`);
    }
    if (i + 1 < sonnetList.length) await new Promise((r) => setTimeout(r, 1200));
  }

  const BATCH = 8;
  for (let i = 0; i < haikuList.length; i += BATCH) {
    const batch = haikuList.slice(i, i + BATCH);
    console.log(`  Haiku: ${i + 1}〜${Math.min(i + BATCH, haikuList.length)} / ${haikuList.length}`);
    const arr = await generateBatchEntries(batch, apiKey);
    for (const item of arr) {
      if (item.strongs) results[item.strongs] = item;
    }
    if (i + BATCH < haikuList.length) await new Promise((r) => setTimeout(r, 800));
  }

  return results;
}

function loadLexiconJa(existingLexicon = null) {
  const merged = { ...(existingLexicon ?? {}) };
  if (existsSync(LEXICON_CACHE)) {
    console.log('  キャッシュ辞書を使用:', LEXICON_CACHE);
    Object.assign(merged, JSON.parse(readFileSync(LEXICON_CACHE, 'utf-8')));
  } else if (existsSync(STUB_LEXICON)) {
    console.log('  スタブ辞書を使用:', STUB_LEXICON);
    Object.assign(merged, JSON.parse(readFileSync(STUB_LEXICON, 'utf-8')));
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function parseChapterRange(args) {
  const fromIdx = args.indexOf('--from');
  const toIdx = args.indexOf('--to');
  const from = fromIdx >= 0 ? parseInt(args[fromIdx + 1], 10) : null;
  const to = toIdx >= 0 ? parseInt(args[toIdx + 1], 10) : null;
  if (from != null && to != null) return { from, to };
  const nums = args.filter((a) => /^\d+$/.test(a)).map((a) => parseInt(a, 10));
  if (nums.length >= 2) return { from: nums[0], to: nums[1] };
  if (nums.length === 1) return { from: nums[0], to: nums[0] };
  return { from: 1, to: 1 };
}

function jaEntryHasDetail(ja) {
  return Boolean(ja?.detailJa?.trim());
}

function applyJaToLexicon(lexiconObj, strongs, ja, merged) {
  const prev = lexiconObj[strongs] ?? {};
  lexiconObj[strongs] = {
    strongs,
    lemma: prev.lemma ?? merged?.lemma ?? ja?.lemma ?? strongs,
    definitionJa: ja?.definitionJa ?? ja?.glossJa ?? prev.definitionJa ?? merged?.gloss ?? '',
    detailJa: ja?.detailJa ?? prev.detailJa,
    reviewed: Boolean(ja?.detailJa ?? prev.reviewed),
    source: prev.source ?? 'bdb',
  };
}

function applyJaToWords(wordsObj, strongs, ja) {
  const gloss = ja?.glossJa ?? ja?.definitionJa;
  if (!gloss) return;
  for (const wordList of Object.values(wordsObj)) {
    for (const w of wordList) {
      if (w.strongs === strongs) w.glossJa = gloss;
    }
  }
}

async function generateLexiconOnly(book, apiKey, limit = 0) {
  const outPath = join(DATA_DIR, `${book.id}.json`);
  if (!existsSync(outPath)) {
    console.error(`エラー: ${outPath} がありません。先に本文データを生成してください。`);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(outPath, 'utf-8'));
  const strongsNeeded = new Set();
  for (const wordList of Object.values(data.words)) {
    for (const w of wordList) {
      if (w.strongs && w.strongs !== 'H0') strongsNeeded.add(w.strongs);
    }
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

  const lexiconJa = loadLexiconJa(data.lexicon) ?? { ...(data.lexicon ?? {}) };
  const missing = [...strongsNeeded]
    .filter((s) => !jaEntryHasDetail(lexiconJa[s]) && !jaEntryHasDetail(data.lexicon[s]))
    .map((s) => mergeLexiconSources(s, tbeshMap, strongMap, indexMap, bdbMap))
    .filter((e) => e.entryText.length > 0 || e.gloss);

  const withDetail = [...strongsNeeded].filter(
    (s) => jaEntryHasDetail(lexiconJa[s]) || jaEntryHasDetail(data.lexicon[s]),
  ).length;

  console.log(`  対象語 ${strongsNeeded.size} / 詳細辞書あり ${withDetail} / 未生成 ${missing.length}`);
  if (missing.length === 0) {
    console.log('\n詳細辞書はすべて揃っています。');
    return;
  }

  const batch = limit > 0 ? missing.slice(0, limit) : missing;
  console.log(`\n[2/3] 日本語辞書を生成中... (${batch.length} 語)`);

  const generated = await generateLexiconJa(batch, apiKey);
  Object.assign(lexiconJa, generated);

  console.log('\n[3/3] JSON を更新中...');
  const lexiconObj = { ...data.lexicon };
  for (const [strongs, ja] of Object.entries(generated)) {
    const merged = mergeLexiconSources(strongs, tbeshMap, strongMap, indexMap, bdbMap);
    applyJaToLexicon(lexiconObj, strongs, ja, merged);
    applyJaToWords(data.words, strongs, ja);
  }

  data.lexicon = lexiconObj;
  writeFileSync(outPath, JSON.stringify(data), 'utf-8');
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(LEXICON_CACHE, JSON.stringify(lexiconJa, null, 2), 'utf-8');

  const kb = Math.round(JSON.stringify(data).length / 1024);
  const remaining = missing.length - batch.length;
  console.log(`  ✓ ${book.name} → ${outPath} (${kb} KB)`);
  console.log(`  キャッシュ: ${LEXICON_CACHE}`);
  if (remaining > 0) {
    console.log(`\n残り ${remaining} 語。続き: node scripts/generate-ot-data.mjs --lexicon-only ${book.id}${limit > 0 ? ` --limit ${limit}` : ''}`);
  } else {
    console.log('\n詳細辞書の生成が完了しました。');
  }
}

// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const useCache = args.includes('--use-cache');
  const exportSources = args.includes('--export-sources');
  const lexiconOnly = args.includes('--lexicon-only');
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0;
  const chapterRange = parseChapterRange(args);
  const bookIds = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
  const books = bookIds.length
    ? bookIds.map((id) => OSHB_BOOKS[id]).filter(Boolean)
    : [OSHB_BOOKS.genesis];

  if (!books.length) {
    console.error('未知の書IDです');
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (lexiconOnly) {
    if (!apiKey) {
      console.error('\nエラー: ANTHROPIC_API_KEY が必要です。');
      console.error('  .env.local に設定するか、環境変数で渡してください。');
      process.exit(1);
    }
    console.log('\n=== Gbible 旧約辞書生成 (TBESH + BDB → 日本語) ===');
    for (const book of books) {
      await generateLexiconOnly(book, apiKey, limit);
    }
    return;
  }

  console.log('\n=== Gbible 旧約データ生成 (OSHB + TBESH + BDB) ===');

  console.log('\n[1/5] 辞典ソースを読み込み中...');
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
  console.log(`  TBESH ${tbeshMap.size} / Strong ${strongMap.size} / BDB ${bdbMap.size} / Index ${indexMap.size}`);

  for (const book of books) {
    console.log(`\n[2/5] OSHB ${book.name} をフェッチ中...`);
    const xml = await fetchCached(
      `https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc/${book.file}`,
      `oshb-${book.file}`,
    );

    const { from: fromChapter, to: toChapter } = chapterRange;
    console.log(`  対象章: 第${fromChapter}章〜第${toChapter}章`);

    const outPath = join(DATA_DIR, `${book.id}.json`);
    let existingData = null;
    if (existsSync(outPath)) {
      existingData = JSON.parse(readFileSync(outPath, 'utf-8'));
      console.log(`  既存データをマージ: ${Object.keys(existingData.words).length} 節`);
    }

    const strongsNeeded = new Set();
    const chapterVerses = new Map();

    for (let chapter = fromChapter; chapter <= toChapter; chapter++) {
      const verses = parseOshbChapter(xml, book.osis, chapter);
      chapterVerses.set(chapter, verses);
      console.log(`  第${chapter}章: ${verses.size} 節`);
      for (const wordList of verses.values()) {
        for (const w of wordList) strongsNeeded.add(lemmaToStrongs(w.lemma));
      }
    }

    const mergedEntries = [...strongsNeeded]
      .filter((s) => s !== 'H0')
      .map((s) => mergeLexiconSources(s, tbeshMap, strongMap, indexMap, bdbMap));

    if (exportSources) {
      mkdirSync(CACHE_DIR, { recursive: true });
      const exportObj = Object.fromEntries(mergedEntries.map((e) => [e.strongs, e]));
      writeFileSync(SOURCES_EXPORT, JSON.stringify(exportObj, null, 2), 'utf-8');
      console.log(`\n  英語ソースを出力: ${SOURCES_EXPORT}`);
    }

    console.log(`\n[3/5] 日本語辞書を生成中... (${mergedEntries.length} 語)`);
    const existingLexicon = existingData?.lexicon ?? null;
    let lexiconJa = useCache || !apiKey ? loadLexiconJa(existingLexicon) : { ...(existingLexicon ?? {}) };

    if (!useCache && apiKey) {
      const missing = mergedEntries.filter((e) => !jaEntryHasDetail(lexiconJa[e.strongs]));
      if (missing.length > 0) {
        console.log(`  未訳語 ${missing.length} 件を API で生成...`);
        const generated = await generateLexiconJa(missing, apiKey);
        Object.assign(lexiconJa, generated);
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(LEXICON_CACHE, JSON.stringify(lexiconJa, null, 2), 'utf-8');
        console.log(`  キャッシュ保存: ${LEXICON_CACHE}`);
      }
    }

    if (!lexiconJa || Object.keys(lexiconJa).length === 0) {
      console.error('\nエラー: 辞書データがありません。');
      console.error('  ANTHROPIC_API_KEY を設定して実行するか、');
      console.error('  scripts/genesis-1-stub-lexicon.json を用意してください。');
      process.exit(1);
    }

    console.log('\n[4/5] JSON を書き出し中...');
    mkdirSync(DATA_DIR, { recursive: true });

    const wordsObj = { ...(existingData?.words ?? {}) };
    const lexiconObj = { ...(existingData?.lexicon ?? {}) };

    for (let chapter = fromChapter; chapter <= toChapter; chapter++) {
      const verses = chapterVerses.get(chapter);
      for (const [verse, wordList] of verses.entries()) {
        const key = `${chapter}:${verse}`;
        wordsObj[key] = wordList.map((w, idx) => {
          const strongs = lemmaToStrongs(w.lemma);
          const merged = mergeLexiconSources(strongs, tbeshMap, strongMap, indexMap, bdbMap);
          const ja = lexiconJa[strongs];

          if (!lexiconObj[strongs] && (merged.lemma || tbeshMap.get(strongs) || strongs !== 'H0')) {
            applyJaToLexicon(lexiconObj, strongs, ja, merged);
          } else if (ja && jaEntryHasDetail(ja) && lexiconObj[strongs]) {
            applyJaToLexicon(lexiconObj, strongs, ja, merged);
          }

          return {
            id: `genesis-${chapter}-${verse}-w${idx + 1}`,
            strongs,
            text: w.text,
            script: 'heb',
            morph: w.morph,
            glossJa: ja?.glossJa ?? ja?.definitionJa ?? merged.gloss ?? w.text,
          };
        });
      }
    }

    const genesisChapters = [
      31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18,
      34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 54, 33, 20, 31, 29, 43, 36, 30, 23, 23,
      57, 38, 34, 34, 28, 34, 31, 22, 33, 26,
    ];

    const output = {
      version: 1,
      book: 'genesis',
      name: book.name,
      chapters: genesisChapters,
      words: wordsObj,
      lexicon: lexiconObj,
    };

    writeFileSync(outPath, JSON.stringify(output), 'utf-8');
    const kb = Math.round(JSON.stringify(output).length / 1024);
    console.log(`  ✓ ${book.name} → ${outPath} (${kb} KB)`);
  }

  console.log('\n完了！');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
