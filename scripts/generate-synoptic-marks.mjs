#!/usr/bin/env node
/**
 * scripts/generate-synoptic-marks.mjs
 *
 * 共観福音書比較ページ用の「三者共通点マーカー」を決定的に生成する。
 * AIは使わない。このデータセットでは strongs番号がlemmaと1:1対応するため、
 * 「同一レンマ」判定は「同一strongs」と機械的に同義。
 *
 * アルゴリズム（ペリコーペごと）:
 *   1. 該当する各書の対象節範囲から単語を抽出
 *   2. 品詞フィルタ: 名詞(N)/動詞(V)/形容詞(A)/副詞(D)のみを対象
 *      （冠詞・接続詞・代名詞・前置詞・間投詞・粒子は除外）
 *   3. 頻出度フィルタ: NT全体での出現回数が FREQ_THRESHOLD を超える語を除外
 *      （λέγω, εἰμί 等の恒常的高頻度語のノイズを除く）
 *   4. 残った語を strongs でグループ化し、2書以上にまたがるグループのみ採用
 *      （🟨🟥🟩🟦 の判定は表示側で wordId の書プレフィックスから動的に算出する）
 *
 * 使い方:
 *   node scripts/generate-synoptic-marks.mjs
 */

import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PERICOPE_DEFS } from './synoptic-pericope-defs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NT_DIR = join(ROOT, 'public', 'data', 'nt');
const OUT_DIR = join(ROOT, 'public', 'data', 'synoptic');

// NT全体でこの回数を超えて出現する語は「恒常的高頻度語」としてマーカー対象から除外。
// 実データ検証: G1096(γίνομαι,667) G1510(εἰμί,2456) G3004(λέγω,2345) は除外され、
// G4143(舟,67) G417(風,31) G5219(従う,21) G622(滅びる,90) は残ることを確認済み。
const FREQ_THRESHOLD = 400;

function posOf(morph) {
  const idx = morph.indexOf('-');
  return idx === -1 ? morph : morph.slice(0, idx);
}

function isContentPOS(morph) {
  const pos = posOf(morph);
  return pos === 'N' || pos === 'V' || pos === 'A' || pos === 'D';
}

function inRange(ch, v, r) {
  if (ch < r.startChapter || ch > r.endChapter) return false;
  if (ch === r.startChapter && v < r.startVerse) return false;
  if (ch === r.endChapter && v > r.endVerse) return false;
  return true;
}

function collectWords(bookData, ranges) {
  const result = [];
  for (const [key, words] of Object.entries(bookData.words)) {
    const [chStr, vStr] = key.split(':');
    const ch = Number(chStr);
    const v = Number(vStr);
    if (ranges.some((r) => inRange(ch, v, r))) {
      result.push(...words);
    }
  }
  result.sort((a, b) => {
    const pa = a.id.split('-');
    const pb = b.id.split('-');
    const cha = Number(pa[1]), va = Number(pa[2]), wa = Number(pa[3].slice(1));
    const chb = Number(pb[1]), vb = Number(pb[2]), wb = Number(pb[3].slice(1));
    return cha - chb || va - vb || wa - wb;
  });
  return result;
}

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

console.log('\n=== Gbible 共観福音書マーカー生成 ===\n');

const concordance = loadJson(join(NT_DIR, 'concordance.json'));
const bookDataCache = new Map();
function loadBookData(bookId) {
  if (!bookDataCache.has(bookId)) {
    bookDataCache.set(bookId, loadJson(join(NT_DIR, `${bookId}.json`)));
  }
  return bookDataCache.get(bookId);
}

const pericopes = [];

// 一致マーカー（🟨🟥🟩🟦）はマタイ・マルコ・ルカの3書限定。
// ヨハネは passages に含めて表示はするが、マッチグループ計算からは除外する。
const MARKABLE_BOOKS = new Set(["matthew", "mark", "luke"]);

for (const def of PERICOPE_DEFS) {
  const allWords = []; // { bookId, word }
  for (const passage of def.passages) {
    if (!MARKABLE_BOOKS.has(passage.bookId)) continue;
    const bookData = loadBookData(passage.bookId);
    const words = collectWords(bookData, passage.ranges);
    for (const word of words) allWords.push({ bookId: passage.bookId, word });
  }

  const afterPOS = allWords.filter(({ word }) => isContentPOS(word.morph));
  const candidates = afterPOS.filter(
    ({ word }) => (concordance[word.strongs]?.total ?? 0) <= FREQ_THRESHOLD,
  );

  const byStrongs = new Map();
  for (const c of candidates) {
    if (!byStrongs.has(c.word.strongs)) byStrongs.set(c.word.strongs, []);
    byStrongs.get(c.word.strongs).push(c);
  }

  const matchGroups = [];
  let n = 1;
  const excludedHighFreqSample = [];
  for (const { word } of afterPOS) {
    const total = concordance[word.strongs]?.total ?? 0;
    if (total > FREQ_THRESHOLD && excludedHighFreqSample.length < 5 &&
        !excludedHighFreqSample.some((s) => s.strongs === word.strongs)) {
      excludedHighFreqSample.push({ strongs: word.strongs, greek: word.greek, total });
    }
  }
  for (const [strongs, items] of byStrongs) {
    const bookSet = new Set(items.map((i) => i.bookId));
    if (bookSet.size >= 2) {
      matchGroups.push({
        id: `g${n++}`,
        strongs,
        wordIds: items.map((i) => i.word.id),
        reviewed: false,
      });
    }
  }

  pericopes.push({
    id: def.id,
    title: def.title,
    group: def.group,
    passages: def.passages,
    matchGroups,
  });

  console.log(`[${def.title}]`);
  console.log(`  対象語数: ${allWords.length} → 品詞フィルタ後: ${afterPOS.length} → 頻出度フィルタ後: ${candidates.length}`);
  console.log(`  一致グループ数: ${matchGroups.length}`);
  if (matchGroups.length > 0) {
    const sample = matchGroups.slice(0, 5).map((g) => {
      const books = new Set(g.wordIds.map((id) => id.split('-')[0]));
      return `${g.strongs}(${[...books].join('+')})`;
    });
    console.log(`  例: ${sample.join(', ')}`);
  }
  if (excludedHighFreqSample.length > 0) {
    console.log(`  除外された高頻度語の例: ${excludedHighFreqSample.map((s) => `${s.greek}(${s.total}回)`).join(', ')}`);
  }
  console.log('');
}

mkdirSync(OUT_DIR, { recursive: true });
const outPath = join(OUT_DIR, 'pericopes.json');
writeFileSync(outPath, JSON.stringify({ version: 1, pericopes }, null, 0));
console.log(`✓ 書き出し完了: ${outPath}`);
