#!/usr/bin/env node
/**
 * 手順4: AI による二重チェック — 生成した訳・辞書を、別の依頼（校閲役）が点検して問題だけを挙げる
 *
 *   node scripts/ot/verify.mjs psalms --chapters 1-41 --dry-run
 *   node scripts/ot/verify.mjs psalms --chapters 1-41            # 文脈訳と辞書の両方
 *   node scripts/ot/verify.mjs psalms --only gloss               # 文脈訳だけ
 *   node scripts/ot/verify.mjs psalms --revised                  # revise.mjs で直した項目だけを点検し直す
 *
 * 出力: data/ot/verify/<書>.json
 *   { gloss: { 単語ID: { severity, problem, suggestion } }, lexicon: { Strong's: {...} } }
 * 指摘は自動では反映しない。check.mjs のレビュー表に「要確認」として載る。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { getBook } from './books.mjs';
import { buildParams, clearJob, estimate, runRequests } from './batch.mjs';
import { textPath } from './build-text.mjs';
import { glossPath } from './gen-gloss.mjs';
import {
  MASTER_LEXICON, PREFIX_JA, STYLE_DIR, WORK_DIR, compareVerseKeys, loadLexiconSources, parseArgs, parseChapterSpec,
  readJson, writeJson,
} from './lib.mjs';

const STYLE_GUIDE = readFileSync(join(STYLE_DIR, 'style-guide.md'), 'utf-8');
const NAMES = readJson(join(STYLE_DIR, 'names-ja.json')).entries;
const LEX_PER_REQUEST = 8;

export function verifyPath(bookId) {
  return join(WORK_DIR, 'verify', `${bookId}.json`);
}

const SYSTEM = `あなたは旧約聖書ヘブル語の校閲者です。別の担当者が作った日本語の訳・辞書項目を点検し、**誤りや基準違反だけ**を指摘します。問題のない項目には何も書きません。

点検の基準は次のスタイルガイドです。

${STYLE_GUIDE}

## 固有名詞対照表
${Object.entries(NAMES).map(([k, v]) => `${k}: ${v}`).join('\n')}

## 指摘の基準
- severity "error": 意味の誤り、形態（時制・人称・態・数）の取り違え、接頭辞・接尾辞の訳し落としや誤り、固有名詞の表記違反、存在しない・その語が使われていない聖書箇所、日本語訳聖書本文の引用
- severity "warn": 誤りではないが、より適切な訳がある／文字数超過／表記ゆれ／説明が資料から外れている疑い
- 好みの違いだけのものは指摘しない。
- suggestion には、そのまま差し替えられる修正案を書く（辞書は該当フィールド名と修正案）。`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['issues'],
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'severity', 'problem', 'suggestion'],
        properties: {
          id: { type: 'string', description: '単語ID または Strong\'s 番号' },
          severity: { type: 'string', enum: ['error', 'warn'] },
          problem: { type: 'string' },
          suggestion: { type: 'string' },
        },
      },
    },
  },
};

function glossRequests(book, text, glosses, master, chapters, onlyIds = null) {
  const byChapter = new Map();
  for (const key of Object.keys(text.verses).sort(compareVerseKeys)) {
    const c = Number(key.split(':')[0]);
    if (chapters && !chapters.includes(c)) continue;
    if (onlyIds && !text.verses[key].some((w) => onlyIds.has(w.id))) continue;
    if (!byChapter.has(c)) byChapter.set(c, []);
    byChapter.get(c).push(key);
  }
  const requests = [];
  for (const [c, keys] of byChapter) {
    // 1回 12 節まで
    for (let i = 0; i < keys.length; i += 12) {
      const part = keys.slice(i, i + 12);
      const lines = part.map((k) => {
        const ws = text.verses[k];
        const rows = ws.map((w) => {
          const lex = master[w.strongs];
          const pre = w.prefixes.map((p) => PREFIX_JA[p]).join('＋') || '-';
          const kq = w.kq?.part === 1
            ? ` | 書かれた形（ケティブ）: ${w.kq.ketiv}（${w.kq.ketivMorph}）→ 訳: ${glosses[w.id]?.ketivGloss ?? '（なし）'}`
            : '';
          const target = onlyIds?.has(w.id) ? ' ▲点検対象' : '';
          return `${w.id} | ${w.text} | ${pre} | ${w.morph} | 辞書: ${lex?.glossJa ?? '-'} | 訳: ${glosses[w.id]?.gloss ?? '（なし）'}${kq}${target}`;
        });
        return `### ${book.abbr}${k}\n${ws.map((w) => w.text).join(' ')}\n${rows.join('\n')}`;
      });
      requests.push({
        custom_id: `vg-${c}-${part[0].split(':')[1]}`,
        params: buildParams({
          system: SYSTEM,
          user: onlyIds
            ? `次の節で「▲点検対象」の付いた語の「訳」（2ペインの文脈訳）だけを点検してください。ほかの語は文脈として参照するだけにしてください。\n\n${lines.join('\n\n')}`
            : `次の各語の「訳」（2ペインの文脈訳）を点検してください。\n\n${lines.join('\n\n')}`,
          schema: SCHEMA,
          effort: 'high',
          maxTokens: 32000,
        }),
      });
    }
  }
  return requests;
}

function lexiconRequests(book, text, master, lookup, chapters, onlyIds = null) {
  const strongsSet = new Set();
  for (const [key, ws] of Object.entries(text.verses)) {
    if (onlyIds) break;
    if (chapters && !chapters.includes(Number(key.split(':')[0]))) continue;
    for (const w of ws) {
      const e = master[w.strongs];
      if (e && e.status === 'draft') strongsSet.add(w.strongs);
    }
  }
  const list = onlyIds ? [...onlyIds] : [...strongsSet];
  const requests = [];
  for (let i = 0; i < list.length; i += LEX_PER_REQUEST) {
    const part = list.slice(i, i + LEX_PER_REQUEST);
    const body = part.map((s) => {
      const e = master[s];
      const src = lookup(s);
      return `### ${s} ${e.lemma}（${e.translit ?? ''}）
【資料】${src.sourceText.slice(0, 1500)}
【glossJa】${e.glossJa}
【definitionJa】${e.definitionJa}
【detailJa】${e.detailJa}`;
    }).join('\n\n');
    requests.push({
      custom_id: `vl-${i / LEX_PER_REQUEST + 1}`,
      strongs: part,
      params: buildParams({
        system: SYSTEM,
        user: `次の辞書項目を、添付の英語資料と照らして点検してください（${book.name}の作業分）。id には Strong's 番号を書くこと。\n\n${body}`,
        schema: SCHEMA,
        effort: 'high',
        maxTokens: 32000,
      }),
    });
  }
  return requests;
}

async function main() {
  const { flags, positional } = parseArgs();
  const bookId = positional[0];
  if (!bookId) {
    console.error('使い方: node scripts/ot/verify.mjs <書ID> [--chapters 1-41] [--only gloss|lexicon] [--dry-run]');
    process.exit(1);
  }
  const book = getBook(bookId);
  const chapters = parseChapterSpec(flags.chapters);
  const text = readJson(textPath(bookId));
  const glosses = readJson(glossPath(bookId), {});
  const master = readJson(MASTER_LEXICON, {});
  const only = flags.only;

  // --revised: 自動修正した項目だけを点検し直す
  const revised = Boolean(flags.revised);
  const prev = readJson(verifyPath(bookId), { gloss: {}, lexicon: {} });
  const needsRecheck = (issue) => issue?.resolution === 'fixed' && !(issue.reverifiedAt >= issue.resolvedAt);
  const inScope = (id) => {
    const c = Number(id.split('-').at(-3));
    return !chapters || chapters.includes(c);
  };
  const revisedGloss = revised
    ? new Set(Object.keys(prev.gloss).filter((id) => needsRecheck(prev.gloss[id]) && inScope(id)))
    : null;
  const revisedLex = revised
    ? new Set(Object.keys(prev.lexicon).filter((s) => needsRecheck(prev.lexicon[s]) && master[s]?.status === 'draft'))
    : null;

  const requests = [];
  if (only !== 'lexicon' && (!revised || revisedGloss.size)) {
    requests.push(...glossRequests(book, text, glosses, master, chapters, revisedGloss));
  }
  if (only !== 'gloss' && (!revised || revisedLex.size)) {
    requests.push(...lexiconRequests(book, text, master, await loadLexiconSources(), chapters, revisedLex));
  }

  const est = estimate(requests, { outputTokensPerRequest: 8000 });
  console.log(`${book.name}${chapters ? `（${flags.chapters}章）` : ''}: 点検依頼 ${requests.length} 件`);
  console.log(`  概算: 約 $${est.usd.toFixed(2)}（Batch 半額・思考分を含む大まかな見積もり）`);
  if (flags['dry-run'] || requests.length === 0) return;

  const job = `verify-${bookId}${flags.chapters ? `-${flags.chapters}` : ''}${only ? `-${only}` : ''}${revised ? '-revised' : ''}`;
  const results = await runRequests(job, requests.map(({ custom_id, params }) => ({ custom_id, params })), {
    direct: Boolean(flags.direct),
  });

  const out = prev;
  const now = new Date().toISOString();
  if (revised) {
    // 修正した項目の再点検: 新しい指摘があれば差し替え（未解決に戻る）、なければ再点検済みの印を付ける
    let reopened = 0;
    let ok = 0;
    for (const req of requests) {
      const r = results[req.custom_id];
      if (!r?.json) continue;
      const isGloss = req.custom_id.startsWith('vg-');
      const target = isGloss ? out.gloss : out.lexicon;
      const scope = isGloss ? revisedGloss : revisedLex;
      const found = new Map(r.json.issues.filter((i) => scope.has(i.id)).map((i) => [i.id, i]));
      const ids = isGloss
        ? [...scope].filter((id) => req.params.messages[0].content.includes(id))
        : req.strongs;
      for (const id of ids) {
        const issue = found.get(id);
        if (issue) {
          target[id] = {
            severity: issue.severity, problem: issue.problem, suggestion: issue.suggestion, checkedAt: now,
            previous: target[id],
          };
          reopened++;
        } else if (target[id]) {
          target[id].reverifiedAt = now;
          ok++;
        }
      }
    }
    writeJson(verifyPath(bookId), out);
    clearJob(job);
    console.log(`✓ 再点検: 問題なし ${ok} / 新たな指摘 ${reopened}（新たな指摘は revise.mjs で再び直せます）`);
    return;
  }
  // 点検し直した範囲の古い指摘は消す（直した項目の指摘が残らないように）
  for (const [key, ws] of Object.entries(text.verses)) {
    if (chapters && !chapters.includes(Number(key.split(':')[0]))) continue;
    for (const w of ws) {
      if (only !== 'lexicon') delete out.gloss[w.id];
      if (only !== 'gloss' && master[w.strongs]?.status === 'draft') delete out.lexicon[w.strongs];
    }
  }
  let n = 0;
  const failed = [];
  for (const req of requests) {
    const r = results[req.custom_id];
    if (!r?.json) {
      failed.push(`${req.custom_id}: ${r?.error ?? '結果なし'}`);
      continue;
    }
    const target = req.custom_id.startsWith('vg-') ? out.gloss : out.lexicon;
    for (const issue of r.json.issues) {
      target[issue.id] = { severity: issue.severity, problem: issue.problem, suggestion: issue.suggestion, checkedAt: now };
      n++;
    }
  }
  // どこまで点検したかを記録する（公開時の確認に使う）
  out.checked ??= { gloss: {}, lexicon: {} };
  const failedIds = new Set(failed.map((f) => f.split(':')[0]));
  for (const req of requests) {
    if (failedIds.has(req.custom_id)) continue;
    if (req.custom_id.startsWith('vg-')) out.checked.gloss[req.custom_id.split('-')[1]] = now;
  }
  if (only !== 'gloss') {
    for (const req of requests.filter((r) => r.custom_id.startsWith('vl-') && !failedIds.has(r.custom_id))) {
      for (const s of req.strongs) out.checked.lexicon[s] = now;
    }
  }
  writeJson(verifyPath(bookId), out);
  clearJob(job);
  console.log(`✓ 指摘 ${n} 件を保存しました → ${verifyPath(bookId)}`);
  if (failed.length) console.log(`✗ 失敗 ${failed.length} 件:\n  ${failed.slice(0, 20).join('\n  ')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
