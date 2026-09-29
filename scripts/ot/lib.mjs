/**
 * 旧約データ生成パイプライン共通部品
 *
 * - .env.local 読み込み
 * - 英語辞典ソース（TBESH / Strong's / BDB）と OSHB 本文の取得・解析
 * - 節番号の対応（WLC → 新改訳2017 と同じ KJV 式。詩篇の表題は 0 節）
 * - JSON の読み書き
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const PUBLIC_OT = join(ROOT, 'public', 'data', 'ot');
export const WORK_DIR = join(ROOT, 'data', 'ot');
export const CACHE_DIR = join(ROOT, '.ot-cache');
export const STYLE_DIR = join(__dirname, 'style');

export const MASTER_LEXICON = join(WORK_DIR, 'lexicon-master.json');

const OSHB_BASE = 'https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc';
const SOURCES = {
  tbesh: [
    'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESH%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Hebrew%20-%20STEPBible.org%20CC%20BY.txt',
    'tbesh.txt',
  ],
  strong: ['https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml', 'hebrew-strong.xml'],
  bdb: ['https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/BrownDriverBriggs.xml', 'bdb.xml'],
  index: ['https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/LexicalIndex.xml', 'lexical-index.xml'],
  verseMap: [`${OSHB_BASE}/VerseMap.xml`, 'oshb-VerseMap.xml'],
};

export function loadEnvLocal() {
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

export function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function writeJson(path, data, { pretty = true } = {}) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, pretty ? `${JSON.stringify(data, null, 2)}\n` : JSON.stringify(data), 'utf-8');
}

export function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

/** "1-41" / "23" / "1,23,51" → 章番号の配列。未指定なら null（全章） */
export function parseChapterSpec(spec) {
  if (!spec || spec === true) return null;
  const out = new Set();
  for (const part of String(spec).split(',')) {
    const [a, b] = part.split('-').map((n) => parseInt(n, 10));
    if (Number.isNaN(a)) continue;
    for (let c = a; c <= (Number.isNaN(b) || b === undefined ? a : b); c++) out.add(c);
  }
  return [...out].sort((x, y) => x - y);
}

export async function fetchCached(url, cacheFile) {
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

export function fetchOshbBook(book) {
  return fetchCached(`${OSHB_BASE}/${book.oshbFile}`, `oshb-${book.oshbFile}`);
}

// ---------------------------------------------------------------------------
// 英語辞典ソース

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
    .replace(/<ref r="([^"]+)">([^<]*)<\/ref>/gi, (_, r, t) => ` [${t.trim() || r}]`)
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
    const cols = line.trim().split('\t');
    if (cols.length < 8 || !cols[0].startsWith('H')) continue;
    const num = parseInt(cols[0].slice(1), 10);
    if (Number.isNaN(num)) continue;
    const strongs = `H${num}`;
    if (map.has(strongs)) continue;
    map.set(strongs, {
      lemma: cols[3].trim(),
      translit: cols[4].trim(),
      morph: cols[5].trim(),
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
    const block = m[2];
    map.set(m[1], {
      lemma: block.match(/<w[^>]*>([^<]*)<\/w>/)?.[1]?.trim() ?? '',
      translit: block.match(/xlit="([^"]*)"/)?.[1]?.trim() ?? '',
      pos: block.match(/pos="([^"]*)"/)?.[1]?.trim() ?? '',
      source: flattenXml(block.match(/<source>([\s\S]*?)<\/source>/)?.[1] ?? ''),
      meaning: flattenXml(block.match(/<meaning>([\s\S]*?)<\/meaning>/)?.[1] ?? ''),
      usage: flattenXml(block.match(/<usage>([\s\S]*?)<\/usage>/)?.[1] ?? ''),
    });
  }
  return map;
}

function parseBDB(xml) {
  const map = new Map();
  const re = /<entry id="([^"]+)"[^>]*>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const text = flattenXml(m[2].replace(/<status[\s\S]*?<\/status>/g, ''));
    if (text.length > 3) map.set(m[1], text);
  }
  return map;
}

function parseLexicalIndex(xml) {
  const map = new Map();
  const re = /<entry id="[^"]*">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const attrs = block.match(/<xref([^>]*)\/>/)?.[1];
    if (!attrs) continue;
    const strongMatch = attrs.match(/strong="(\d+)"/);
    const bdbMatch = attrs.match(/bdb="([^"]*)"/);
    if (!strongMatch || !bdbMatch) continue;
    map.set(`H${parseInt(strongMatch[1], 10)}`, {
      bdbId: bdbMatch[1],
      lemma: block.match(/<w[^>]*>([^<]*)<\/w>/)?.[1]?.trim() ?? '',
      def: block.match(/<def>([^<]*)<\/def>/)?.[1]?.trim() ?? '',
    });
  }
  return map;
}

