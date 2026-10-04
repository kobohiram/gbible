#!/usr/bin/env node
/**
 * 手順7: アプリ用データの書き出し（公開）
 *
 *   node scripts/ot/publish.mjs psalms --chapters 1-41
 *   node scripts/ot/publish.mjs genesis
 *
 * 公開前チェック（check.mjs と同じ基準）で、未確認の要確認項目・訳の抜け・辞書の抜けがあれば止まる。
 * 出力:
 *   public/data/ot/<書>.json        … 本文・文脈訳・その書の辞書
 *   src/data/ot-published.json      … 公開済みの書と章（アプリが表示範囲の判断に使う）
 */
import { join } from 'path';
import { getBook } from './books.mjs';
import { collectReview } from './check.mjs';
import { textPath } from './build-text.mjs';
import { glossPath } from './gen-gloss.mjs';
import { verifyPath } from './verify.mjs';
import { loadLexiconQa } from './lexicon-qa.mjs';
import {
  MASTER_LEXICON, PUBLIC_OT, ROOT, STYLE_DIR, compareVerseKeys, parseArgs, parseChapterSpec, readJson, writeJson,
} from './lib.mjs';

const PUBLISHED_INDEX = join(ROOT, 'src', 'data', 'ot-published.json');
const NAMES = readJson(join(STYLE_DIR, 'names-ja.json')).entries;

/** AI 下書きの項目に付ける、AI 校閲の指摘（直したものには付けない） */
function aiNote(issue) {
  if (!issue || issue.resolution === 'fixed') return {};
  const note = issue.resolution === 'disputed'
    ? `AI の意見が分かれています。校閲: ${issue.problem} ／ 作成側: ${issue.resolutionNote}`
    : issue.problem;
  return { aiNote: note, ...(issue.suggestion ? { aiSuggestion: issue.suggestion } : {}) };
}

function isChecked(status) {
  return status === 'verified' || status === 'locked';
}

/** 公開データの辞書項目（作り直したものだけ。旧版は今のまま残す） */
function lexiconEntry(e, fallbackLemma, issue) {
  return {
    strongs: e.strongs,
    lemma: e.lemma || fallbackLemma,
    glossJa: NAMES[e.strongs] ?? e.glossJa,
    definitionJa: e.definitionJa,
    detailJa: e.detailJa,
    reviewed: isChecked(e.status),
    source: e.status === 'legacy' ? 'bdb' : 'bdb-opus',
    review: isChecked(e.status)
      ? { status: 'checked' }
      : { status: e.status === 'legacy' ? 'legacy' : 'ai', ...aiNote(issue) },
  };
}

/**
 * --lexicon-only: 本文・訳には触れず、公開データの辞書項目だけを、作り直した辞書に差し替える。
 * 文脈訳がまだない書（創世記など）でも、辞書の改善を先に公開できる。
 */
function publishLexiconOnly(bookId) {
  const outPath = join(PUBLIC_OT, `${bookId}.json`);
  const data = readJson(outPath);
  if (!data) throw new Error(`公開データがありません: ${outPath}`);
  const master = readJson(MASTER_LEXICON, {});
  const qa = loadLexiconQa();
  const verify = readJson(verifyPath(bookId), { lexicon: {} });
  let replaced = 0;
  let legacy = 0;
  for (const [s, prev] of Object.entries(data.lexicon)) {
    const e = master[s];
    if (!e || e.status === 'legacy' || e.status === 'redo') {
      legacy++;
      continue;
    }
    data.lexicon[s] = lexiconEntry(e, prev.lemma, verify.lexicon?.[s] ?? qa.lexicon[s]);
    replaced++;
  }
  writeJson(outPath, data, { pretty: false });
  console.log(`✓ ${getBook(bookId).name}: 辞書 ${replaced} 語を作り直し版に差し替え（旧版のまま ${legacy} 語）→ ${outPath}`);
}

