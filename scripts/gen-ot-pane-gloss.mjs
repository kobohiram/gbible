#!/usr/bin/env node
/**
 * TBESH gloss 列を日本語に翻訳し、2ペイン専用の pane-gloss.json を生成する。
 * lexicon.json（3ペイン辞書）は変更しない。
 *
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-ot-pane-gloss.mjs
 *   node scripts/gen-ot-pane-gloss.mjs --use-cache
 *   node scripts/gen-ot-pane-gloss.mjs --bootstrap   # キャッシュのみで出力（API不要）
 */

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data', 'ot');
const CACHE_DIR = join(ROOT, '.ot-cache');
const OUTPUT = join(DATA_DIR, 'pane-gloss.json');
const CACHE_FILE = join(CACHE_DIR, 'pane-gloss-ja.json');

const TBESH_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt';

/** 日本語聖書の一般的な固有名（TBESH 英語 gloss → カタカナ） */
const NAME_JA = {
  'Esau': 'エサウ',
  'Isaac': 'イサク',
  'Jacob': 'ヤコブ',
  'Abraham': 'アブラハム',
  'Sarah': 'サラ',
  'Rebekah': 'リベカ',
  'Rebecca': 'リベカ',
  'Rachel': 'ラケル',
  'Leah': 'レア',
  'Joseph': 'ヨセフ',
  'Benjamin': 'ベニヤミン',
  'Judah': 'ユダ',
  'Simeon': 'シメオン',
  'Levi': 'レビ',
  'Dan': 'ダン',
  'Naphtali': 'ナフタリ',
  'Gad': 'ガド',
  'Asher': 'アシェル',
  'Issachar': 'イッサカル',
  'Zebulun': 'ゼブルン',
  'Manasseh': 'マナセ',
  'Ephraim': 'エフライム',
  'Moab': 'モアブ',
  'Ammon': 'アンモン',
  'Edom': 'エドム',
  'Canaan': 'カナン',
  'Egypt': 'エジプト',
  'Pharaoh': 'パロ',
  'Moses': 'モーセ',
  'Aaron': 'アロン',
  'Joshua': 'ヨシュア',
  'David': 'ダビデ',
  'Saul': 'サウル',
  'Samuel': 'サムエル',
  'Solomon': 'ソロモン',
  'Adam': 'アダム',
  'Eve': 'イブ',
  'Noah': 'ノア',
  'Enoch': 'エノク',
  'Melchizedek': 'メルキゼデク',
  'Lot': 'ロト',
  'Ishmael': 'イシュマエル',
  'Hagar': 'ハガル',
  'Keturah': 'ケトラ',
  'Laban': 'ラバン',
  'Bethuel': 'ベトエル',
  'Milcah': 'ミルカ',
  'Nahor': 'ナホル',
  'Terah': 'テラハ',
  'Haran': 'ハラン',
  'Ur': 'ウル',
  'Paddan': 'パダン',
  'Aram': 'アラム',
  'Aramean': 'アラム人',
  'Syria': 'シリア',
  'Mesopotamia': 'メソポタミア',
  'Beer-sheba': 'ベエル・シェバ',
  'Beersheba': 'ベエル・シェバ',
  'Bethel': 'ベテル',
  'Jerusalem': 'エルサレム',
  'Sodom': 'ソドム',
  'Gomorrah': 'ゴモラ',
  'Jordan': 'ヨルダン',
  'Nile': 'ナイル',
  'Euphrates': 'ユフラテ',
  'Tigris': 'チグリス',
  'Havilah': 'ハビラ',
  'Cush': 'クシュ',
  'Assyria': 'アッシリア',
  'Babylon': 'バビロン',
  'Philistia': 'ペリシテ',
  'Philistine': 'ペリシテ人',
  'Midian': 'ミディアン',
  'Midianite': 'ミディアン人',
  'Canaanite': 'カナン人',
  'Hittite': 'ヒッタイト人',
  'Hivite': 'ヒビ人',
  'Perizzite': 'ペリジ人',
  'Jebusite': 'エブス人',
  'Amorite': 'アモリ人',
  'Girgashite': 'ギルガシ人',
  'God': '神',
  'LORD': '主',
  'Yahweh': 'ヤハウェ',
  'Jehovah': 'エホバ',
};