/** 辞典ソースをまとめて読み込み、Strong's 番号から英語資料を引く関数を返す */
export async function loadLexiconSources() {
  const [tbeshText, strongXml, bdbXml, indexXml] = await Promise.all(
    ['tbesh', 'strong', 'bdb', 'index'].map((k) => fetchCached(...SOURCES[k])),
  );
  const tbesh = parseTBESH(tbeshText);
  const strong = parseHebrewStrong(strongXml);
  const bdb = parseBDB(bdbXml);
  const index = parseLexicalIndex(indexXml);

  return function lookup(strongs) {
    const tb = tbesh.get(strongs);
    const st = strong.get(strongs);
    const idx = index.get(strongs);
    const bdbText = idx ? bdb.get(idx.bdbId) ?? '' : '';
    const parts = [];
    if (tb?.gloss) parts.push(`[TBESH gloss] ${tb.gloss}`);
    if (tb?.entryText) parts.push(`[TBESH] ${tb.entryText}`);
    if (st?.source) parts.push(`[Strong's 語源] ${st.source}`);
    if (st?.meaning) parts.push(`[Strong's 意味] ${st.meaning}`);
    if (st?.usage) parts.push(`[Strong's 訳語] ${st.usage}`);
    if (bdbText) parts.push(`[BDB] ${bdbText.slice(0, 2500)}`);
    const tbMorph = tb?.morph ?? '';
    return {
      strongs,
      lemma: tb?.lemma || st?.lemma || idx?.lemma || '',
      translit: tb?.translit || st?.translit || '',
      tbeshMorph: tbMorph,
      isAramaic: /^A:/.test(tbMorph),
      isProperNoun: /\bN:N/.test(tbMorph),
      gloss: tb?.gloss || idx?.def || '',
      sourceText: parts.join('\n\n'),
    };
  };
}

// ---------------------------------------------------------------------------
// OSHB 本文

/** OSHB の lemma 属性の前置要素 → 意味（2ペインの訳・AIへの入力に使う） */
export const PREFIX_JA = {
  c: 'そして（接続詞ו）',
  d: '冠詞ה',
  b: '〜で／〜の中に（前置詞ב）',
  l: '〜に／〜へ（前置詞ל）',
  m: '〜から（前置詞מן）',
  k: '〜のように（前置詞כ）',
  i: '疑問詞ה',
  s: '関係詞ש',
};

function lemmaToStrongs(lemma) {
  const last = lemma.split('/').pop().trim();
  const num = parseInt(last.split(/\s+/)[0], 10);
  return Number.isNaN(num) ? 'H0' : `H${num}`;
}

function lemmaPrefixes(lemma) {
  const parts = lemma.split('/').map((p) => p.trim());
  // 「לוֹ（彼に）」のように前置詞に人称接尾辞だけが付いた語は、lemma が前置詞の記号1つになる
  if (parts.length === 1) return PREFIX_JA[parts[0]] ? [parts[0]] : [];
  return parts.slice(0, -1).filter((p) => PREFIX_JA[p]);
}

/**
 * OSHB の書 XML を WLC 節番号のまま解析する。
 * ケティブ（書かれた形）とケレ（読む形）がある箇所は、母音符号付きのケレを本文として採る。
 * それ以外の欄外注（<note>）の中身は本文ではないので除外する。
 * @returns Map<"章.節", word[]>
 */
export function parseOshbBook(xml, osis) {
  const verses = new Map();
  const re = new RegExp(`<verse osisID="${osis}\\.(\\d+)\\.(\\d+)"[^>]*>([\\s\\S]*?)<\\/verse>`, 'g');
  let m;
  while ((m = re.exec(xml)) !== null) {
    const words = [];
    let pendingKetiv = null;
    // 本文の語と欄外注を出現順に読む
    const tokenRe = /<w ([^>]*)>([^<]*)<\/w>|<note[^>]*>([\s\S]*?)<\/note>/g;
    let tm;
    while ((tm = tokenRe.exec(m[3])) !== null) {
      if (tm[1] !== undefined) {
        const w = parseWord(tm[1], tm[2]);
        if (/type="x-ketiv"/.test(tm[1])) {
          pendingKetiv = w;
        } else {
          words.push(w);
        }
        continue;
      }
      const qere = tm[3].match(/<rdg type="x-qere">([\s\S]*?)<\/rdg>/)?.[1];
      if (qere === undefined) continue;
      const qereWords = [...qere.matchAll(/<w ([^>]*)>([^<]*)<\/w>/g)].map((q) => parseWord(q[1], q[2]));
      qereWords.forEach((w, i) => {
        if (pendingKetiv) {
          w.kq = {
            ketiv: pendingKetiv.text,
            ketivStrongs: pendingKetiv.strongs,
            ketivMorph: pendingKetiv.morph,
            part: i + 1,
            of: qereWords.length,
          };
        }
        words.push(w);
      });
      pendingKetiv = null;
    }
    verses.set(`${parseInt(m[1], 10)}.${parseInt(m[2], 10)}`, words);
  }
  return verses;
}

