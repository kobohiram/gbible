/**
 * Claude への一括依頼（Message Batches API：料金は通常の半額）
 *
 * - 送信した batch ID を .ot-cache/batches/<job>.json に保存し、中断しても再実行で続きから受け取れる
 * - 結果は custom_id → { json, usage } の形で返す（構造化出力の JSON を解析済み）
 * - --direct 指定時は Batch を使わず通常 API で順に送る（数件の試行用）
 */
import Anthropic from '@anthropic-ai/sdk';
import { rmSync } from 'fs';
import { join } from 'path';
import { CACHE_DIR, loadEnvLocal, readJson, writeJson } from './lib.mjs';

export const MODEL = 'claude-opus-5-5';

/** 1M トークンあたりの料金（USD）。Batch はこの半額 */
const PRICE = { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 };

let client = null;
function getClient() {
  if (client) return client;
  loadEnvLocal();
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY が見つかりません（.env.local に設定してください）。');
  }
  client = new Anthropic();
  return client;
}

/**
 * 依頼1件分の params を作る
 * @param {object} o
 * @param {string} o.system   共通の指示（キャッシュされる）
 * @param {string} o.user     依頼本文
 * @param {object} o.schema   出力 JSON のスキーマ
 * @param {string} [o.effort] low / medium / high / xhigh / max
 */
export function buildParams({ system, user, schema, effort = 'high', maxTokens = 16000 }) {
  return {
    model: MODEL,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
    output_config: { effort, format: { type: 'json_schema', schema } },
  };
}

function statePath(job) {
  return join(CACHE_DIR, 'batches', `${job}.json`);
}

function parseMessage(message) {
  if (message.stop_reason === 'refusal') {
    return { error: `refusal: ${message.stop_details?.category ?? ''}` };
  }
  if (message.stop_reason === 'max_tokens') {
    return { error: 'max_tokens に達して出力が途中で切れました' };
  }
  const text = message.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return { json: JSON.parse(text), usage: message.usage };
  } catch {
    return { error: `JSON を解析できません: ${text.slice(0, 120)}` };
  }
}

function addUsage(total, usage) {
  if (!usage) return;
  total.input += usage.input_tokens ?? 0;
  total.output += usage.output_tokens ?? 0;
  total.cacheWrite += usage.cache_creation_input_tokens ?? 0;
  total.cacheRead += usage.cache_read_input_tokens ?? 0;
}

export function costUsd(usage, { batch = true } = {}) {
  const raw = (usage.input * PRICE.input + usage.output * PRICE.output
    + usage.cacheWrite * PRICE.cacheWrite + usage.cacheRead * PRICE.cacheRead) / 1e6;
  return batch ? raw / 2 : raw;
}

async function runDirect(requests) {
  const c = getClient();
  const results = {};
  const usage = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  for (const [i, req] of requests.entries()) {
    process.stdout.write(`  ${i + 1}/${requests.length} ${req.custom_id}\r`);
    try {
      const message = await c.messages.stream(req.params).finalMessage();
      results[req.custom_id] = parseMessage(message);
      addUsage(usage, message.usage);
    } catch (e) {
      results[req.custom_id] = { error: e instanceof Error ? e.message : String(e) };
    }
  }
  process.stdout.write('\n');
  console.log(`  使用量: 入力 ${usage.input} / 出力 ${usage.output} / キャッシュ読込 ${usage.cacheRead} → 約 $${costUsd(usage, { batch: false }).toFixed(2)}`);
  return results;
}

/**
 * 依頼を送り、結果を待って返す。
 * @param {string} job 作業名（再開用のキー。例: "lexicon-psalms"）
 * @param {{custom_id: string, params: object}[]} requests
 */
export async function runRequests(job, requests, { direct = false, pollSeconds = 60 } = {}) {
  if (requests.length === 0) return {};
  if (direct) return runDirect(requests);

  const c = getClient();
  const path = statePath(job);
  let state = readJson(path);

  if (!state) {
    // 1 batch あたり最大 100,000 件
    const ids = [];
    for (let i = 0; i < requests.length; i += 50000) {
      const batch = await c.messages.batches.create({ requests: requests.slice(i, i + 50000) });
      ids.push(batch.id);
      console.log(`  送信しました: ${batch.id}（${Math.min(50000, requests.length - i)}件）`);
    }
    state = { job, batchIds: ids, createdAt: new Date().toISOString(), count: requests.length };
    writeJson(path, state);
  } else {
    console.log(`  送信済みの依頼を再開します: ${state.batchIds.join(', ')}`);
  }

  for (const id of state.batchIds) {
    for (;;) {
      const b = await c.messages.batches.retrieve(id);
      if (b.processing_status === 'ended') break;
      const n = b.request_counts;
      console.log(`  処理中 ${id}: 完了 ${n.succeeded + n.errored} / 処理中 ${n.processing}（${pollSeconds}秒後に再確認）`);
      await new Promise((r) => setTimeout(r, pollSeconds * 1000));
    }
  }

  const results = {};
  const usage = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
  for (const id of state.batchIds) {
    for await (const r of await c.messages.batches.results(id)) {
      if (r.result.type === 'succeeded') {
        results[r.custom_id] = parseMessage(r.result.message);
        addUsage(usage, r.result.message.usage);
      } else {
        results[r.custom_id] = { error: `batch ${r.result.type}` };
      }
    }
  }
  console.log(`  使用量: 入力 ${usage.input} / 出力 ${usage.output} / キャッシュ読込 ${usage.cacheRead} → 約 $${costUsd(usage).toFixed(2)}（Batch 半額適用）`);
  state.finishedAt = new Date().toISOString();
  state.usage = usage;
  writeJson(path, state);
  return results;
}

/** 作業の再開情報を消す（結果を取り込んだ後に呼ぶ） */
export function clearJob(job) {
  const path = statePath(job);
  const state = readJson(path);
  if (state) writeJson(join(CACHE_DIR, 'batches', 'done', `${job}-${Date.now()}.json`), state);
  // 取り込み済みの state は done/ に移し、次回は新規送信にする
  rmSync(path, { force: true });
}

/** 送信前の概算（文字数から大まかにトークン数を見積もる） */
export function estimate(requests, { outputTokensPerRequest }) {
  let systemChars = 0;
  let userChars = 0;
  const systems = new Set();
  for (const r of requests) {
    const sys = r.params.system[0].text;
    if (!systems.has(sys)) {
      systems.add(sys);
      systemChars += sys.length;
    }
    userChars += r.params.messages[0].content.length;
  }
  // 日本語・ヘブル語混在のため 1 文字 ≒ 1 トークンで安全側に見積もる
  const cachedSystemTokens = requests.length * (systemChars / Math.max(systems.size, 1));
  const usage = {
    input: userChars,
    output: requests.length * outputTokensPerRequest,
    cacheWrite: systemChars,
    cacheRead: cachedSystemTokens,
  };
  return { usage, usd: costUsd(usage) };
}