/** TBESH 英語 gloss の定型訳（API 不要） */
const GLOSS_JA = {
  '[Obj.]': '（対格）',
  '[obj.]': '（対格）',
  'God': '神',
  'all': 'すべて',
  'one': '一',
  'two': '二',
  'three': '三',
  'day': '日',
  'night': '夜',
  'heaven': '天',
  'water': '水',
  'land: country/planet': '地',
  'land: soil': '地',
  'to create': '創造する',
  'to say': '言う',
  'to see: see': '見る',
  'to see': '見る',
  'to be': 'ある',
  'to make: do': '作る',
  'to give: give': '与える',
  'to bless': '祝福する',
  'to call: call to': '呼ぶ',
  'to(wards)': '〜へ',
  'upon': '〜の上に',
  'between': '間に',
  'underneath: under': '下に',
  'midst': '中に',
  'for': '〜というのは',
  'which': '〜する者',
  'light': '光',
  'darkness': '闇',
  'spirit': '霊',
  'soul': '命',
  'man': '人',
  'male': '男',
  'female': '女',
  'fish': '魚',
  'bird': '鳥',
  'star': '星',
  'sun': '太陽',
  'moon': '月',
  'sea': '海',
  'food': '食物',
  'seed': '種',
  'tree: wood': '木',
  'grass': '草',
  'behold': '見よ',
  'pleasant': '良い',
  'great: large': '大きい',
  'small': '小さい',
  'first: beginning': '初め',
  'void': '空虚',
  'abyss': '深淵',
  'expanse': '大空',
};

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

function parseTBESHAll(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('H')) continue;
    const cols = trimmed.split('\t');
    if (cols.length < 8) continue;
    const eStrong = cols[0].trim();
    const morph = cols[5]?.trim() ?? '';
    const num = parseInt(eStrong.slice(1), 10);
    if (isNaN(num)) continue;
    const strongs = 'H' + num;
    const entry = {
      strongs,
      lemma: cols[3].trim(),
      translit: cols[4].trim(),
      morph,
      gloss: cols[6].trim(),
    };
    if (!map.has(strongs)) map.set(strongs, []);
    map.get(strongs).push(entry);
  }
  return map;
}

function isProperMorph(morph) {
  return /-M-P|-F-P|-G-P|--L/.test(morph);
}

function pickTbeshEntry(entries) {
  if (!entries?.length) return null;
  const sorted = [...entries].sort((a, b) => {
    const aBad = a.gloss.startsWith('(') || a.gloss.startsWith('[') ? 1 : 0;
    const bBad = b.gloss.startsWith('(') || b.gloss.startsWith('[') ? 1 : 0;
    if (aBad !== bBad) return aBad - bBad;
    const aProp = isProperMorph(a.morph) ? 0 : 1;
    const bProp = isProperMorph(b.morph) ? 0 : 1;
    if (aProp !== bProp) return aProp - bProp;
    return a.gloss.length - b.gloss.length;
  });
  return sorted[0];
}

function normalizeGlossKey(gloss) {
  return gloss
    .replace(/^\(([^)]+)\)-/i, '$1-')
    .replace(/^\(([^)]+)\)/, '$1')
    .trim();
}

function translateNameGloss(gloss) {
  const key = normalizeGlossKey(gloss);
  if (NAME_JA[key]) return NAME_JA[key];
  if (NAME_JA[gloss]) return NAME_JA[gloss];

  const compound = gloss.match(/^\(([^)]+)\)-(.+)$/i);
  if (compound) {
    const a = NAME_JA[compound[1]] ?? compound[1];
    const b = NAME_JA[compound[2]] ?? compound[2];
    if (NAME_JA[compound[1]] || NAME_JA[compound[2]]) {
      return `${a}・${b}`;
    }
  }

  const hyphen = gloss.split('-').map((p) => NAME_JA[p.trim()] ?? null);
  if (hyphen.every(Boolean)) return hyphen.join('・');

  return null;
}

function translateGlossLocal(entry) {
  const { gloss, morph } = entry;
  if (!gloss) return '';

  if (GLOSS_JA[gloss]) return GLOSS_JA[gloss];

  if (isProperMorph(morph) || /^[A-Z]/.test(gloss)) {
    const name = translateNameGloss(gloss);
    if (name) return name;
  }

  if (gloss.startsWith('to ')) {
    const rest = gloss.slice(3).split(':')[0].split(' ')[0];
    const ja = GLOSS_JA[`to ${rest}`] ?? GLOSS_JA[`to ${gloss.slice(3)}`];
    if (ja) return ja;
    return rest + 'する';
  }

  const colon = gloss.split(':')[0].trim();
  if (GLOSS_JA[colon]) return GLOSS_JA[colon];

  return '';
}

