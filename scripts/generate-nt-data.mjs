#!/usr/bin/env node
/**
 * scripts/generate-nt-data.mjs
 *
 * MorphGNT（無料ライセンス）から新約聖書のギリシャ語テキスト + 形態論データを取得し、
 * Claude API で日本語語義を生成して public/data/nt/[bookId].json に出力する。
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-nt-data.mjs          # 全27書
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-nt-data.mjs john     # ヨハネのみ
 *   ANTHROPIC_API_KEY=sk-... node scripts/generate-nt-data.mjs john mark # 複数指定
 *
 * 必要: Node.js 18+（ビルトイン fetch を使用）
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data', 'nt');
const CACHE_DIR = join(ROOT, '.nt-cache');

// ---------------------------------------------------------------------------
// NT書定義（MorphGNT ファイル名 → アプリ内 BookId）
// ---------------------------------------------------------------------------
const NT_BOOKS = [
  { file: '61-Mt',  id: 'matthew',        name: 'マタイによる福音書' },
  { file: '62-Mk',  id: 'mark',           name: 'マルコによる福音書' },
  { file: '63-Lk',  id: 'luke',           name: 'ルカによる福音書' },
  { file: '64-Jn',  id: 'john',           name: 'ヨハネによる福音書' },
  { file: '65-Ac',  id: 'acts',           name: '使徒の働き' },
  { file: '66-Ro',  id: 'romans',         name: 'ローマ人への手紙' },
  { file: '67-1Co', id: '1corinthians',   name: 'コリント人への第一の手紙' },
  { file: '68-2Co', id: '2corinthians',   name: 'コリント人への第二の手紙' },
  { file: '69-Ga',  id: 'galatians',      name: 'ガラテヤ人への手紙' },
  { file: '70-Eph', id: 'ephesians',      name: 'エペソ人への手紙' },
  { file: '71-Php', id: 'philippians',    name: 'ピリピ人への手紙' },
  { file: '72-Col', id: 'colossians',     name: 'コロサイ人への手紙' },
  { file: '73-1Th', id: '1thessalonians', name: 'テサロニケ人への第一の手紙' },
  { file: '74-2Th', id: '2thessalonians', name: 'テサロニケ人への第二の手紙' },
  { file: '75-1Ti', id: '1timothy',       name: 'テモテへの第一の手紙' },
  { file: '76-2Ti', id: '2timothy',       name: 'テモテへの第二の手紙' },
  { file: '77-Tit', id: 'titus',          name: 'テトスへの手紙' },
  { file: '78-Phm', id: 'philemon',       name: 'ピレモンへの手紙' },
  { file: '79-Heb', id: 'hebrews',        name: 'ヘブル人への手紙' },
  { file: '80-Jas', id: 'james',          name: 'ヤコブの手紙' },
  { file: '81-1Pe', id: '1peter',         name: 'ペテロの第一の手紙' },
  { file: '82-2Pe', id: '2peter',         name: 'ペテロの第二の手紙' },
  { file: '83-1Jn', id: '1john',          name: 'ヨハネの第一の手紙' },
  { file: '84-2Jn', id: '2john',          name: 'ヨハネの第二の手紙' },
  { file: '85-3Jn', id: '3john',          name: 'ヨハネの第三の手紙' },
  { file: '86-Jud', id: 'jude',           name: 'ユダの手紙' },
  { file: '87-Re',  id: 'revelation',     name: 'ヨハネの黙示録' },
];

const MORPHGNT_BASE = 'https://raw.githubusercontent.com/morphgnt/sblgnt/master';
const STRONGS_XML_URL = 'https://raw.githubusercontent.com/morphgnt/strongs-dictionary-xml/master/strongsgreek.xml';

// ---------------------------------------------------------------------------
// ユーティリティ: キャッシュ付きフェッチ
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Strong's XML → ギリシャ語見出し語 → G番号 マッピング
// ---------------------------------------------------------------------------
function buildStrongsMap(xml) {
  const map = new Map();
  let currentStrongs = null;
  for (const line of xml.split('\n')) {
    const em = line.match(/strongs="(\d+)"/);
    if (em) currentStrongs = 'G' + parseInt(em[1], 10);
    const gm = line.match(/unicode="([^"]+)"/);
    if (gm && currentStrongs) {
      const lemma = gm[1].toLowerCase().normalize('NFC');
      if (!map.has(lemma)) map.set(lemma, currentStrongs);
    }
  }
  return map;
}

function stripDiacritics(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function lookupStrongs(lemma, strongsMap, stripMap) {
  const key = lemma.toLowerCase().normalize('NFC');
  return strongsMap.get(key) ?? stripMap.get(stripDiacritics(key)) ?? 'G0';
}

// ---------------------------------------------------------------------------
// MorphGNT 形態論コード → アプリ形式 morph コード
// ---------------------------------------------------------------------------
function toMorph(pos, parse) {
  const p = parse.padEnd(8, '-');
  const INVARIANT = { 'P-': 'PREP', 'C-': 'Conj', 'D-': 'ADV', 'X-': 'PRT', 'I-': 'INTJ' };
  if (INVARIANT[pos]) return INVARIANT[pos];
  const cleanPos = pos.replace(/-$/, '');
  if (pos === 'V-') {
    const person = p[0] !== '-' ? p[0] : '';
    const tense  = p[1] !== '-' ? p[1] : '';
    const voice  = p[2] !== '-' ? p[2] : '';
    const mood   = p[3] !== '-' ? p[3] : '';
    const caseF  = p[4] !== '-' ? p[4] : '';
    const number = p[5] !== '-' ? p[5] : '';
    const gender = p[6] !== '-' ? p[6] : '';
    if (mood === 'P') return `V-${tense}${voice}P-${caseF}${number}${gender}`;
    if (mood === 'N') return `V-${tense}${voice}N`;
    // 定形動詞: TMV (tense-mood-voice) + person-number
    return `V-${tense}${mood}${voice}-${person}${number}`;
  }
  // 名詞・形容詞・代名詞・冠詞: POS-格数性
  const caseF  = p[4] !== '-' ? p[4] : '';
  const number = p[5] !== '-' ? p[5] : '';
  const gender = p[6] !== '-' ? p[6] : '';
  return `${cleanPos}-${caseF}${number}${gender}`;
}

// ---------------------------------------------------------------------------
// MorphGNT テキストをパース
// ---------------------------------------------------------------------------
function parseMorphGNT(text) {
  const verses = new Map(); // "ch:v" → { pos, parse, greek, lemma }[]
  const maxVerse = {};       // ch → max verse

  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 7) continue;
    const [ref, pos, parse, , greek, , lemma] = parts;
    const ch = parseInt(ref.slice(2, 4), 10);
    const v  = parseInt(ref.slice(4, 6), 10);
    const key = `${ch}:${v}`;
    if (!verses.has(key)) verses.set(key, []);
    verses.get(key).push({ pos, parse, greek, lemma });
    if (!maxVerse[ch] || v > maxVerse[ch]) maxVerse[ch] = v;
  }
  // 章ごとの節数配列
  const chapters = Object.keys(maxVerse)
    .map(Number)
    .sort((a, b) => a - b)
    .map((ch) => maxVerse[ch]);

  return { verses, chapters };
}

// ---------------------------------------------------------------------------
// Claude API で日本語語義を一括生成（50語単位でバッチ）
// ---------------------------------------------------------------------------
async function generateGlosses(lemmaDefs, apiKey) {
  const BATCH = 50;
  const entries = [...lemmaDefs.entries()]; // [lemma, engGloss]
  const results = new Map(); // lemma → { glossJa, definitionJa }

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    console.log(`  Claude API: 語義生成 ${i + 1}〜${Math.min(i + BATCH, entries.length)} / ${entries.length}`);

    const wordList = batch
      .map(([lemma, eng]) => `${lemma}${eng ? ` (${eng})` : ''}`)
      .join('\n');

    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `以下の新約聖書ギリシャ語単語について、日本語の短い訳語（glossJa: 1〜3語）と定義（definitionJa: 1〜2文）をJSON配列で返してください。JSONのみ返し、余分なテキストは不要です。

出力形式:
[{"lemma":"λόγος","glossJa":"言葉","definitionJa":"言葉・言論・ロゴスを意味する名詞。神の啓示や理性的原理を表す場合もある。"}]

単語リスト:
${wordList}`,
      }],
    });

    let retries = 3;
    while (retries > 0) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body,
      });

      if (r.status === 429) {
        console.log('  レート制限: 10秒待機...');
        await new Promise((res) => setTimeout(res, 10000));
        retries--;
        continue;
      }
      if (!r.ok) {
        const err = await r.text();
        throw new Error(`Claude API エラー ${r.status}: ${err}`);
      }

      const data = await r.json();
      const text = data.content?.[0]?.text ?? '[]';
      try {
        // JSON を抽出（コードブロックに包まれている場合も対応）
        const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] ?? '[]';
        const arr = JSON.parse(jsonStr);
        for (const item of arr) {
          if (item.lemma) results.set(item.lemma, {
            glossJa: item.glossJa ?? '',
            definitionJa: item.definitionJa ?? '',
          });
        }
      } catch (e) {
        console.warn('  JSON パース失敗。スキップ:', e.message);
      }
      break;
    }

    // バッチ間インターバル
    if (i + BATCH < entries.length) {
      await new Promise((res) => setTimeout(res, 800));
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// メイン処理
// ---------------------------------------------------------------------------
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY 環境変数が設定されていません。');
    process.exit(1);
  }

  // 対象書を絞り込む
  const targets = process.argv.slice(2);
  const books = targets.length
    ? NT_BOOKS.filter((b) => targets.includes(b.id))
    : NT_BOOKS;
  if (books.length === 0) {
    console.error('指定された書が見つかりません:', targets.join(', '));
    process.exit(1);
  }

  console.log(`\n=== Gbible NT データ生成 ===`);
  console.log(`対象: ${books.map((b) => b.id).join(', ')}`);

  // Strong's マッピング構築
  console.log('\n[1/4] Strong\'s 辞書を読み込み中...');
  const strongsXml = await fetchCached(STRONGS_XML_URL, 'strongsgreek.xml');
  const strongsMap = buildStrongsMap(strongsXml);
  const stripMap = new Map(
    [...strongsMap.entries()].map(([k, v]) => [stripDiacritics(k), v]),
  );
  console.log(`  ${strongsMap.size} エントリ読み込み完了`);

  // 各書をパース
  console.log('\n[2/4] MorphGNT データをフェッチ・パース中...');
  const parsedBooks = [];
  for (const book of books) {
    process.stdout.write(`  ${book.name} (${book.id})... `);
    const text = await fetchCached(
      `${MORPHGNT_BASE}/${book.file}-morphgnt.txt`,
      `${book.file}-morphgnt.txt`,
    );
    const { verses, chapters } = parseMorphGNT(text);
    parsedBooks.push({ ...book, verses, chapters });
    console.log(`${verses.size} 節, ${chapters.length} 章`);
  }

  // 全書に渡る一意な見出し語を収集（English gloss は Strong's 辞書から取れないので空でOK）
  console.log('\n[3/4] 日本語語義を生成中...');
  const allLemmas = new Map(); // lemma → ""
  for (const { verses } of parsedBooks) {
    for (const words of verses.values()) {
      for (const { lemma } of words) {
        if (!allLemmas.has(lemma)) allLemmas.set(lemma, '');
      }
    }
  }
  console.log(`  一意な見出し語: ${allLemmas.size}`);
  const glossMap = await generateGlosses(allLemmas, apiKey);
  console.log(`  生成完了: ${glossMap.size} 語義`);

  // JSON ファイルを出力
  console.log('\n[4/4] JSON ファイルを書き出し中...');
  mkdirSync(DATA_DIR, { recursive: true });

  for (const { id, name, verses, chapters } of parsedBooks) {
    const wordsObj = {};
    const lexiconObj = {};
    const seenLemma = new Set();

    for (const [key, wordList] of verses.entries()) {
      const [ch, v] = key.split(':').map(Number);
      wordsObj[key] = wordList.map((w, idx) => {
        const morph = toMorph(w.pos, w.parse);
        const strongs = lookupStrongs(w.lemma, strongsMap, stripMap);
        const gloss = glossMap.get(w.lemma);

        // 見出し語ごとに1回だけ lexicon エントリを追加
        if (!seenLemma.has(w.lemma)) {
          seenLemma.add(w.lemma);
          lexiconObj[strongs] = {
            strongs,
            lemma: w.lemma,
            definitionJa: gloss?.definitionJa ?? '',
            reviewed: false,
          };
        }

        return {
          id: `${id}-${ch}-${v}-w${idx + 1}`,
          strongs,
          greek: w.greek,
          morph,
          glossJa: gloss?.glossJa ?? w.lemma,
        };
      });
    }

    const output = { version: 1, book: id, name, chapters, words: wordsObj, lexicon: lexiconObj };
    const outPath = join(DATA_DIR, `${id}.json`);
    writeFileSync(outPath, JSON.stringify(output), 'utf-8');
    const kb = Math.round(JSON.stringify(output).length / 1024);
    console.log(`  ✓ ${name} → ${outPath} (${kb} KB)`);
  }

  console.log('\n完了！');
  console.log('次のステップ: src/lib/verse-data.ts の BOOKS_WITH_FULL_DATA に生成した書を追加してください。');
  console.log('例: "john" を追加 → export const BOOKS_WITH_FULL_DATA = new Set<BookId>(["john"]);');
}

main().catch((e) => { console.error(e); process.exit(1); });
