#!/usr/bin/env node
/**
 * 手順4.5: AI の指摘を受けた自動修正 — 校閲（verify.mjs）の指摘と自動チェックの違反を、訳を作る側の AI に渡して直させる
 *
 *   node scripts/ot/revise.mjs psalms --chapters 1-41 --dry-run
 *   node scripts/ot/revise.mjs psalms --chapters 1-41
 *
 * - 指摘が正しければ直す（resolution: fixed）
 * - 校閲側の誤りと判断したら、理由を付けて元のまま残す（resolution: disputed）→ 人の確認に回る
 * 直した訳・辞書は status: draft のまま（人の確認はみんなで作る辞書で行う）。直す前の内容は revisions に残す。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { getBook } from './books.mjs';
import { buildParams, clearJob, estimate, runRequests, MODEL } from './batch.mjs';
import { textPath } from './build-text.mjs';
import { checkLexicon, loadAvailableTexts, loadVerseCounts } from './check.mjs';
import { glossPath } from './gen-gloss.mjs';
import { verifyPath } from './verify.mjs';
import {
  MASTER_LEXICON, PREFIX_JA, STYLE_DIR, compareVerseKeys, loadLexiconSources, parseArgs, parseChapterSpec,
  readJson, writeJson,
} from './lib.mjs';

const STYLE_GUIDE = readFileSync(join(STYLE_DIR, 'style-guide.md'), 'utf-8');
const NAMES = readJson(join(STYLE_DIR, 'names-ja.json')).entries;

export const SYSTEM = `あなたは旧約聖書ヘブル語の辞書編纂者で、自分が作った訳・辞書項目に対する校閲者の指摘を受けて、最終版を決めます。

判断の基準は次のスタイルガイドです。

${STYLE_GUIDE}

## 固有名詞対照表
${Object.entries(NAMES).map(([k, v]) => `${k}: ${v}`).join('\n')}

## 判断のしかた
- 指摘ごとに、ヘブル語の文法・語義と英語辞典資料に照らして、正しいかどうかを検討する。
- 正しい指摘は必ず反映する（decision: "fix"）。校閲者の修正案をそのまま使う必要はなく、より良い形があればそれを使う。
- 校閲者の指摘が誤っている、または好みの問題にすぎないと判断したときは、元のまま残し（decision: "keep"）、理由を具体的に書く。
- 指摘されていない部分は変えない。
- 出力は指定の JSON スキーマのみ。`;

const GLOSS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'decision', 'gloss', 'reason'],
        properties: {
          id: { type: 'string' },
          decision: { type: 'string', enum: ['fix', 'keep'] },
          gloss: { type: 'string', description: '最終版の訳（10文字以内）。keep のときは元の訳' },
          reason: { type: 'string', description: '判断の理由（1〜2文）' },
        },
      },
    },
  },
};

export const LEX_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['decision', 'glossJa', 'definitionJa', 'detailJa', 'reason'],
  properties: {
    decision: { type: 'string', enum: ['fix', 'keep'] },
    glossJa: { type: 'string' },
    definitionJa: { type: 'string' },
    detailJa: { type: 'string' },
    reason: { type: 'string', description: '判断の理由。指摘が複数あるときはそれぞれについて短く' },
  },
};

/** 未解決の指摘だけを対象にする（解決済み・人が確認済みのものは除く） */
function isOpen(issue) {
  return issue && !issue.resolution;
}