async function callClaude(batch, apiKey) {
  const input = batch
    .map(({ strongs, gloss, morph, lemma }) =>
      JSON.stringify({ strongs, gloss, morph, lemma }),
    )
    .join('\n');

  const system =
    'あなたは TBESH 英語 brief gloss を日本語に訳す翻訳者です。' +
    '辞書解説は書きません。gloss の内容だけを短く日本語にします。' +
    '重要: 英語をそのままカタカナや英語+するにしてはいけません。必ず適切な日本語訳を使ってください。';

  const user = `以下は TBESH の gloss 列です。各行 JSON の gloss を日本語に訳してください。

ルール:
- gloss の意味だけを訳す（語源・説明は不要）
- 固有名詞（人名・地名）は日本語聖書のカタカナ（Esau→エサウ、Paddan→パダン、Aram→アラム）
- [Obj.] は（対格）
- 動詞は適切な日本語動詞で（例: to go→行く、to take→取る、to ascend→上る、to build→建てる、to fear→恐れる）
- 「XXXする」形で XXX が英語のままは禁止（例: "ascendする" は不可 → "上る" が正しい）
- 最大12文字程度、簡潔に

入力:
${input}

出力: JSON 配列のみ
[{"strongs":"H1234","paneJa":"..."},...]`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (r.status === 429 || r.status === 529) {
      await new Promise((res) => setTimeout(res, (attempt + 1) * 12000));
      continue;
    }
    if (!r.ok) throw new Error(`Claude API ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const text = data.content?.[0]?.text ?? '';
    const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] ?? '[]';
    return JSON.parse(jsonStr);
  }
  throw new Error('Claude API: リトライ上限');
}

function strongsFromAllBooks() {
  const set = new Set();
  for (const file of readdirSync(DATA_DIR)) {
    if (!file.endsWith('.json') || file === 'pane-gloss.json' || file === 'lexicon.json') continue;
    try {
      const data = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf-8'));
      if (!data.words) continue;
      for (const wordList of Object.values(data.words)) {
        for (const w of wordList) {
          if (w.strongs && w.strongs !== 'H0') set.add(w.strongs);
        }
      }
    } catch {
      // skip
    }
  }
  return set;
}

const args = process.argv.slice(2);
const useCache = args.includes('--use-cache');
const bootstrapOnly = args.includes('--bootstrap');
const apiKey = process.env.ANTHROPIC_API_KEY;

console.log('=== Gbible 2ペイン訳語生成 (TBESH gloss → pane-gloss.json) ===');

const tbeshText = await fetchCached(TBESH_URL, 'tbesh.txt');
const tbeshAll = parseTBESHAll(tbeshText);
const strongsSet = strongsFromAllBooks();
console.log(`  全OT書出現語: ${strongsSet.size} / TBESH: ${tbeshAll.size}`);

let cache = {};
if (existsSync(CACHE_FILE)) {
  cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
}

// 英語のままのエントリを検出（例: "walkする"、"takeする"）
function looksEnglish(text) {
  if (!text) return false;
  return /^[a-zA-Z]/.test(text) || /[a-zA-Z]{3,}する$/.test(text);
}

const pending = [];
const result = { ...cache };

for (const strongs of strongsSet) {
  const existing = result[strongs];
  // 既存の日本語エントリはスキップ（英語っぽい場合は再翻訳）
  if (existing && !looksEnglish(existing)) continue;
  const entries = tbeshAll.get(strongs);
  const entry = pickTbeshEntry(entries);
  if (!entry) continue;

  const local = translateGlossLocal(entry);
  if (local && !looksEnglish(local)) {
    result[strongs] = local;
    continue;
  }

  if (!bootstrapOnly) {
    pending.push(entry);
  }
}

if (pending.length > 0 && apiKey) {
  console.log(`  API 翻訳: ${pending.length} 語`);
  const BATCH = 40;
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    console.log(`  [${i + 1}-${Math.min(i + BATCH, pending.length)} / ${pending.length}]`);
    const items = await callClaude(batch, apiKey);
    for (const item of items) {
      if (item.strongs && item.paneJa?.trim()) {
        result[item.strongs] = item.paneJa.trim();
      }
    }
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(result), 'utf-8');
    await new Promise((r) => setTimeout(r, 1500));
  }
} else if (pending.length > 0) {
  console.log(`  未翻訳 ${pending.length} 語（API キーなし or --bootstrap）`);
}

const output = {};
let covered = 0;
for (const strongs of strongsSet) {
  if (result[strongs]) {
    output[strongs] = result[strongs];
    covered++;
  }
}

writeFileSync(OUTPUT, JSON.stringify(output));
writeFileSync(CACHE_FILE, JSON.stringify(result), 'utf-8');
console.log(`  完了: ${covered} / ${strongsSet.size} → ${OUTPUT}`);

// 創28:6 サンプル
const sample = ['H6215', 'H3327', 'H3290', 'H6307', 'H3667'];
for (const s of sample) {
  console.log(`  ${s}: ${output[s] ?? '(なし)'}`);
}
