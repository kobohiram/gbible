#!/usr/bin/env node
/**
 * 辞書（3ペイン）だけの点検と自動修正 — 書をまたいで、作り直した辞書項目をまとめて扱う
 *
 *   node scripts/ot/lexicon-qa.mjs verify --dry-run          # まだ点検していない作り直し済みの項目を点検（費用の確認）
 *   node scripts/ot/lexicon-qa.mjs verify                    # 点検（Batch）
 *   node scripts/ot/lexicon-qa.mjs revise                    # 指摘と自動チェックの違反を受けて自動修正（Batch）
 *   node scripts/ot/lexicon-qa.mjs verify --revised          # 直した項目だけを再点検
 *   … --limit 200   件数の上限（予算を抑えるとき。出現回数の多い語から）
 *   … --direct      Batch を使わず即時実行
 *
 * 指摘は data/ot/verify/lexicon.json に保存する（publish.mjs が「AI の指摘」として表示に使う）。
 */
import { join } from 'path';
import { buildParams, clearJob, estimate, runRequests, MODEL } from './batch.mjs';
import { checkLexicon, loadAvailableTexts, loadVerseCounts } from './check.mjs';
import { LEX_SCHEMA, SYSTEM as REVISE_SYSTEM } from './revise.mjs';
import { LEX_PER_REQUEST, SCHEMA as VERIFY_SCHEMA, SYSTEM as VERIFY_SYSTEM } from './verify.mjs';
import { textPath } from './build-text.mjs';
import { MASTER_LEXICON, STYLE_DIR, WORK_DIR, loadLexiconSources, parseArgs, readJson, writeJson } from './lib.mjs';
import { OT_BOOKS } from './books.mjs';

const QA_PATH = join(WORK_DIR, 'verify', 'lexicon.json');
const NAMES = readJson(join(STYLE_DIR, 'names-ja.json')).entries;

export function loadLexiconQa() {
  const qa = readJson(QA_PATH, null);
  if (qa) return qa;
  // 初回: 書ごとに点検済みの分（詩篇の試験分など）を引き継ぐ
  const seeded = { lexicon: {}, checked: {} };
  for (const id of Object.keys(OT_BOOKS)) {
    const v = readJson(join(WORK_DIR, 'verify', `${id}.json`));
    if (!v) continue;
    Object.assign(seeded.lexicon, v.lexicon ?? {});
    Object.assign(seeded.checked, v.checked?.lexicon ?? {});
  }
  return seeded;
}

/** 本文データのある書での出現回数（多い語から処理するため） */
function frequencies() {
  const freq = new Map();
  for (const id of Object.keys(OT_BOOKS)) {
    const t = readJson(textPath(id));
    if (!t) continue;
    for (const ws of Object.values(t.verses)) for (const w of ws) freq.set(w.strongs, (freq.get(w.strongs) ?? 0) + 1);
  }
  return freq;
}

const isOpen = (issue) => issue && !issue.resolution;
const needsRecheck = (issue) => issue?.resolution === 'fixed' && !(issue.reverifiedAt >= issue.resolvedAt);

async function verify(flags, master, qa, lookup, freq) {
  let targets = Object.values(master)
    .filter((e) => e.status === 'draft')
    .map((e) => e.strongs)
    .filter((s) => (flags.revised ? needsRecheck(qa.lexicon[s]) : !qa.checked[s]));
  targets.sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
  if (flags.limit) targets = targets.slice(0, Number(flags.limit));

  const requests = [];
  for (let i = 0; i < targets.length; i += LEX_PER_REQUEST) {
    const part = targets.slice(i, i + LEX_PER_REQUEST);
    const body = part.map((s) => {
      const e = master[s];
      return `### ${s} ${e.lemma}（${e.translit ?? ''}）
【資料】${lookup(s).sourceText.slice(0, 1500)}
【glossJa】${e.glossJa}
【definitionJa】${e.definitionJa}
【detailJa】${e.detailJa}`;
    }).join('\n\n');
    requests.push({
      custom_id: `ql-${i / LEX_PER_REQUEST + 1}`,
      strongs: part,
      params: buildParams({
        system: VERIFY_SYSTEM,
        user: `次の辞書項目を、添付の英語資料と照らして点検してください。id には Strong's 番号を書くこと。\n\n${body}`,
        schema: VERIFY_SCHEMA,
        effort: 'high',
        maxTokens: 32000,
      }),
    });
  }
  return { targets, requests };
}

