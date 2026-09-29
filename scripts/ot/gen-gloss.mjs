#!/usr/bin/env node
/**
 * 手順3: 2ペインの短い訳（文脈訳）の生成 — 節のまとまりごとに、その文脈で1語ずつ訳す
 *
 *   node scripts/ot/gen-gloss.mjs psalms --chapters 1-41 --dry-run
 *   node scripts/ot/gen-gloss.mjs psalms --chapters 23 --direct   # 1篇だけ即時に試す
 *   node scripts/ot/gen-gloss.mjs genesis --redo                   # 既存の文脈訳も作り直す
 *
 * 前提: 対象の見出し語が data/ot/lexicon-master.json にあること（gen-lexicon.mjs を先に実行）
 * 出力: data/ot/gloss/<書>.json  { 単語ID: { gloss, status, model, generatedAt } }
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { getBook } from './books.mjs';
import { buildParams, clearJob, estimate, runRequests, MODEL } from './batch.mjs';
import { textPath } from './build-text.mjs';
import {
  MASTER_LEXICON, PREFIX_JA, STYLE_DIR, WORK_DIR, compareVerseKeys, parseArgs, parseChapterSpec, readJson, writeJson,
} from './lib.mjs';

const STYLE_GUIDE = readFileSync(join(STYLE_DIR, 'style-guide.md'), 'utf-8');
const NAMES = readJson(join(STYLE_DIR, 'names-ja.json')).entries;

/** 1回の依頼に入れる節数・語数の上限（詩119篇の8節段落が1回に収まる大きさ） */
const MAX_VERSES = 12;
const MAX_WORDS = 220;

export function glossPath(bookId) {
  return join(WORK_DIR, 'gloss', `${bookId}.json`);
}

const SYSTEM = `あなたは旧約聖書ヘブル語の教師です。Gbible の原文ペインで、ヘブル語の各単語の下に表示する「短い日本語訳」を、その節の文脈に合わせて付けます。

以下のスタイルガイド（特に「6. 2ペインの短い訳」）に厳密に従ってください。

${STYLE_GUIDE}

## 固有名詞対照表（この表記を使う）
${Object.entries(NAMES).map(([k, v]) => `${k}: ${v}`).join('\n')}

## 入力の見方
- 各語: 単語ID | ヘブル語 | 接頭辞 | 形態素コード（OSHB 方式。例 HVqp3ms = ヘブル語・動詞・カル態・完了・3人称男性単数、HC/Vqw3ms = 接続詞＋ワウ継続未完了）| Strong's | 辞書の代表訳 / 中心的な意味
- 「前の文脈」は参考のみで、訳は付けない。
- 辞書の代表訳は出発点。文脈に合う訳が別にあればそちらを選ぶが、辞書の意味の範囲から外れない。

## 異読（ケティブ／ケレ）
- 行末に「書かれた形（ケティブ）」がある語は、本文に採っているのが「読む形（ケレ）」。gloss は読む形を訳す。
- さらに ketiv 配列に、その語（読む形が複数語のときは1語目の単語ID）について、書かれた形の短い訳（10文字以内）を返す。読む形との違い（数・人称・語そのもの）が分かる訳にする。
- 異読のない節では ketiv は空配列。

## 出力
- 対象の全単語について、入力と同じ順で { id, gloss } を1つずつ返す。抜けや追加をしない。
- gloss は10文字以内の日本語。`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items', 'ketiv'],
  properties: {
    ketiv: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'gloss'],
        properties: { id: { type: 'string' }, gloss: { type: 'string' } },
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'gloss'],
        properties: { id: { type: 'string' }, gloss: { type: 'string' } },
      },
    },
  },
};

/** 章ごとに、節を MAX_VERSES / MAX_WORDS 以内のまとまりに区切る */
function chunkVerses(verses, chapters) {
  const byChapter = new Map();
  for (const key of Object.keys(verses).sort(compareVerseKeys)) {
    const c = Number(key.split(':')[0]);
    if (chapters && !chapters.includes(c)) continue;
    if (!byChapter.has(c)) byChapter.set(c, []);
    byChapter.get(c).push(key);
  }
  const chunks = [];
  for (const [c, keys] of byChapter) {
    let cur = [];
    let words = 0;
    for (const key of keys) {
      const n = verses[key].length;
      if (cur.length && (cur.length >= MAX_VERSES || words + n > MAX_WORDS)) {
        chunks.push({ chapter: c, keys: cur });
        cur = [];
        words = 0;
      }
      cur.push(key);
      words += n;
    }
    if (cur.length) chunks.push({ chapter: c, keys: cur });
  }
  return chunks;
}

function describeWord(w, master) {
  const lex = master[w.strongs];
  const prefixes = w.prefixes.length ? w.prefixes.map((p) => PREFIX_JA[p]).join('＋') : '-';
  const meaning = lex ? `${NAMES[w.strongs] ?? lex.glossJa} / ${lex.definitionJa}` : '（辞書なし）';
  const kq = w.kq?.part === 1
    ? ` | 書かれた形（ケティブ）: ${w.kq.ketiv}（${w.kq.ketivMorph}, ${w.kq.ketivStrongs}）${w.kq.of > 1 ? `／読む形は次の${w.kq.of}語で1組` : ''}`
    : '';
  return `${w.id} | ${w.text} | ${prefixes} | ${w.morph} | ${w.strongs} | ${meaning}${kq}`;
}

