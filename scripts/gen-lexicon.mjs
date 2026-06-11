#!/usr/bin/env node
/**
 * scripts/gen-lexicon.mjs
 *
 * STEPBible TBESG（Abbott-Smith + Tyndale House, CC BY 4.0）を元に
 * Claude API で高品質な日本語辞書エントリを生成する。
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-lexicon.mjs
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-lexicon.mjs --limit 200
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-lexicon.mjs --prepositions-only
 *   ANTHROPIC_API_KEY=sk-... node scripts/gen-lexicon.mjs --strongs G0026,G3056
 *
 * 出力: public/data/nt/lexicon.json
 * ライセンス: TBESG = CC BY 4.0 (STEPBible / Tyndale House Cambridge)
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data', 'nt');
const CACHE_DIR = join(ROOT, '.nt-cache');
const OUTPUT_PATH = join(DATA_DIR, 'lexicon.json');

const TBESG_URL =
  'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Lexicons/TBESG%20-%20Translators%20Brief%20lexicon%20of%20Extended%20Strongs%20for%20Greek%20-%20STEPBible.org%20CC%20BY.txt';

// NT 前置詞 Strong's 番号（Sonnet で詳細エントリ生成）
const NT_PREPOSITIONS = new Set([
  'G0303', 'G0473', 'G0575', 'G1223', 'G1519', 'G1537',
  'G1722', 'G1909', 'G2596', 'G3326', 'G3844', 'G4012',
  'G4314', 'G4862', 'G5228', 'G5259',
]);

// 前置詞の旧形式番号との互換（lexicon.json は G303 形式で保存済み）
const PREP_LEGACY = new Set([
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
// TBESG タブ区切りテキスト → Map<strongs, {lemma, translit, pos, gloss, entryText}>
//
// 形式: eStrong# \t dStrong \t uStrong \t Greek \t translit \t morph \t gloss \t meaning
// morph が "G:" で始まるものだけをギリシャ語語彙として扱う
// ---------------------------------------------------------------------------
function parseTBESG(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('$') || trimmed.startsWith('=') || trimmed.startsWith('*') || trimmed.startsWith('-') || !trimmed.startsWith('G')) continue;

    const cols = trimmed.split('\t');
    if (cols.length < 8) continue;

    const eStrong = cols[0].trim(); // e.g. "G0026"
    const greek   = cols[3].trim();
    const translit = cols[4].trim();
    const morph   = cols[5].trim(); // e.g. "G:N-F"
    const gloss   = cols[6].trim();
    const meaning = cols[7].trim();

    // ギリシャ語語彙のみ（名前・ヘブライ語・アラム語を除外）
    if (!morph.startsWith('G:')) continue;
    // 基本番号のみ（G0001–G5624）
    const num = parseInt(eStrong.slice(1), 10);
    if (isNaN(num) || num < 1 || num > 5624) continue;

    // Strong's 番号を "G####" 形式（ゼロパディングなし）に正規化して既存データと合わせる
    const strongs = 'G' + num.toString();

    const entryText = cleanHtml(meaning);
    const pos = morphToPos(morph);

    map.set(strongs, { lemma: greek, translit, pos, gloss, entryText, eStrong });
  }
  return map;
}

// HTML タグ・参照を Claude 向けの読みやすいテキストに変換
function cleanHtml(html) {
  return html
    // <br> 系を改行に
    .replace(/<BR\s*\/?>/gi, '\n')
    // <b>word</b> → word
    .replace(/<b>([^<]*)<\/b>/gi, '$1')
    // <ref='Jhn.3.16'>Jhn.3:16</ref> → Jhn.3:16
    .replace(/<ref=[^>]*>([^<]*)<\/ref>/gi, '$1')
    // <a href=...> ツールチップ（文献参照）→ 括弧書きに
    .replace(/<a[^>]*title="([^"]*)"[^>]*>[^<]*<\/a>/gi, (_, t) => {
      const refs = t.match(/NT\.[A-Za-z]+\.\d+\.\d+/g);
      return refs ? `（${refs.map(r => r.replace('NT.', '').replace(/\.(\d+)\.(\d+)/, ' $1:$2')).join(', ')}）` : '';
    })
    // <Level2>, <Level3> など
    .replace(/<Level\d>[^<]*<\/Level\d>/gi, '')
    // <i>word</i>
    .replace(/<i>([^<]*)<\/i>/gi, '$1')
    // 残りのタグを除去
    .replace(/<[^>]+>/g, '')
    // 空白整理
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 800);
}

function morphToPos(morph) {
  const t = morph.slice(2).split('-')[0];
  const map = { N: '名詞', V: '動詞', A: '形容詞', Adv: '副詞', Prep: '前置詞', Conj: '接続詞', Part: '助詞', Art: '冠詞', Intj: '感嘆詞', Neg: '否定詞', PerP: '人称代名詞', DemP: '指示代名詞', RelP: '関係代名詞', Intg: '疑問詞', PosP: '所有代名詞', RefP: '再帰代名詞', ImpP: '非人称代名詞', Cor: '相関詞', Cond: '条件詞' };
  return map[t] ?? t;
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
async function generatePrepositionEntry(strongs, lemma, translit, entryText, apiKey) {
  const system =
    'あなたは新約聖書コイネーギリシャ語の専門辞書編纂者です。' +
    '正確で学術的な日本語辞書エントリを JSON 形式で作成します。';

  const user = `前置詞「${lemma}」（${translit}、Strong's ${strongs}）の詳細な日本語辞書エントリを作成してください。

【英語辞典エントリ（Abbott-Smith / Tyndale House, CC BY 4.0）】
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
    .map(({ strongs, lemma, translit, pos, gloss, entryText }) =>
      `{"strongs":"${strongs}","lemma":"${lemma}","translit":"${translit}","pos":"${pos}","gloss":"${gloss}","entry":"${entryText.replace(/\n/g, ' ').replace(/"/g, "'").slice(0, 500)}"}`
    )
    .join('\n');

  const user = `以下の新約聖書ギリシャ語単語について、Abbott-Smith/Tyndale House 辞典の英語エントリをもとに日本語辞書エントリを作成してください。

入力（各行 JSON）:
${input}

要件:
- definitionJa: 短い訳語・定義（15字以内）
- detailJa: 主要な意味・用法。複数ある場合は①②③番号付き。各用法に新約箇所を付記（例: ヨハ3:16）。80〜200字。

出力: JSON 配列のみ（説明文不要）
[{"strongs":"G1234","definitionJa":"...","detailJa":"..."},...]`;

  const text = await callClaude('claude-haiku-4-5-20251001', system, user, apiKey, 4096);
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
  const strongsArg = args.findIndex(a => a === '--strongs');
  const strongsFilter = strongsArg !== -1 ? new Set(args[strongsArg + 1].split(',').map(s => s.trim())) : null;

  console.log('\n=== Gbible 辞書生成 (TBESG → 日本語) ===');
  if (prepOnly) console.log('モード: 前置詞のみ');
  else if (strongsFilter) console.log(`モード: 指定語 ${[...strongsFilter].join(', ')}`);
  else if (limit !== Infinity) console.log(`モード: 上位 ${limit} 語`);

  // 1. TBESG を取得・パース
  console.log('\n[1/4] TBESG 辞典を読み込み中...');
  const tbesgText = await fetchCached(TBESG_URL, 'tbesg.txt');
  const tbesgMap = parseTBESG(tbesgText);
  console.log(`  ${tbesgMap.size} エントリ取得`);

  // 2. 既存 lexicon.json をロード
  console.log('\n[2/4] 既存エントリを確認...');
  let existing = {};
  if (existsSync(OUTPUT_PATH)) {
    try { existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')); } catch {}
  }
  console.log(`  既存: ${Object.keys(existing).length} エントリ`);

  // 3. 処理対象を決定
  console.log('\n[3/4] 対象語を選定...');
  let entries = [...tbesgMap.entries()];

  if (strongsFilter) {
    entries = entries.filter(([s]) => strongsFilter.has(s));
  } else if (prepOnly) {
    entries = entries.filter(([s]) => PREP_LEGACY.has(s));
  } else if (limit !== Infinity) {
    entries = entries.slice(0, limit);
  }

  const todo = entries.filter(([s]) => !existing[s]);
  console.log(`  対象: ${entries.length} 語 / 未生成: ${todo.length} 語`);

  if (todo.length === 0) {
    console.log('  すべて生成済みです。');
    return;
  }

  // 4. 前置詞: Sonnet で個別生成（未生成 or 強制再生成）
  const prepTodo = todo.filter(([s]) => PREP_LEGACY.has(s));
  if (prepTodo.length > 0) {
    console.log(`\n  前置詞 ${prepTodo.length} 語 → claude-sonnet-4-6`);
    for (const [strongs, { lemma, translit, entryText }] of prepTodo) {
      process.stdout.write(`    ${lemma} (${strongs})... `);
      try {
        const result = await generatePrepositionEntry(strongs, lemma, translit, entryText, apiKey);
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
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 0), 'utf-8');
      await new Promise(res => setTimeout(res, 1200));
    }
  }

  // 5. 一般語: Haiku でバッチ生成
  const regularTodo = todo.filter(([s]) => !PREP_LEGACY.has(s));
  if (regularTodo.length > 0) {
    const BATCH = 20;
    console.log(`\n  一般語 ${regularTodo.length} 語 → claude-haiku（${BATCH}語/バッチ）`);
    for (let i = 0; i < regularTodo.length; i += BATCH) {
      const chunk = regularTodo.slice(i, i + BATCH);
      const batchInput = chunk.map(([strongs, info]) => ({
        strongs,
        lemma: info.lemma,
        translit: info.translit,
        pos: info.pos,
        gloss: info.gloss,
        entryText: info.entryText,
      }));

      const progress = `${i + 1}〜${Math.min(i + BATCH, regularTodo.length)}/${regularTodo.length}`;
      process.stdout.write(`    バッチ ${progress}... `);

      try {
        const results = await generateBatchEntries(batchInput, apiKey);
        for (const r of results) {
          if (!r?.strongs) continue;
          const info = tbesgMap.get(r.strongs);
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

      if ((i + BATCH) % 100 === 0 || i + BATCH >= regularTodo.length) {
        mkdirSync(DATA_DIR, { recursive: true });
        writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 0), 'utf-8');
        const kb = Math.round(Buffer.byteLength(JSON.stringify(existing)) / 1024);
        process.stdout.write(`    → 保存済み (${Object.keys(existing).length}エントリ, ${kb}KB)\n`);
      }

      if (i + BATCH < regularTodo.length) {
        await new Promise(res => setTimeout(res, 800));
      }
    }
  }

  // 最終保存
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(existing, null, 0), 'utf-8');
  const total = Object.keys(existing).length;
  const kb = Math.round(Buffer.byteLength(JSON.stringify(existing)) / 1024);
  console.log(`\n完了: ${total} エントリ → ${OUTPUT_PATH} (${kb} KB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
