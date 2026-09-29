#!/usr/bin/env node
/**
 * 手順5: 自動チェック ＋ レビュー表の作成
 *
 *   node scripts/ot/check.mjs psalms --chapters 1-41
 *
 * 1. ルールチェック（文字数・英字や記号の混入・固有名詞表記・存在しない聖書箇所 など）
 * 2. 人が確認すべき語を選ぶ
 *    - この書で初めて出る見出し語のうち、固有名詞・頻出上位・AI 校閲の指摘・ルール違反
 *    - 文脈訳のうち、AI 校閲の指摘・ルール違反
 * 3. レビュー画面 data/ot/review/<書>.html を作る（ブラウザで開き、承認・修正して JSON を書き出す）
 *    → node scripts/ot/apply-review.mjs <書き出した JSON> で反映
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { OT_BOOKS, getBook } from './books.mjs';
import { textPath } from './build-text.mjs';
import { glossPath } from './gen-gloss.mjs';
import { verifyPath } from './verify.mjs';
import {
  MASTER_LEXICON, ROOT, STYLE_DIR, WORK_DIR, parseArgs, parseChapterSpec, readJson, writeJson,
} from './lib.mjs';

const NAMES = readJson(join(STYLE_DIR, 'names-ja.json')).entries;
const TOP_FREQUENT = 60;

// 略号 → 書ID（スタイルガイドの略号）
const ABBR_TO_ID = {
  創: 'genesis', 出: 'exodus', レ: 'leviticus', 民: 'numbers', 申: 'deuteronomy', ヨシュ: 'joshua', 士: 'judges',
  ルツ: 'ruth', '1サム': '1samuel', '2サム': '2samuel', '1列': '1kings', '2列': '2kings', '1歴': '1chronicles',
  '2歴': '2chronicles', エズ: 'ezra', ネヘ: 'nehemiah', エス: 'esther', ヨブ: 'job', 詩: 'psalms', 箴: 'proverbs',
  伝: 'ecclesiastes', 雅: 'songofsolomon', イザ: 'isaiah', エレ: 'jeremiah', 哀: 'lamentations', エゼ: 'ezekiel',
  ダニ: 'daniel', ホセ: 'hosea', ヨエ: 'joel', アモ: 'amos', オバ: 'obadiah', ヨナ: 'jonah', ミカ: 'micah',
  ナホ: 'nahum', ハバ: 'habakkuk', ゼパ: 'zephaniah', ハガ: 'haggai', ゼカ: 'zechariah', マラ: 'malachi',
};
const REF_RE = new RegExp(
  `(${Object.keys(ABBR_TO_ID).sort((a, b) => b.length - a.length).join('|')})(\\d{1,3}):(\\d{1,3})`,
  'g',
);

/** src/data/bible.ts から各書の節数を読む（旧約全書の箇所の存在チェック用） */
export function loadVerseCounts() {
  const src = readFileSync(join(ROOT, 'src', 'data', 'bible.ts'), 'utf-8');
  const counts = {};
  for (const m of src.matchAll(/\{ id: "([a-z0-9]+)", name: "[^"]+", corpus: "ot", verses: \[([\d,\s]+)\] \}/g)) {
    counts[m[1]] = m[2].split(',').map((n) => parseInt(n, 10));
  }
  return counts;
}

/** 本文データがある書について、節ごとの Strong's 集合を作る（箇所に語が本当にあるかの確認用） */
export function loadAvailableTexts() {
  const texts = {};
  for (const id of Object.keys(OT_BOOKS)) {
    const t = readJson(textPath(id));
    if (!t) continue;
    texts[id] = Object.fromEntries(Object.entries(t.verses).map(([k, ws]) => [k, new Set(ws.map((w) => w.strongs))]));
  }
  return texts;
}

function checkGloss(gloss, w) {
  const problems = [];
  if (!gloss) return ['訳がありません'];
  if ([...gloss].length > 10) problems.push(`10文字を超えています（${[...gloss].length}文字）`);
  if (/[A-Za-z]/.test(gloss)) problems.push('英字が含まれています');
  if (/[。、,.!?！？:;「」]/.test(gloss)) problems.push('句読点・記号が含まれています');
  const name = NAMES[w.strongs];
  if (name && name.length > 1 && !gloss.includes(name)) problems.push(`固有名詞は「${name}」と表記してください`);
  return problems;
}

export function checkLexicon(e, verseCounts, texts) {
  const problems = [];
  if ([...(e.glossJa ?? '')].length > 8) problems.push('glossJa が8文字を超えています');
  if ([...(e.definitionJa ?? '')].length > 15) problems.push('definitionJa が15文字を超えています');
  const len = [...(e.detailJa ?? '')].length;
  if (len < 150) problems.push(`detailJa が短すぎます（${len}字）`);
  if (len > 650) problems.push(`detailJa が長すぎます（${len}字）`);
  const english = ((e.detailJa ?? '').replace(/\b(LXX|YHWH|BDB|TBESH|Strong's|Strong)\b/g, '').match(/[A-Za-z]{4,}/g) ?? []);
  if (english.length) problems.push(`detailJa に英語が残っています（${[...new Set(english)].slice(0, 3).join(', ')}）`);
  const name = NAMES[e.strongs];
  if (name && e.glossJa !== name) problems.push(`固有名詞は「${name}」と表記してください`);
  if (e.nameUncertain) problems.push('固有名詞の新改訳2017表記に AI が確信を持てていません');

  for (const m of (e.detailJa ?? '').matchAll(REF_RE)) {
    const [raw, abbr, c, v] = m;
    const id = ABBR_TO_ID[abbr];
    const chapter = parseInt(c, 10);
    const verse = parseInt(v, 10);
    const counts = verseCounts[id];
    if (counts && (chapter > counts.length || verse > counts[chapter - 1])) {
      problems.push(`存在しない箇所: ${raw}`);
      continue;
    }
    const verses = texts[id];
    if (verses && verses[`${chapter}:${verse}`] && !verses[`${chapter}:${verse}`].has(e.strongs)) {
      problems.push({ level: 'warn', text: `${raw} にこの語（${e.strongs}）が見当たりません（関連語・同語根の説明なら問題ありません）` });
    }
  }
  return problems;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

/** AI 校閲の指摘（作成側と意見が分かれたものは両方の見解を並べる） */
function aiIssueProblem(v) {
  const text = v.resolution === 'disputed'
    ? `AI の意見が分かれました。校閲: ${v.problem} ／ 作成側: ${v.resolutionNote}`
    : `AI校閲: ${v.problem}`;
  return { level: v.severity, text, suggestion: v.suggestion };
}

export function reviewPath(bookId) {
  return join(WORK_DIR, 'review', `${bookId}.html`);
}

function renderHtml(book, chaptersLabel, lexItems, glossItems) {
  const data = JSON.stringify({ book: book.id, lex: lexItems, gloss: glossItems }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(book.name)} レビュー</title>
<style>
:root{--bg:#faf9f6;--fg:#1f2328;--muted:#656d76;--line:#d8dee4;--card:#fff;--err:#b42318;--warn:#b54708;--ok:#067647;--accent:#1d4ed8}
@media (prefers-color-scheme: dark){:root{--bg:#16181c;--fg:#e6e6e6;--muted:#9aa4af;--line:#30363d;--card:#1e2126;--err:#f97066;--warn:#fdb022;--ok:#47cd89;--accent:#84adff}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.7 system-ui,"Hiragino Sans",sans-serif}
main{max-width:980px;margin:0 auto;padding:16px}
h1{font-size:22px;margin:8px 0}h2{font-size:18px;margin:28px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.bar{position:sticky;top:0;background:var(--bg);padding:8px 0;border-bottom:1px solid var(--line);display:flex;gap:12px;align-items:center;flex-wrap:wrap;z-index:1}
button{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--fg);border-radius:6px;padding:4px 10px;cursor:pointer}
button.primary{background:var(--accent);color:#fff;border-color:var(--accent)}
.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;margin:10px 0}
.card.done{opacity:.55}
.heb{font-family:"SBL Hebrew","Ezra SIL","Times New Roman",serif;font-size:22px;direction:rtl}
.muted{color:var(--muted);font-size:13px}.err{color:var(--err)}.warn{color:var(--warn)}.ok{color:var(--ok)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px}
input[type=text],textarea{font:inherit;width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:6px;padding:4px 8px;background:var(--bg);color:var(--fg)}
textarea{min-height:120px}
details summary{cursor:pointer;color:var(--muted)}
</style></head><body><main>
<h1>${escapeHtml(book.name)}${chaptersLabel} レビュー</h1>
<p class="muted">各項目で「承認」するか、訳を直して「修正して承認」を押してください。判断は自動でこのブラウザに保存されます。終わったら「判断を書き出す」で JSON を保存し、<code>node scripts/ot/apply-review.mjs &lt;JSON&gt;</code> で反映します。</p>
<div class="bar"><span id="progress"></span><button class="primary" id="export">判断を書き出す</button></div>
<h2>辞書（3ペイン）: <span id="lexCount"></span></h2><div id="lex"></div>
<h2>文脈訳（2ペイン）: <span id="glossCount"></span></h2><div id="gloss"></div>
<script>
const DATA=${data};
const KEY='gbible-review-'+DATA.book;
let decisions={};
try{decisions=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify(decisions))}catch{}render()}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function issues(list){return list.map(p=>'<div class="'+(p.level==='error'?'err':'warn')+'">・'+esc(p.text)+(p.suggestion?'<br><span class="muted">修正案: '+esc(p.suggestion)+'</span>':'')+'</div>').join('')}
function render(){
  const lex=document.getElementById('lex');lex.innerHTML='';
  for(const it of DATA.lex){
    const d=decisions['lex:'+it.strongs];
    const el=document.createElement('div');el.className='card'+(d?' done':'');
    el.innerHTML='<div><span class="heb">'+esc(it.lemma)+'</span> <b>'+esc(it.strongs)+'</b> <span class="muted">'+esc(it.reasons.join('・'))+'（'+it.count+'回）</span></div>'
      +issues(it.problems)
      +'<div class="row">代表訳 <input type="text" data-f="glossJa" value="'+esc(d?.glossJa??it.glossJa)+'" style="max-width:12em"> 中心的な意味 <input type="text" data-f="definitionJa" value="'+esc(d?.definitionJa??it.definitionJa)+'" style="max-width:18em"></div>'
      +'<details><summary>詳細（detailJa）</summary><textarea data-f="detailJa">'+esc(d?.detailJa??it.detailJa)+'</textarea>'
      +(it.previous?'<div class="muted">旧版: '+esc(it.previous.glossJa)+' / '+esc(it.previous.definitionJa)+'</div>':'')+'</details>'
      +'<div class="row"><button data-a="ok">承認</button><button data-a="edit">修正して承認</button><button data-a="redo">作り直す</button>'+(d?'<span class="ok">判断済み: '+esc(d.action)+'</span> <button data-a="undo">取り消す</button>':'')+'</div>';
    el.onclick=e=>{const a=e.target.dataset?.a;if(!a)return;const k='lex:'+it.strongs;
      if(a==='undo'){delete decisions[k]}else{const v={action:a};if(a==='edit'){el.querySelectorAll('[data-f]').forEach(i=>v[i.dataset.f]=i.value.trim())}decisions[k]=v}save()};
    lex.appendChild(el);
  }
  const gl=document.getElementById('gloss');gl.innerHTML='';
  for(const it of DATA.gloss){
    const d=decisions['gloss:'+it.id];
    const el=document.createElement('div');el.className='card'+(d?' done':'');
    el.innerHTML='<div class="muted">'+esc(it.ref)+'</div><div class="heb">'+it.verseHtml+'</div>'
      +'<div><span class="heb">'+esc(it.text)+'</span> <span class="muted">'+esc(it.morph)+' / 辞書: '+esc(it.lexGloss)+'</span></div>'
      +issues(it.problems)
      +'<div class="row">訳 <input type="text" data-f="gloss" value="'+esc(d?.gloss??it.gloss)+'" style="max-width:14em">'+(it.suggestion?'<button data-a="use">修正案「'+esc(it.suggestion)+'」を入れる</button>':'')+'<button data-a="ok">承認</button><button data-a="edit">修正して承認</button>'+(d?'<span class="ok">判断済み: '+esc(d.action)+'</span> <button data-a="undo">取り消す</button>':'')+'</div>';
    el.onclick=e=>{const a=e.target.dataset?.a;if(!a)return;const k='gloss:'+it.id;
      if(a==='use'){el.querySelector('[data-f=gloss]').value=it.suggestion;return}
      if(a==='undo'){delete decisions[k]}else{const v={action:a};if(a==='edit'){v.gloss=el.querySelector('[data-f=gloss]').value.trim()}decisions[k]=v}save()};
    gl.appendChild(el);
  }
  const done=Object.keys(decisions).length,total=DATA.lex.length+DATA.gloss.length;
  document.getElementById('progress').textContent='判断済み '+done+' / '+total;
  document.getElementById('lexCount').textContent=DATA.lex.length+'件';
  document.getElementById('glossCount').textContent=DATA.gloss.length+'件';
}
document.getElementById('export').onclick=()=>{
  const blob=new Blob([JSON.stringify({book:DATA.book,decisions},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=DATA.book+'-review.json';a.click();
};
render();
</script></main></body></html>`;
}

/**
 * 対象範囲について、人の確認が必要な項目を集める（公開前チェックにも使う）
 * 承認済み（verified / locked）の項目は含まない。
 */
export function collectReview(bookId, chapters) {
  const book = getBook(bookId);
  const text = readJson(textPath(bookId));
  if (!text) throw new Error(`本文データがありません。先に build-text.mjs ${bookId} を実行してください。`);
  const master = readJson(MASTER_LEXICON, {});
  const glosses = readJson(glossPath(bookId), {});
  const verify = readJson(verifyPath(bookId), { gloss: {}, lexicon: {} });
  const verseCounts = loadVerseCounts();
  const texts = loadAvailableTexts();

  const freq = new Map();
  const firstForm = new Map();
  const glossItems = [];
  const glossStats = { total: 0, missing: 0, flagged: 0 };
  for (const [key, ws] of Object.entries(text.verses)) {
    const c = Number(key.split(':')[0]);
    if (chapters && !chapters.includes(c)) continue;
    for (const w of ws) {
      freq.set(w.strongs, (freq.get(w.strongs) ?? 0) + 1);
      if (!firstForm.has(w.strongs)) firstForm.set(w.strongs, w.text);
      glossStats.total++;
      const g = glosses[w.id];
      if (!g) glossStats.missing++;
      if (!g || g.status === 'locked' || g.status === 'verified') continue;
      const problems = checkGloss(g.gloss, w).map((t) => ({ level: 'error', text: t }));
      if (w.kq?.part === 1) {
        if (!g.ketivGloss) problems.push({ level: 'error', text: `書かれた形（${w.kq.ketiv}）の訳がありません` });
        else problems.push({ level: 'warn', text: `異読: 書かれた形 ${w.kq.ketiv} →「${g.ketivGloss}」（読む形の訳と見比べてください）` });
      }
      const v = verify.gloss[w.id];
      if (v && v.resolution !== 'fixed') problems.push(aiIssueProblem(v));
      if (!problems.length) continue;
      glossStats.flagged++;
      glossItems.push({
        id: w.id,
        ref: `${book.abbr}${key}`,
        text: w.text,
        morph: w.morph,
        gloss: g.gloss,
        lexGloss: master[w.strongs]?.glossJa ?? '',
        problems,
        suggestion: v && [...v.suggestion].length <= 10 ? v.suggestion : '',
        verseHtml: ws.map((x) => (x.id === w.id ? `<mark>${escapeHtml(x.text)}</mark>` : escapeHtml(x.text))).join(' '),
      });
    }
  }

  const ranked = [...freq.entries()].filter(([s]) => s !== 'H0').sort((a, b) => b[1] - a[1]);
  const topSet = new Set(ranked.slice(0, TOP_FREQUENT).map(([s]) => s));
  const lexItems = [];
  const lexStats = { total: ranked.length, missing: 0, draft: 0, legacy: 0, flagged: 0 };
  for (const [s, count] of ranked) {
    const e = master[s];
    if (!e) {
      lexStats.missing++;
      continue;
    }
    if (e.status === 'legacy') lexStats.legacy++;
    if (e.status !== 'draft') continue;
    lexStats.draft++;
    const problems = checkLexicon(e, verseCounts, texts).map((t) => (typeof t === 'string' ? { level: 'error', text: t } : t));
    const v = verify.lexicon[s];
    if (v && v.resolution !== 'fixed') problems.push(aiIssueProblem(v));
    const reasons = [];
    if (problems.length) reasons.push('指摘あり');
    if (e.isProperNoun) reasons.push('固有名詞');
    if (topSet.has(s)) reasons.push('頻出');
    if (!reasons.length) continue;
    if (problems.length) lexStats.flagged++;
    lexItems.push({
      strongs: s, lemma: e.lemma || firstForm.get(s), count, reasons, problems,
      glossJa: e.glossJa, definitionJa: e.definitionJa, detailJa: e.detailJa, previous: e.previous ?? null,
    });
  }
  lexItems.sort((a, b) => b.problems.length - a.problems.length || b.count - a.count);
  return { book, lexItems, glossItems, lexStats, glossStats };
}

async function main() {
  const { flags, positional } = parseArgs();
  const bookId = positional[0];
  if (!bookId) {
    console.error('使い方: node scripts/ot/check.mjs <書ID> [--chapters 1-41]');
    process.exit(1);
  }
  const chapters = parseChapterSpec(flags.chapters);
  const { book, lexItems, glossItems, lexStats, glossStats } = collectReview(bookId, chapters);

  const chaptersLabel = chapters ? `（${flags.chapters}章）` : '';
  const out = reviewPath(bookId);
  writeJson(out.replace(/\.html$/, '.summary.json'), { lexStats, glossStats, generatedAt: new Date().toISOString() });
  writeFileSync(out, renderHtml(book, chaptersLabel, lexItems, glossItems), 'utf-8');

  console.log(`${book.name}${chaptersLabel}`);
  console.log(`  辞書: 見出し語 ${lexStats.total} / 未作成 ${lexStats.missing} / 新規作成（未確認） ${lexStats.draft} / 旧版 ${lexStats.legacy} / 指摘あり ${lexStats.flagged}`);
  console.log(`  文脈訳: ${glossStats.total} 語 / 未作成 ${glossStats.missing} / 要確認 ${glossStats.flagged}`);
  console.log(`  レビュー対象: 辞書 ${lexItems.length} 件・文脈訳 ${glossItems.length} 件`);
  console.log(`  → ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