function buildUser(book, chunk, verses, master) {
  const allKeys = Object.keys(verses).sort(compareVerseKeys);
  const firstIdx = allKeys.indexOf(chunk.keys[0]);
  const before = allKeys.slice(Math.max(0, firstIdx - 2), firstIdx)
    .filter((k) => Number(k.split(':')[0]) === chunk.chapter);
  const context = before.length
    ? before.map((k) => `${book.abbr}${k}: ${verses[k].map((w) => w.text).join(' ')}`).join('\n')
    : '（なし）';
  const body = chunk.keys.map((k) => {
    const label = k.endsWith(':0') ? `${book.abbr}${k.replace(':0', '')} 表題` : `${book.abbr}${k}`;
    return `### ${label}\n${verses[k].map((w) => w.text).join(' ')}\n${verses[k].map((w) => describeWord(w, master)).join('\n')}`;
  }).join('\n\n');
  return `【前の文脈】\n${context}\n\n【訳を付ける節】\n${body}`;
}

async function main() {
  const { flags, positional } = parseArgs();
  const bookId = positional[0];
  if (!bookId) {
    console.error('使い方: node scripts/ot/gen-gloss.mjs <書ID> [--chapters 1-41] [--dry-run] [--direct] [--redo]');
    process.exit(1);
  }
  const book = getBook(bookId);
  const chapters = parseChapterSpec(flags.chapters);
  const text = readJson(textPath(bookId));
  if (!text) throw new Error(`本文データがありません。先に build-text.mjs ${bookId} を実行してください。`);
  const master = readJson(MASTER_LEXICON, {});
  const glosses = readJson(glossPath(bookId), {});

  let chunks = chunkVerses(text.verses, chapters);
  if (!flags.redo) {
    chunks = chunks.filter((ch) => ch.keys.some((k) => text.verses[k].some((w) => !glosses[w.id])));
  }
  chunks = chunks.filter((ch) => !ch.keys.every((k) => text.verses[k].every((w) => glosses[w.id]?.status === 'locked')));

  const missingLex = new Set();
  const legacyLex = new Set();
  for (const ch of chunks) {
    for (const k of ch.keys) {
      for (const w of text.verses[k]) {
        if (w.strongs === 'H0') continue;
        if (!master[w.strongs]) missingLex.add(w.strongs);
        else if (master[w.strongs].status === 'legacy') legacyLex.add(w.strongs);
      }
    }
  }
  if (missingLex.size) {
    console.error(`辞書にない見出し語が ${missingLex.size} 語あります。先に gen-lexicon.mjs ${bookId} を実行してください。`);
    process.exit(1);
  }
  if (legacyLex.size) {
    console.warn(`注意: 旧版のままの辞書が ${legacyLex.size} 語あります（gen-lexicon.mjs --redo-legacy で作り直すと訳の質が上がります）。`);
  }

  const requests = chunks.map((ch) => ({
    custom_id: `gl-${ch.chapter}-${ch.keys[0].split(':')[1]}`,
    chunk: ch,
    params: buildParams({ system: SYSTEM, user: buildUser(book, ch, text.verses, master), schema: SCHEMA, effort: 'high', maxTokens: 32000 }),
  }));
  const words = chunks.reduce((n, ch) => n + ch.keys.reduce((m, k) => m + text.verses[k].length, 0), 0);
  const est = estimate(requests, { outputTokensPerRequest: 12000 });
  console.log(`${book.name}${chapters ? `（${flags.chapters}章）` : ''}: 依頼 ${requests.length} 件 / ${words} 語`);
  console.log(`  概算: 約 $${est.usd.toFixed(2)}（Batch 半額・思考分を含む大まかな見積もり）`);
  if (flags['dry-run'] || requests.length === 0) return;

  const job = `gloss-${bookId}${flags.chapters ? `-${flags.chapters}` : ''}`;
  const results = await runRequests(job, requests.map(({ custom_id, params }) => ({ custom_id, params })), {
    direct: Boolean(flags.direct),
  });

  const now = new Date().toISOString();
  let ok = 0;
  const problems = [];
  for (const req of requests) {
    const r = results[req.custom_id];
    const expected = req.chunk.keys.flatMap((k) => text.verses[k].map((w) => w.id));
    if (!r?.json) {
      problems.push(`${req.custom_id}: ${r?.error ?? '結果なし'}`);
      continue;
    }
    const got = new Map(r.json.items.map((it) => [it.id, it.gloss.trim()]));
    const missing = expected.filter((id) => !got.get(id));
    if (missing.length) problems.push(`${req.custom_id}: ${missing.length} 語の訳が抜けています（${missing.slice(0, 3).join(', ')}…）`);
    const ketiv = new Map((r.json.ketiv ?? []).map((it) => [it.id, it.gloss.trim()]));
    for (const id of expected) {
      const gloss = got.get(id);
      if (!gloss || glosses[id]?.status === 'locked') continue;
      glosses[id] = {
        gloss,
        ...(ketiv.get(id) ? { ketivGloss: ketiv.get(id) } : {}),
        status: 'draft',
        model: MODEL,
        generatedAt: now,
      };
      ok++;
    }
  }
  writeJson(glossPath(bookId), glosses);
  clearJob(job);
  console.log(`✓ 文脈訳 ${ok} 語を保存しました → ${glossPath(bookId)}`);
  if (problems.length) {
    console.log(`✗ 問題 ${problems.length} 件（再実行すると訳の抜けた箇所だけ送り直します）:\n  ${problems.slice(0, 20).join('\n  ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
