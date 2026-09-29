#!/usr/bin/env node
/**
 * 手順1: OSHB 本文 → 作業用本文データ（AI は使わない）
 *
 *   node scripts/ot/build-text.mjs psalms
 *
 * 出力: data/ot/work/<書>.text.json
 *   verses: { "章:節": [{ id, strongs, text, morph, prefixes, lang }] }
 *   詩篇は新改訳2017 と同じ節番号で、表題は "章:0"
 */
import { join } from 'path';
import { getBook } from './books.mjs';
import {
  WORK_DIR, compareVerseKeys, fetchOshbBook, loadVerseMap, parseArgs, parseOshbBook, remapVerses, writeJson,
} from './lib.mjs';

export function textPath(bookId) {
  return join(WORK_DIR, 'work', `${bookId}.text.json`);
}

async function main() {
  const { positional } = parseArgs();
  if (!positional.length) {
    console.error('使い方: node scripts/ot/build-text.mjs <書ID>');
    process.exit(1);
  }

  for (const bookId of positional) {
    const book = getBook(bookId);
    const xml = await fetchOshbBook(book);
    const wlc = parseOshbBook(xml, book.osis);
    const mapped = book.versification === 'kjv'
      ? remapVerses(book, wlc, await loadVerseMap())
      : new Map([...wlc].map(([k, v]) => [k.replace('.', ':'), v]));

    const keys = [...mapped.keys()].sort(compareVerseKeys);
    const verses = {};
    const chapters = [];
    const titles = [];
    let wordCount = 0;
    for (const key of keys) {
      const [c, v] = key.split(':').map(Number);
      verses[key] = mapped.get(key).map((w, i) => ({
        id: `${book.id}-${c}-${v}-w${i + 1}`,
        strongs: w.strongs,
        text: w.text,
        morph: w.morph,
        prefixes: w.prefixes,
        lang: w.lang,
        ...(w.kq ? { kq: w.kq } : {}),
      }));
      wordCount += verses[key].length;
      if (v === 0) titles.push(c);
      else chapters[c - 1] = Math.max(chapters[c - 1] ?? 0, v);
    }

    const out = {
      version: 2,
      book: book.id,
      name: book.name,
      versification: book.versification,
      chapters,
      titles,
      verses,
    };
    writeJson(textPath(book.id), out, { pretty: false });

    const lemmas = new Set(Object.values(verses).flat().map((w) => w.strongs));
    const aramaic = Object.values(verses).flat().filter((w) => w.lang === 'arc').length;
    console.log(`✓ ${book.name}: ${chapters.length}章 / ${keys.length}節（うち表題 ${titles.length}）/ ${wordCount}語 / 見出し語 ${lemmas.size}${aramaic ? ` / アラム語 ${aramaic}語` : ''}`);
    console.log(`  → ${textPath(book.id)}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
