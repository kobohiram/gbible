#!/usr/bin/env node
/**
 * 手順2: 辞書（3ペイン）の生成 — 見出し語ごとに Opus 5.5 で1件ずつ作る
 *
 *   node scripts/ot/gen-lexicon.mjs psalms --dry-run            # 件数と概算費用だけ表示
 *   node scripts/ot/gen-lexicon.mjs psalms --chapters 1-41       # 第1巻の出現語で未作成のもの
 *   node scripts/ot/gen-lexicon.mjs genesis --redo-legacy        # 旧版（Haiku 等）の辞書を作り直す
 *   node scripts/ot/gen-lexicon.mjs psalms --strongs H7462,H5315  # 指定語のみ（作り直し）
 *   node scripts/ot/gen-lexicon.mjs --import-legacy              # 既存の創世記・出エジプト記の辞書を旧版として取り込む（AI 不要）
 *   … --direct  Batch を使わず即時実行（数件の試行用・料金は通常）
 *
 * 出力: data/ot/lexicon-master.json（全書共通の辞書。status: legacy / draft / verified / locked）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { getBook } from './books.mjs';
import { buildParams, clearJob, estimate, runRequests, MODEL } from './batch.mjs';
import { textPath } from './build-text.mjs';
import {
  MASTER_LEXICON, PUBLIC_OT, STYLE_DIR, loadLexiconSources, parseArgs, parseChapterSpec, readJson, writeJson,
} from './lib.mjs';

const STYLE_GUIDE = readFileSync(join(STYLE_DIR, 'style-guide.md'), 'utf-8');
const NAMES = readJson(join(STYLE_DIR, 'names-ja.json')).entries;

const SYSTEM = `あなたは旧約聖書ヘブル語（およびアラム語）の辞書編纂者です。Gbible（日本語で聖書原文を学ぶサイト）の辞書ペインに載せる日本語の辞書項目を作ります。

以下のスタイルガイドに厳密に従ってください。

${STYLE_GUIDE}

## 固有名詞対照表（新改訳2017準拠。ここにある語はこの表記を glossJa にそのまま使う）
${Object.entries(NAMES).map(([k, v]) => `${k}: ${v}`).join('\n')}

## 作業の進め方
- 与えられた英語辞典資料（TBESH・Strong's・BDB）を根拠にする。資料にない用法や箇所を作らない。
- 「この書での出現例」は、この語がその書でどう使われるかを把握するための参考。detailJa では、その書の重要な用例を優先して取り上げてよい。
- 出力は指定の JSON スキーマのみ。`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['glossJa', 'definitionJa', 'detailJa', 'nameUncertain'],
  properties: {
    glossJa: { type: 'string', description: '代表的な訳（辞書形・8文字以内）' },
    definitionJa: { type: 'string', description: '中心的な意味（15文字以内）' },
    detailJa: { type: 'string', description: '300〜450字。①②③で用法と箇所' },
    nameUncertain: { type: 'boolean', description: '固有名詞で、新改訳2017の表記に確信がない場合 true' },
  },
};

function loadMaster() {
  return readJson(MASTER_LEXICON, {});
}

function importLegacy() {
  const master = loadMaster();
  let added = 0;
  for (const bookId of ['genesis', 'exodus']) {
    const data = readJson(join(PUBLIC_OT, `${bookId}.json`));
    if (!data) continue;
    for (const [strongs, e] of Object.entries(data.lexicon ?? {})) {
      if (master[strongs]) continue;
      const firstWord = Object.values(data.words).flat().find((w) => w.strongs === strongs);
      master[strongs] = {
        strongs,
        lemma: e.lemma?.startsWith('H') ? '' : e.lemma ?? '',
        glossJa: firstWord?.glossJa ?? '',
        definitionJa: e.definitionJa ?? '',
        detailJa: e.detailJa ?? '',
        status: 'legacy',
        model: 'legacy',
      };
      added++;
    }
  }
  writeJson(MASTER_LEXICON, master);
  console.log(`✓ 旧版の辞書を ${added} 語取り込みました → ${MASTER_LEXICON}`);
}

/** 書の本文から、見出し語ごとの出現回数と用例（最大3節）を集める */
function collectOccurrences(bookId, chapters) {
  const text = readJson(textPath(bookId));
  if (!text) throw new Error(`本文データがありません。先に build-text.mjs ${bookId} を実行してください。`);
  const book = getBook(bookId);
  const occ = new Map();
  for (const [key, words] of Object.entries(text.verses)) {
    const c = Number(key.split(':')[0]);
    if (chapters && !chapters.includes(c)) continue;
    const verseText = words.map((w) => w.text).join(' ');
    for (const w of words) {
      if (w.strongs === 'H0') continue;
      if (!occ.has(w.strongs)) occ.set(w.strongs, { count: 0, examples: [], lang: w.lang });
      const o = occ.get(w.strongs);
      o.count++;
      if (o.examples.length < 3 && !o.examples.some((e) => e.ref === key)) {
        o.examples.push({ ref: `${book.abbr}${key}`, word: w.text, verse: verseText });
      }
    }
  }
  return occ;
}

