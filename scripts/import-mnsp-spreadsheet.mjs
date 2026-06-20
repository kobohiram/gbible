#!/usr/bin/env node
/**
 * みんなの聖書スプレッドシート → public/data/translations/mnsp/[book].json
 *
 * 使い方:
 *   node scripts/import-mnsp-spreadsheet.mjs luke 20
 *   node scripts/import-mnsp-spreadsheet.mjs mark 1 --spreadsheet-id=1vsLCSLMIT1rQuKEqrLjnSj9owlnFPfcH
 */

import { writeFileSync, readFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "data", "translations", "mnsp");

const BOOK_META = {
  luke: {
    name: "ルカによる福音書",
    spreadsheetId: "1PXWDGqWvsO3YP5MfwhEjLq70r5prmiqH",
    chouyakuCol: 3, // 超訳（D列）
  },
  mark: {
    name: "マルコによる福音書",
    spreadsheetId: "1vsLCSLMIT1rQuKEqrLjnSj9owlnFPfcH",
    chouyakuCol: 4, // 超訳１（E列）
  },
};

function parseCsv(text) {
  const rows = [];
  let i = 0;
  const len = text.length;
  while (i < len) {
    const row = [];
    while (i < len) {
      if (text[i] === '"') {
        i++;
        let cell = "";
        while (i < len) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              cell += '"';
              i += 2;
            } else {
              i++;
              break;
            }
          } else {
            cell += text[i++];
          }
        }
        row.push(cell);
        if (text[i] === ",") i++;
        else if (text[i] === "\r") {
          i++;
          if (text[i] === "\n") i++;
          break;
        } else if (text[i] === "\n") {
          i++;
          break;
        }
      } else {
        let cell = "";
        while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          cell += text[i++];
        }
        row.push(cell);
        if (text[i] === ",") i++;
        else if (text[i] === "\r") {
          i++;
          if (text[i] === "\n") i++;
          break;
        } else if (text[i] === "\n") {
          i++;
          break;
        }
      }
    }
    if (row.length > 1 || row[0]) rows.push(row);
  }
  return rows;
}

function cleanSotaku(text) {
  return text.replace(/^\d+\s*[　\s]+/, "").trim();
}

function verseFromSotaku(text) {
  const m = text.match(/^(\d+)\s*[　\s]+/);
  return m ? Number(m[1]) : null;
}

async function fetchChapterCsv(spreadsheetId, chapter) {
  const sheet = encodeURIComponent(`${chapter}章`);
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheet}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`章${chapter}の取得に失敗: ${res.status}`);
  return res.text();
}

async function importBook(bookId, maxChapter, spreadsheetIdOverride) {
  const meta = BOOK_META[bookId];
  if (!meta) throw new Error(`未対応の書: ${bookId}`);
  const spreadsheetId = spreadsheetIdOverride ?? meta.spreadsheetId;

  const verses = {};
  const chapterRanges = {};

  for (let ch = 1; ch <= maxChapter; ch++) {
    const csv = await fetchChapterCsv(spreadsheetId, ch);
    const rows = parseCsv(csv);
    let minVerse = Infinity;
    let maxVerse = 0;
    let lastVerse = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      let chapter = Number(row[0]);
      let verse = Number(row[1]);
      const rawSotaku = (row[2] ?? "").trim();
      const chouyaku = (row[meta.chouyakuCol] ?? "").trim();

      if (!chapter) chapter = ch;
      if (!verse) {
        verse = verseFromSotaku(rawSotaku) ?? lastVerse + 1;
      }
      if (!chapter || !verse || chapter !== ch) continue;
      if (!rawSotaku && !chouyaku) continue;

      const sotaku = cleanSotaku(rawSotaku);
      lastVerse = verse;

      const key = `${ch}:${verse}`;
      verses[key] = { sotaku, chouyaku };
      minVerse = Math.min(minVerse, verse);
      maxVerse = Math.max(maxVerse, verse);
    }

    if (maxVerse > 0) {
      chapterRanges[String(ch)] = { from: minVerse, to: maxVerse };
      console.log(`  ${ch}章: ${maxVerse - minVerse + 1}節`);
    } else {
      console.warn(`  ${ch}章: データなし`);
    }
  }

  const out = {
    version: 1,
    source: "mnsp",
    book: bookId,
    name: meta.name,
    verses,
  };

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, `${bookId}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 0));
  console.log(`\n${outPath}`);
  console.log(`合計 ${Object.keys(verses).length} 節`);

  return chapterRanges;
}

function updateManifest(bookId, chapterRanges) {
  const manifestPath = join(ROOT, "public", "data", "translations", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const source = manifest.sources.find((s) => s.id === "mnsp");
  if (!source) throw new Error("manifest に mnsp がありません");
  source.books[bookId] = { chapters: chapterRanges };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`manifest 更新: ${bookId} 1–${Object.keys(chapterRanges).length}章`);
}

const bookId = process.argv[2];
const maxChapter = Number(process.argv[3]);
const idArg = process.argv.find((a) => a.startsWith("--spreadsheet-id="));
const spreadsheetId = idArg?.split("=")[1];

if (!bookId || !maxChapter) {
  console.error("Usage: node scripts/import-mnsp-spreadsheet.mjs <bookId> <maxChapter>");
  process.exit(1);
}

console.log(`${BOOK_META[bookId]?.name ?? bookId} を ${maxChapter}章まで取り込み…`);
importBook(bookId, maxChapter, spreadsheetId)
  .then((ranges) => updateManifest(bookId, ranges))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