function glossRequests(book, text, glosses, verify, chapters) {
  const byChapter = new Map();
  for (const key of Object.keys(text.verses).sort(compareVerseKeys)) {
    const c = Number(key.split(':')[0]);
    if (chapters && !chapters.includes(c)) continue;
    const flagged = text.verses[key].filter((w) => {
      const g = glosses[w.id];
      return g && g.status === 'draft' && isOpen(verify.gloss[w.id]);
    });
    if (!flagged.length) continue;
    if (!byChapter.has(c)) byChapter.set(c, []);
    byChapter.get(c).push(key);
  }

  const requests = [];
  for (const [c, keys] of byChapter) {
    const body = keys.map((k) => {
      const ws = text.verses[k];
      const rows = ws.map((w) => {
        const pre = w.prefixes.map((p) => PREFIX_JA[p]).join('＋') || '-';
        const issue = glosses[w.id]?.status === 'draft' ? verify.gloss[w.id] : null;
        const mark = isOpen(issue)
          ? `\n    ▲指摘（${issue.severity}）: ${issue.problem}\n    ▲校閲者の修正案: ${issue.suggestion}`
          : '';
        return `${w.id} | ${w.text} | ${pre} | ${w.morph} | 訳: ${glosses[w.id]?.gloss ?? '（なし）'}${mark}`;
      });
      return `### ${book.abbr}${k}\n${ws.map((w) => w.text).join(' ')}\n${rows.join('\n')}`;
    }).join('\n\n');
    requests.push({
      custom_id: `rg-${c}`,
      params: buildParams({
        system: SYSTEM,
        user: `2ペインの文脈訳（10文字以内）に対する校閲者の指摘（▲）について、指摘のある語だけを items に返してください。\n\n${body}`,
        schema: GLOSS_SCHEMA,
        effort: 'high',
        maxTokens: 32000,
      }),
    });
  }
  return requests;
}