function buildUser(src, occ, book) {
  const examples = occ.examples.map((e) => `- ${e.ref}（語形 ${e.word}）: ${e.verse}`).join('\n');
  return `見出し語: ${src.lemma}（${src.translit}）Strong's ${src.strongs}${src.isAramaic || occ.lang === 'arc' ? '　※アラム語' : ''}
TBESH 品詞: ${src.tbeshMorph || '不明'}

【英語辞典資料】
${src.sourceText || '（資料なし。確実に言えることだけを書くこと）'}

【${book.name}での出現例（${occ.count}回）】
${examples}

この語の辞書項目を作ってください。`;
}

async function main() {
  const { flags, positional } = parseArgs();
  if (flags['import-legacy']) return importLegacy();

  const bookId = positional[0];
  if (!bookId) {
    console.error('使い方: node scripts/ot/gen-lexicon.mjs <書ID> [--chapters 1-41] [--dry-run] [--direct]');
    process.exit(1);
  }
  const book = getBook(bookId);
  const chapters = parseChapterSpec(flags.chapters);
  const master = loadMaster();
  const occ = collectOccurrences(bookId, chapters);
  const lookup = await loadLexiconSources();

  let targets;
  if (flags.strongs) {
    targets = String(flags.strongs).split(',').filter((s) => occ.has(s));
  } else {
    targets = [...occ.keys()].filter((s) => {
      const e = master[s];
      if (!e || e.status === 'redo') return true;
      if (e.status === 'locked' || e.status === 'verified' || e.status === 'draft') return false;
      return Boolean(flags['redo-legacy']) && e.status === 'legacy';
    });
  }
  targets = targets.filter((s) => master[s]?.status !== 'locked');

  const requests = targets.map((s) => ({
    custom_id: `lex-${s}`,
    params: buildParams({ system: SYSTEM, user: buildUser(lookup(s), occ.get(s), book), schema: SCHEMA, effort: 'high' }),
  }));

  const est = estimate(requests, { outputTokensPerRequest: 2500 });
  console.log(`${book.name}${chapters ? `（${flags.chapters}章）` : ''}: 見出し語 ${occ.size} / 生成対象 ${requests.length} 語`);
  console.log(`  概算: 約 $${est.usd.toFixed(2)}（Batch 半額・思考分を含む大まかな見積もり）`);
  if (flags['dry-run'] || requests.length === 0) return;

  const job = `lexicon-${bookId}${flags.chapters ? `-${flags.chapters}` : ''}`;
  const results = await runRequests(job, requests, { direct: Boolean(flags.direct) });

  const now = new Date().toISOString();
  let ok = 0;
  const failed = [];
  for (const s of targets) {
    const r = results[`lex-${s}`];
    if (!r?.json) {
      failed.push(`${s}: ${r?.error ?? '結果なし'}`);
      continue;
    }
    const src = lookup(s);
    const prev = master[s];
    master[s] = {
      strongs: s,
      lemma: src.lemma,
      translit: src.translit,
      glossJa: NAMES[s] ?? r.json.glossJa.trim(),
      definitionJa: r.json.definitionJa.trim(),
      detailJa: r.json.detailJa.trim(),
      isProperNoun: src.isProperNoun,
      nameUncertain: Boolean(r.json.nameUncertain) && !NAMES[s],
      lang: src.isAramaic || occ.get(s).lang === 'arc' ? 'arc' : 'heb',
      status: 'draft',
      model: MODEL,
      generatedAt: now,
      ...(prev && (prev.status === 'legacy' || prev.status === 'redo')
        ? { previous: { glossJa: prev.glossJa, definitionJa: prev.definitionJa } }
        : {}),
    };
    ok++;
  }
  writeJson(MASTER_LEXICON, master);
  clearJob(job);
  console.log(`✓ 辞書 ${ok} 語を保存しました → ${MASTER_LEXICON}`);
  if (failed.length) {
    console.log(`✗ 失敗 ${failed.length} 語（再実行すると失敗分だけ送り直します）:\n  ${failed.slice(0, 20).join('\n  ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