function revise(flags, master, qa, lookup, freq) {
  const verseCounts = loadVerseCounts();
  const texts = loadAvailableTexts();
  const targets = [];
  for (const e of Object.values(master)) {
    if (e.status !== 'draft' || !qa.checked[e.strongs]) continue;
    const issues = [];
    let hasRuleError = false;
    const v = qa.lexicon[e.strongs];
    if (isOpen(v)) issues.push(`校閲者（${v.severity}）: ${v.problem}\n  修正案: ${v.suggestion}`);
    for (const p of checkLexicon(e, verseCounts, texts)) {
      if (typeof p === 'string') {
        issues.push(`自動チェック: ${p}`);
        hasRuleError = true;
      }
    }
    if (issues.length) targets.push({ strongs: e.strongs, issues, hasRuleError });
  }
  targets.sort((a, b) => (freq.get(b.strongs) ?? 0) - (freq.get(a.strongs) ?? 0));
  const limited = flags.limit ? targets.slice(0, Number(flags.limit)) : targets;

  const requests = limited.map(({ strongs: s, issues, hasRuleError }) => {
    const e = master[s];
    return {
      custom_id: `qr-${s}`,
      strongs: s,
      hasRuleError,
      params: buildParams({
        system: REVISE_SYSTEM,
        user: `辞書項目 ${s} ${e.lemma}（${e.translit ?? ''}）への指摘を検討し、最終版を返してください。

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
  return { targets: limited.map((t) => t.strongs), requests };
}

async function main() {
  const { flags, positional } = parseArgs();
  const mode = positional[0];
  if (mode !== 'verify' && mode !== 'revise') {
    console.error('使い方: node scripts/ot/lexicon-qa.mjs verify|revise [--revised] [--limit N] [--dry-run] [--direct]');
    process.exit(1);
  }
  const master = readJson(MASTER_LEXICON, {});
  const qa = loadLexiconQa();
  const lookup = await loadLexiconSources();
  const freq = frequencies();

  const { targets, requests } = mode === 'verify'
    ? await verify(flags, master, qa, lookup, freq)
    : revise(flags, master, qa, lookup, freq);

  const est = estimate(requests, { outputTokensPerRequest: mode === 'verify' ? 8000 : 5000 });
  console.log(`${mode === 'verify' ? (flags.revised ? '再点検' : '点検') : '自動修正'}: 対象 ${targets.length} 語 / 依頼 ${requests.length} 件`);
  console.log(`  概算: 約 $${est.usd.toFixed(2)}（Batch 半額・大まかな見積もり。実費はこれより少ないことが多い）`);
  if (flags['dry-run'] || requests.length === 0) return;

  const job = `lexicon-qa-${mode}${flags.revised ? '-revised' : ''}`;
  const results = await runRequests(job, requests.map(({ custom_id, params }) => ({ custom_id, params })), {
    direct: Boolean(flags.direct),
  });
  const now = new Date().toISOString();

  if (mode === 'verify') {
    let found = 0;
    let ok = 0;
    for (const req of requests) {
      const r = results[req.custom_id];
      if (!r?.json) continue;
      const issues = new Map(r.json.issues.filter((i) => req.strongs.includes(i.id)).map((i) => [i.id, i]));
      for (const s of req.strongs) {
        const issue = issues.get(s);
        if (issue) {
          qa.lexicon[s] = {
            severity: issue.severity, problem: issue.problem, suggestion: issue.suggestion, checkedAt: now,
            ...(flags.revised && qa.lexicon[s] ? { previous: qa.lexicon[s] } : {}),
          };
          found++;
        } else if (flags.revised && qa.lexicon[s]) {
          qa.lexicon[s].reverifiedAt = now;
          ok++;
        } else {
          delete qa.lexicon[s];
          ok++;
        }
        qa.checked[s] = now;
      }
    }
    writeJson(QA_PATH, qa);
    clearJob(job);
    console.log(`✓ 問題なし ${ok} / 指摘あり ${found} → ${QA_PATH}`);
    return;
  }

  const counts = { fixed: 0, disputed: 0, ok: 0, failed: 0 };
  for (const req of requests) {
    const r = results[req.custom_id];
    const s = req.strongs;
    const e = master[s];
    if (!r?.json) {
      counts.failed++;
      continue;
    }
    const hadReviewerIssue = isOpen(qa.lexicon[s]);
    if (r.json.decision === 'keep' && !hadReviewerIssue && !req.hasRuleError) {
      counts.ok++;
      continue;
    }
    const issue = qa.lexicon[s] ?? (qa.lexicon[s] = { severity: 'warn', problem: '自動チェックの指摘', suggestion: '' });
    if (r.json.decision === 'fix') {
      (e.revisions ??= []).push({ glossJa: e.glossJa, definitionJa: e.definitionJa, detailJa: e.detailJa, revisedAt: now });
      e.glossJa = NAMES[s] ?? (r.json.glossJa.trim() || e.glossJa);
      e.definitionJa = r.json.definitionJa.trim();
      e.detailJa = r.json.detailJa.trim();
      e.model = MODEL;
      issue.resolution = 'fixed';
      counts.fixed++;
    } else {
      issue.resolution = 'disputed';
      counts.disputed++;
    }
    issue.resolutionNote = r.json.reason;
    issue.resolvedAt = now;
  }
  writeJson(MASTER_LEXICON, master);
  writeJson(QA_PATH, qa);
  clearJob(job);
  console.log(`✓ 修正 ${counts.fixed} / 意見が分かれた ${counts.disputed} / 問題なし ${counts.ok}${counts.failed ? ` / 失敗 ${counts.failed}` : ''}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