function lexiconRequests(book, text, master, verify, lookup, chapters) {
  const verseCounts = loadVerseCounts();
  const texts = loadAvailableTexts();
  const targets = new Map();
  for (const [key, ws] of Object.entries(text.verses)) {
    if (chapters && !chapters.includes(Number(key.split(':')[0]))) continue;
    for (const w of ws) {
      const e = master[w.strongs];
      if (!e || e.status !== 'draft' || targets.has(w.strongs)) continue;
      const issues = [];
      let hasRuleError = false;
      const v = verify.lexicon[w.strongs];
      if (isOpen(v)) issues.push(`校閲者（${v.severity}）: ${v.problem}\n  修正案: ${v.suggestion}`);
      for (const p of checkLexicon(e, verseCounts, texts)) {
        // 箇所の照合（warn）は関連語の説明で起こりうるので、確認を促すだけにとどめる
        if (typeof p === 'string') {
          issues.push(`自動チェック: ${p}`);
          hasRuleError = true;
        }
        else issues.push(`自動チェック（確認のみ。関連語の説明なら変更不要）: ${p.text}`);
      }
      if (issues.length) targets.set(w.strongs, { issues, hasRuleError });
    }
  }

  return [...targets].map(([s, { issues, hasRuleError }]) => {
    const e = master[s];
    return {
      custom_id: `rl-${s}`,
      strongs: s,
      hasRuleError,
      params: buildParams({
        system: SYSTEM,
        user: `辞書項目 ${s} ${e.lemma}（${e.translit ?? ''}）への指摘を検討し、最終版を返してください（${book.name}の作業分）。

【英語辞典資料】
${lookup(s).sourceText.slice(0, 3000)}

【現在の項目】
glossJa: ${e.glossJa}
definitionJa: ${e.definitionJa}
detailJa: ${e.detailJa}

【指摘】
${issues.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
        schema: LEX_SCHEMA,
        effort: 'high',
      }),
    };
  });
}

async function main() {
  const { flags, positional } = parseArgs();
  const bookId = positional[0];
  if (!bookId) {
    console.error('使い方: node scripts/ot/revise.mjs <書ID> [--chapters 1-41] [--dry-run] [--direct]');
    process.exit(1);
  }
  const book = getBook(bookId);
  const chapters = parseChapterSpec(flags.chapters);
  const text = readJson(textPath(bookId));
  const master = readJson(MASTER_LEXICON, {});
  const glosses = readJson(glossPath(bookId), {});
  const verify = readJson(verifyPath(bookId), { gloss: {}, lexicon: {} });

  const requests = [
    ...glossRequests(book, text, glosses, verify, chapters),
    ...lexiconRequests(book, text, master, verify, await loadLexiconSources(), chapters),
  ];
  const est = estimate(requests, { outputTokensPerRequest: 5000 });
  console.log(`${book.name}${chapters ? `（${flags.chapters}章）` : ''}: 修正依頼 ${requests.length} 件`);
  console.log(`  概算: 約 $${est.usd.toFixed(2)}（Batch 半額・思考分を含む大まかな見積もり）`);
  if (flags['dry-run'] || requests.length === 0) return;

  const job = `revise-${bookId}${flags.chapters ? `-${flags.chapters}` : ''}`;
  const results = await runRequests(job, requests.map(({ custom_id, params }) => ({ custom_id, params })), {
    direct: Boolean(flags.direct),
  });

  const now = new Date().toISOString();
  const counts = { fixed: 0, disputed: 0, failed: 0 };
  const report = [];
  for (const req of requests) {
    const r = results[req.custom_id];
    if (!r?.json) {
      counts.failed++;
      report.push(`✗ ${req.custom_id}: ${r?.error ?? '結果なし'}`);
      continue;
    }
    if (req.custom_id.startsWith('rg-')) {
      for (const it of r.json.items) {
        const g = glosses[it.id];
        const issue = verify.gloss[it.id];
        if (!g || !isOpen(issue) || g.status !== 'draft') continue;
        const next = it.gloss.trim();
        if (it.decision === 'fix' && next && [...next].length <= 10) {
          (g.revisions ??= []).push({ gloss: g.gloss, revisedAt: now });
          g.gloss = next;
          g.model = MODEL;
          issue.resolution = 'fixed';
          counts.fixed++;
          report.push(`修正 ${it.id}: 「${g.revisions.at(-1).gloss}」→「${next}」 ${it.reason}`);
        } else {
          issue.resolution = 'disputed';
          counts.disputed++;
          report.push(`意見が分かれた ${it.id}: 「${g.gloss}」のまま ${it.reason}`);
        }
        issue.resolutionNote = it.reason;
        issue.resolvedAt = now;
      }
    } else {
      const s = req.strongs;
      const e = master[s];
      const hadReviewerIssue = isOpen(verify.lexicon[s]);
      if (r.json.decision === 'keep' && !hadReviewerIssue && !req.hasRuleError) {
        // 自動チェックの注意（関連語の箇所照合など）だけで、作成側が問題なしと判断したもの
        report.push(`問題なし ${s}: ${r.json.reason}`);
        continue;
      }
      const issue = verify.lexicon[s] ?? (verify.lexicon[s] = { severity: 'warn', problem: '自動チェックの指摘', suggestion: '' });
      if (r.json.decision === 'fix') {
        (e.revisions ??= []).push({ glossJa: e.glossJa, definitionJa: e.definitionJa, detailJa: e.detailJa, revisedAt: now });
        e.glossJa = NAMES[s] ?? r.json.glossJa.trim();
        e.definitionJa = r.json.definitionJa.trim();
        e.detailJa = r.json.detailJa.trim();
        issue.resolution = 'fixed';
        counts.fixed++;
        report.push(`修正 ${s}: ${r.json.reason}`);
      } else {
        issue.resolution = 'disputed';
        counts.disputed++;
        report.push(`意見が分かれた ${s}: ${r.json.reason}`);
      }
      issue.resolutionNote = r.json.reason;
      issue.resolvedAt = now;
    }
  }

  writeJson(glossPath(bookId), glosses);
  writeJson(MASTER_LEXICON, master);
  writeJson(verifyPath(bookId), verify);
  clearJob(job);
  console.log(report.map((l) => `  ${l}`).join('\n'));
  console.log(`✓ 修正 ${counts.fixed} / 意見が分かれた ${counts.disputed}${counts.failed ? ` / 失敗 ${counts.failed}` : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