function parseWord(attrs, surface) {
  const lemma = attrs.match(/lemma="([^"]+)"/)?.[1] ?? '';
  const morph = attrs.match(/morph="([^"]+)"/)?.[1] ?? '';
  return {
    lemma,
    strongs: lemmaToStrongs(lemma),
    prefixes: lemmaPrefixes(lemma),
    morph,
    text: surface.replace(/\//g, '').trim(),
    lang: morph.startsWith('A') ? 'arc' : 'heb',
  };
}

// ---------------------------------------------------------------------------
// 節番号の対応（WLC → KJV 式 = 新改訳2017 と同じ番号）

/** 詩篇 13:6 は WLC の1節が KJV の2節（5・6節）に分かれる。分割位置の語 */
const PARTIAL_SPLITS = {
  'Ps.13.6': { firstWordOfB: 'אָשִׁירָה' },
};

function stripPoints(s) {
  return s.replace(/[\u0591-\u05C7]/g, '');
}

export async function loadVerseMap() {
  const xml = await fetchCached(...SOURCES.verseMap);
  const map = new Map(); // "Ps.51.3" → [{kjv:"Ps.51.1", part:null}]
  const re = /<verse wlc="([^"]+)" kjv="([^"]+)" type="([a-z]+)"\/>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const [wlcRaw, kjv] = [m[1], m[2]];
    const [wlc, part] = wlcRaw.split('!');
    if (!map.has(wlc)) map.set(wlc, []);
    map.get(wlc).push({ kjv, part: part ?? null });
  }
  return map;
}

/**
 * WLC 節ごとの単語を、アプリで使う節キー（"章:節"。詩篇の表題は "章:0"）へ並べ替える。
 * - 対応表にない節は同じ番号
 * - 詩篇で複数の WLC 節が KJV の1節に対応する場合、最後の1つ以外は表題（0 節）
 */
export function remapVerses(book, wlcVerses, verseMap) {
  const out = new Map();
  const push = (key, words) => {
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(...words);
  };

  // KJV 1節へ対応する WLC 節（詩篇の表題判定用）
  const toKjvVerse1 = new Map(); // chapter → [wlcVerse,...]
  for (const wlcKey of wlcVerses.keys()) {
    const [c, v] = wlcKey.split('.').map(Number);
    const mapped = verseMap.get(`${book.osis}.${c}.${v}`);
    const kjv = mapped?.[0]?.kjv;
    const [kc, kv] = kjv ? kjv.split('.').slice(1).map(Number) : [c, v];
    if (book.psalmTitles && kc === c && kv === 1) {
      if (!toKjvVerse1.has(c)) toKjvVerse1.set(c, []);
      toKjvVerse1.get(c).push(v);
    }
  }

  for (const [wlcKey, words] of wlcVerses) {
    const [c, v] = wlcKey.split('.').map(Number);
    const osisKey = `${book.osis}.${c}.${v}`;
    const mapped = verseMap.get(osisKey);

    if (mapped && mapped.length > 1 && mapped.some((x) => x.part)) {
      const split = PARTIAL_SPLITS[osisKey];
      const idx = split
        ? words.findIndex((w) => stripPoints(w.text) === stripPoints(split.firstWordOfB))
        : -1;
      if (idx <= 0) throw new Error(`部分節の分割位置が見つかりません: ${osisKey}`);
      const [a, b] = mapped.map((x) => x.kjv.split('.').slice(1).join(':'));
      push(a, words.slice(0, idx));
      push(b, words.slice(idx));
      continue;
    }

    let key = mapped ? mapped[0].kjv.split('.').slice(1).join(':') : `${c}:${v}`;
    if (book.psalmTitles) {
      const group = toKjvVerse1.get(c);
      if (group && group.length > 1 && group.includes(v) && v !== Math.max(...group)) key = `${c}:0`;
    }
    push(key, words);
  }
  return out;
}

/** 節キーの並び順（章→節） */
export function compareVerseKeys(a, b) {
  const [ac, av] = a.split(':').map(Number);
  const [bc, bv] = b.split(':').map(Number);
  return ac - bc || av - bv;
}
