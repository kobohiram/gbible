#!/usr/bin/env node
/**
 * scripts/gen-lexicon.mjs
 *
 * Abbott-Smith 辞典（1922, Public Domain, TEI XML）を元に、
 * Claude API で高品質な日本語辞書エントリを生成する。
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-lexicon.mjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-lexicon.mjs --limit 200
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-lexicon.mjs --prepositions-only
 *
 * 出力: public/data/nt/lexicon.json
 * ライセンス: Abbott-Smith = Public Domain (1922)
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data', 'nt');
const CACHE_DIR = join(ROOT, '.nt-cache');
const OUTPUT_PATH = join(DATA_DIR, 'lexicon.json');

const ABBOTT_SMITH_URL =
  'https://raw.githubusercontent.com/translatable-exegetical-tools/Abbott-Smith/master/abbott-smith.tei.xml';

// NT 前置詞 Strong's 番号（Sonnet で詳細エントリ生成）
const NT_PREPOSITIONS = new Set([
  'G303', 'G473', 'G575', 'G1223', 'G1519', 'G1537',
  'G1722', 'G1909', 'G2596', 'G3326', 'G3844', 'G4012',
  'G4314', 'G4862', 'G5228', 'G5259',
]);

// ---------------------------------------------------------------------------
// キャッシュ付きフェッチ
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
// Abbott-Smith TEI XML → Map<strongs, {lemma, pos, occurrencesNT, entryText}>
// ---------------------------------------------------------------------------
function parseAbbottSmith(xml) {
  const map = new Map();

  // <entry n="εἰς|G1519"> ... </entry> の繰り返し
  const entryPattern = /<entry\s+n="([^"]+)">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryPattern.exec(xml)) !== null) {
    const nAttr = m[1]; // e.g. "εἰς|G1519"
    const body  = m[2];

    const pipeIdx = nAttr.lastIndexOf('|');
    if (pipeIdx === -1) continue;
    const lemma   = nAttr.slice(0, pipeIdx).trim();
    const strongs = nAttr.slice(pipeIdx + 1).trim(); // e.g. "G1519"
    if (!/^G\d+$/.test(strongs)) continue;

    // NT 出現回数
    const occMatch = body.match(/<note type="occurrencesNT">(\d+)<\/note>/);
    const occurrencesNT = occMatch ? parseInt(occMatch[1], 10) : 0;

    // 品詞
    const posMatch = body.match(/<pos>([^<]+)<\/pos>/);
    const pos = posMatch ? posMatch[1].trim() : '';

    // エントリ本文をプロンプト向けの読みやすいテキストに変換
    const entryText = xmlToReadable(body);

    map.set(strongs, { lemma, pos, occurrencesNT, entryText });
  }
  return map;
}

// TEI XML を Claude 向けの読みやすいテキストに変換
function xmlToReadable(xml) {
  return xml
    // <sense n="I."> などのラベルを保持
    .replace(/<sense\s+n="([^"]+)">/g, (_, n) => `[${n}] `)
    // Biblical 参照: <ref osisRef="Matt.8.23">Mt 8:23</ref> → "Mt 8:23"
    .replace(/<ref[^>]*>([^<]*)<\/ref>/g, '$1')
    // ギリシャ語: <foreign xml:lang="grc">εἰς</foreign> → "εἰς"
    .replace(/<foreign[^>]*>([^<]*)<\/foreign>/g, '$1')
    // <gloss>into</gloss> → "（into）"
    .replace(/<gloss>([^<]*)<\/gloss>/g, '（$1）')
    // <emph>word</emph> → "word"
    .replace(/<emph>([^<]*)<\/emph>/g, '$1')
    // 残りのタグを除去
    .replace(/<[^>]+>/g, '')
    // 空白を整理
    .replace(/\s+/g, ' ')
    .trim()
    // 500文字を超える場合は切り詰め（API コスト抑制）
    .slice(0, 600);
}

// ---------------------------------------------------------------------------
// Claude API 呼び出しヘルパー
// ---------------------------------------------------------------------------
async function callClaude(model, systemPrompt, userPrompt, apiKey, maxTokens = 2048) {
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
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (r.status === 429 || r.status === 529) {
      const wait = (attempt + 1) * 12000;
      console.log(`    レート制限 → ${wait / 1000}秒待機...`);
      await new Promise(res => setTimeout(res, wait));
      continue;
    }
    if (!r.ok) {
      const err = await r.text();
      throw new Error(`Claude API ${r.status}: ${err.slice(0, 200)}`);
    }
    const data = await r.json();
    return data.content?.[0]?.text ?? '';
  }
  throw new Error('Claude API: リトライ上限に達しました');
}

// ---------------------------------------------------------------------------
// 前置詞: Sonnet で詳細エントリ生成（1語ずつ）
// ---------------------------------------------------------------------------
async function generatePrepositionEntry(strongs, lemma, pos, entryText, apiKey) {
  const system =
    'あなたは新約聖書コイネーギリシャ語の専門辞書編纂者です。' +
    '正確で学術的な日本語辞書エントリを JSON 形式で作成します。';

  const user = `前置詞「${lemma}」（Strong's ${strongs}）の詳細な日本語辞書エントリを作成してください。

【Abbott-Smith 英語エントリ（1922, Public Domain）】
${entryText}

要件:
- definitionJa: 前置詞の核心的意味（15字以内。支配格も簡記）
- detailJa: 主要用法を①②③…の番号付きで整理。各用法に代表的な新約箇所（例: ヨハ3:16, マタ5:3）を付記。神学的に重要な用法を特に丁寧に。300〜450文字。

JSONのみ出力（説明文不要）:
{"definitionJa":"...","detailJa":"..."}`;

  const text = await callClaude('claude-sonnet-4-6', system, user, apiKey, 1024);
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error(`JSON 抽出失敗 (${strongs}): ${text.slice(0, 100)}`);
  return JSON.parse(json);
}

// ---------------------------------------------------------------------------
// 一般語: Haiku でバッチ生成（20語/回）
// ---------------------------------------------------------------------------
async function generateBatchEntries(batch, apiKey) {
  const system =
    'あなたは新約聖書コイネーギリシャ語の専門辞書編纂者です。' +
    '学術的な日本語辞書エントリを JSON 形式で作成します。';

  const input = batch
    .map(({ strongs, lemma, pos, entryText }) =>
      `{"strongs":"${strongs}","lemma":"${lemma}","pos":"${pos}","entry":"${entryText.replace(/"/g, "'")}"}`
    )
    .join('\n');

  const user = `以下の新約聖書ギリシャ語単語について、Abbott-Smith辞典の英語エントリをもとに日本語辞書エントリを作成してください。

入力（各行 JSON）:
${input}

要件:
- definitionJa: 短い訳語・定義（15字以内）
- detailJa: 主要な意味用法（複数ある場合は①②③番号付き）。80〜180字。

出力: JSON 配列のみ（説明文不要）
[{"strongs":"G1234","definitionJa":"...","detailJa":"..."},...]`;

  const text = await callClaude('claude-haiku-4-5-20251001', system, user, apiKey, 3072);
  const jsonStr = text.match(/\[[\s\S]*\]/)?.[0] ?? '[]';
  try {
    return JSON.parse(jsonStr);
  } catch {
    console.warn('    JSON パース失敗、スキップ');
    return [];
  }
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY が未設定です'); process.exit(1); }

  const args = process.argv.slice(2);
  const limitArg = args.findIndex(a => a === '--limit');
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
  const prepOnly = args.includes('--prepositions-only');

  console.log('\n=== Gbible 辞書生成 (Abbott-Smith → 日本語) ===');
  if (prepOnly) console.log('モード: 前置詞のみ');
  else if (limit !== Infinity) console.log(`モード: 上位 ${limit} 語`);

  // 1. Abbott-Smith XML を取得・パース
  console.log('\n[1/4] Abbott-Smith 辞典を読み込み中...');
  const xml = await fetchCached(ABBOTT_SMITH_URL, 'abbott-smith.tei.xml');
  const asMap = parseAbbottSmith(xml);
  console.log(`  ${asMap.size} エントリ取得`);

  // 2. 既存 lexicon.json をロード（再開可能にするため）
  console.log('\n[2/4] 既存エントリを確認...');
  let existing = {};
  if (existsSync(OUTPUT_PATH)) {
    try { existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')); } catch {}
  }
  console.log(`  既存: ${Object.keys(existing).length} エントリ`);

  // 3. 処理対象を決定（出現頻度順）
  console.log('\n[3/4] 対象語を選定...');
  let entries = [...asMap.entries()]
    .sort((a, b) => b[1].occurrencesNT - a[1].occurrencesNT);

  if (prepOnly) {
    entries = entries.filter(([s]) => NT_PREPOSITIONS.has(s));
  } else if (limit !== Infinity) {
    entries = entries.slice(0, limit);
  }

  // 未生成のみ対象
  const todo = entries.filter(([s]) => !existing[s]);
  console.log(`  対象: ${entries.length} 語 / 未生成: ${todo.length} 語`);

  if (todo.length === 0) {
    console.log('  すべて生成済みです。');
    return;
  }

  // 4. 前置詞: Sonnet で個別生成
  const prepTodo = todo.filter(([s]) => NT_PREPOSITIONS.has(s));
  if (prepTodo.length > 0) {
    console.log(`\n  前置詞 ${prepTodo.length} 語 → claude-sonnet-4-6`);
    for (const [strongs, { lemma, pos, entryText }] of prepTodo) {
      process.stdout.write(`    ${lemma} (${strongs})... `);
      try {
        const result = await generatePrepositionEntry(strongs, lemma, pos, entryText, apiKey);
        existing[strongs] = {
          strongs,
          lemma,
          definitionJa: result.definitionJa ?? '',
          detailJa: result.detailJa ?? '',
          reviewed: false,
        };
        console.log('✓');
      } catch (e) {
        console.log(`✗ (${e.message.slice(0, 60)})`);
      }
      // 保存（前置詞は都度）
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 0), 'utf-8');
      await new Promise(res => setTimeout(res, 1200));
    }
  }

  // 5. 一般語: Haiku でバッチ生成
  const regularTodo = todo.filter(([s]) => !NT_PREPOSITIONS.has(s));
  if (regularTodo.length > 0) {
    const BATCH = 20;
    console.log(`\n  一般語 ${regularTodo.length} 語 → claude-haiku（${BATCH}語/バッチ）`);
    for (let i = 0; i < regularTodo.length; i += BATCH) {
      const chunk = regularTodo.slice(i, i + BATCH);
      const batchInput = chunk.map(([strongs, info]) => ({
        strongs,
        lemma: info.lemma,
        pos: info.pos,
        entryText: info.entryText,
      }));

      const progress = `${i + 1}〜${Math.min(i + BATCH, regularTodo.length)}/${regularTodo.length}`;
      process.stdout.write(`    バッチ ${progress}... `);

      try {
        const results = await generateBatchEntries(batchInput, apiKey);
        for (const r of results) {
          if (!r?.strongs) continue;
          const info = asMap.get(r.strongs);
          if (!info) continue;
          existing[r.strongs] = {
            strongs: r.strongs,
            lemma: info.lemma,
            definitionJa: r.definitionJa ?? '',
            detailJa: r.detailJa ?? '',
            reviewed: false,
          };
        }
        console.log(`✓ (${results.length}語)`);
      } catch (e) {
        console.log(`✗ (${e.message.slice(0, 60)})`);
      }

      // 100語ごとに保存
      if ((i + BATCH) % 100 === 0 || i + BATCH >= regularTodo.length) {
        mkdirSync(DATA_DIR, { recursive: true });
        writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 0), 'utf-8');
        const kb = Math.round(Buffer.byteLength(JSON.stringify(existing)) / 1024);
        process.stdout.write(`    → 保存済み (${Object.keys(existing).length}エントリ, ${kb}KB)\n`);
      }

      if (i + BATCH < regularTodo.length) {
        await new Promise(res => setTimeout(res, 900));
      }
    }
  }

  // 最終保存
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 0), 'utf-8');
  const total = Object.keys(existing).length;
  const kb = Math.round(Buffer.byteLength(JSON.stringify(existing)) / 1024);
  console.log(`\n完了: ${total} エントリ → ${OUTPUT_PATH} (${kb} KB)`);
  console.log('次のステップ: git add public/data/nt/lexicon.json && git push');
}

main().catch(e => { console.error(e); process.exit(1); });