function main() {
  const { flags, positional } = parseArgs();
  const bookId = positional[0];
  if (!bookId) {
    console.error('使い方: node scripts/ot/publish.mjs <書ID> [--chapters 1-41] [--force] [--lexicon-only]');
    process.exit(1);
  }
  if (flags['lexicon-only']) {
    for (const id of bookId.split(',')) publishLexiconOnly(id);
    return;
  }
  const book = getBook(bookId);
  const text = readJson(textPath(bookId));
  const master = readJson(MASTER_LEXICON, {});
  const glosses = readJson(glossPath(bookId), {});
  const chapters = parseChapterSpec(flags.chapters) ?? text.chapters.map((_, i) => i + 1);

  // 公開前チェック
  // 人の確認は公開後に「みんなで作る辞書」で進める。ここでは、訳・辞書の抜けと AI の点検漏れだけを止める
  const { lexStats, glossStats } = collectReview(bookId, chapters);
  const verify = readJson(verifyPath(bookId), { gloss: {}, lexicon: {}, checked: { gloss: {}, lexicon: {} } });
  const checked = verify.checked ?? { gloss: {}, lexicon: {} };
  const uncheckedChapters = chapters.filter((c) => !checked.gloss[String(c)]);
  const blockers = [];
  if (lexStats.missing) blockers.push(`辞書のない見出し語 ${lexStats.missing} 語`);
  if (glossStats.missing) blockers.push(`文脈訳のない語 ${glossStats.missing} 語`);
  if (uncheckedChapters.length) blockers.push(`AI の二重チェックをしていない章 ${uncheckedChapters.join(',')}`);
  if (blockers.length && !flags.force) {
    console.error(`公開できません（${book.name}）: ${blockers.join(' / ')}`);
    process.exit(1);
  }
  if (lexStats.legacy) console.warn(`注意: 旧版の辞書のまま公開される語が ${lexStats.legacy} 語あります。`);

  const qa = loadLexiconQa();

  // 既存の公開データに、今回の章を上書きで追加する
  const outPath = join(PUBLIC_OT, `${bookId}.json`);
  const prev = readJson(outPath);
  const words = { ...(prev?.words ?? {}) };
  const lexicon = { ...(prev?.lexicon ?? {}) };

  for (const key of Object.keys(text.verses).sort(compareVerseKeys)) {
    if (!chapters.includes(Number(key.split(':')[0]))) continue;
    // 異読の書かれた形の訳は、読む形の1語目に付いている。同じ組の2語目以降にも写す
    const verseWords = text.verses[key];
    const ketivGlossOf = (i) => {
      const w = verseWords[i];
      const head = w.kq ? verseWords[i - (w.kq.part - 1)] : null;
      return head ? glosses[head.id]?.ketivGloss : undefined;
    };
    words[key] = verseWords.map((w, i) => {
      const lex = master[w.strongs];
      return {
        id: w.id,
        strongs: w.strongs,
        text: w.text,
        script: 'heb',
        morph: w.morph,
        glossJa: NAMES[w.strongs] ?? lex?.glossJa ?? '',
        ctxGloss: glosses[w.id]?.gloss ?? '',
        ...(glosses[w.id]
          ? {
            review: isChecked(glosses[w.id].status)
              ? { status: 'checked' }
              : { status: 'ai', ...aiNote(verify.gloss[w.id]) },
          }
          : {}),
        ...(w.lang === 'arc' ? { lang: 'arc' } : {}),
        ...(w.kq
          ? {
            kq: {
              ketiv: w.kq.ketiv,
              ketivMorph: w.kq.ketivMorph,
              ketivStrongs: w.kq.ketivStrongs,
              part: w.kq.part,
              of: w.kq.of,
              ...(ketivGlossOf(i) ? { ketivGloss: ketivGlossOf(i) } : {}),
            },
          }
          : {}),
      };
    });
    for (const w of text.verses[key]) {
      const e = master[w.strongs];
      if (!e) continue;
      lexicon[w.strongs] = lexiconEntry(e, w.text, verify.lexicon?.[w.strongs] ?? qa.lexicon[w.strongs]);
    }
  }

  const titles = Object.keys(words).filter((k) => k.endsWith(':0')).map((k) => Number(k.split(':')[0]));
  const output = {
    version: 1,
    book: book.id,
    name: book.name,
    versification: book.versification,
    chapters: text.chapters,
    ...(titles.length ? { titles } : {}),
    words,
    lexicon,
  };
  writeJson(outPath, output, { pretty: false });

  const index = readJson(PUBLISHED_INDEX, {});
  const published = new Set(index[bookId]?.chapters ?? []);
  for (const c of chapters) published.add(c);
  index[bookId] = { chapters: [...published].sort((a, b) => a - b), ...(titles.length ? { titles } : {}) };
  writeJson(PUBLISHED_INDEX, index);

  const kb = Math.round(JSON.stringify(output).length / 1024);
  console.log(`✓ ${book.name} を公開用に書き出しました（${chapters.length}章・${kb} KB）→ ${outPath}`);
  console.log(`  公開済みの章: ${index[bookId].chapters.length}章 → ${PUBLISHED_INDEX}`);
}

main();
