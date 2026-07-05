#!/usr/bin/env node
/**
 * scripts/import-vocab-quiz.mjs
 *
 * エレメンツ単語クイズ CSV → public/data/quiz/*.json
 *
 *   node scripts/import-vocab-quiz.mjs
 *   node scripts/import-vocab-quiz.mjs --enrich-kaisetsu
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CSV_PATH = join(ROOT, "data", "vocab-quiz.csv");
const OUT_DIR = join(ROOT, "public", "data", "quiz");
const LEXICON_PATH = join(ROOT, "public", "data", "nt", "lexicon.json");

const CHUNK_SIZE = 10;
const enrichKaisetsu = process.argv.includes("--enrich-kaisetsu");

function parseCSVLine(line) {
  const out = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      q = !q;
      continue;
    }
    if (c === "," && !q) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseUnitNumber(unit) {
  const m = unit.match(/^(\d+):/);
  return m ? Number(m[1]) : 0;
}

/** @returns {"verb"|"noun"|"adj"|"prep"|"other"} */
function toCoarsePos(pos) {
  if (/動詞/.test(pos)) return "verb";
  if (/名詞|代名詞|固有名詞|数詞/.test(pos)) return "noun";
  if (/形容詞/.test(pos)) return "adj";
  if (/前置詞/.test(pos)) return "prep";
  return "other";
}

function normalizeGreek(word) {
  return word
    .split(",")[0]
    .replace(/,.*$/, "")
    .replace(/;.*$/, "")
    .trim();
}

function isThinKaisetsu(kaisetsu, answer) {
  const k = (kaisetsu || "").trim();
  if (!k) return true;
  const m = k.match(/^\((\d*)\)(.*)$/);
  if (!m) return k.length < answer.length + 8;
  const rest = m[2].trim();
  return rest === answer || rest.length < answer.length + 5;
}

function firstSentence(text, maxLen = 140) {
  if (!text) return "";
  const one = text.replace(/\s+/g, " ").trim();
  const cut = one.split(/[。．]/)[0];
  const s = cut.length > 0 ? cut : one;
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

function buildLemmaIndex(lexicon) {
  const byLemma = new Map();
  for (const entry of Object.values(lexicon)) {
    if (entry.lemma) byLemma.set(entry.lemma.normalize("NFC"), entry);
  }
  return byLemma;
}

function enrichFromLexicon(word, answer, count, lexByLemma) {
  const greek = normalizeGreek(word);
  const entry =
    lexByLemma.get(greek.normalize("NFC")) ||
    [...lexByLemma.entries()].find(([lemma]) => greek.includes(lemma) || lemma.includes(greek))?.[1];
  if (!entry) return null;
  const snippet = firstSentence(entry.detailJa || entry.definitionJa || "");
  if (!snippet) return null;
  const prefix = count ? `(${count})` : "()";
  return `${prefix}${snippet}`;
}

function main() {
  if (!existsSync(CSV_PATH)) {
    console.error(`CSV not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const text = readFileSync(CSV_PATH, "utf-8");
  const lines = text.split("\n");
  const header = parseCSVLine(lines[0]);
  const col = (name) => header.indexOf(name);

  const lexicon = existsSync(LEXICON_PATH)
    ? JSON.parse(readFileSync(LEXICON_PATH, "utf-8"))
    : {};
  const lexByLemma = buildLemmaIndex(lexicon);

  /** @type {Map<number, object[]>} */
  const byUnit = new Map();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const unit = cols[col("単元")]?.trim();
    if (!unit?.match(/^\d+:/)) continue;

    const unitNum = parseUnitNumber(unit);
    const pos = cols[col("品詞")]?.trim() || "";
    const word = cols[col("単語")]?.trim() || "";
    const answer = cols[col("answer")]?.trim() || "";
    const countRaw = cols[col("出現回数")]?.trim() || "";
    const count = countRaw ? Number(countRaw) : null;
    let kaisetsu = cols[col("kaisetsu")]?.trim() || "";

    if (enrichKaisetsu && isThinKaisetsu(kaisetsu, answer)) {
      const enriched = enrichFromLexicon(word, answer, count, lexByLemma);
      if (enriched) kaisetsu = enriched;
      else if (!kaisetsu) kaisetsu = count ? `(${count})${answer}` : answer;
    }

    const distractors = [
      cols[col("間違い1")]?.trim(),
      cols[col("間違い2")]?.trim(),
      cols[col("間違い3")]?.trim(),
    ].filter(Boolean);

    if (!word || !answer || distractors.length < 3) continue;

    const row = {
      word,
      greek: normalizeGreek(word),
      answer,
      distractors,
      kaisetsu,
      count,
      unit,
      unitNum,
      pos,
      coarsePos: toCoarsePos(pos),
    };

    if (!byUnit.has(unitNum)) byUnit.set(unitNum, []);
    byUnit.get(unitNum).push(row);
  }

  /** @type {object[]} */
  const words = [];
  /** @type {object[]} */
  const groups = [];

  for (const unitNum of [...byUnit.keys()].sort((a, b) => a - b)) {
    const unitRows = byUnit.get(unitNum);
    const unitLabel = unitRows[0].unit;

    for (let chunk = 0; chunk < unitRows.length; chunk += CHUNK_SIZE) {
      const chunkRows = unitRows.slice(chunk, chunk + CHUNK_SIZE);
      const groupId = `${unitNum}-${Math.floor(chunk / CHUNK_SIZE)}`;
      const wordIds = [];

      for (let j = 0; j < chunkRows.length; j++) {
        const wordId = `u${unitNum}-w${chunk + j}`;
        wordIds.push(wordId);
        words.push({
          id: wordId,
          groupId,
          ...chunkRows[j],
        });
      }

      groups.push({
        id: groupId,
        unitNum,
        unitLabel,
        chunkIndex: Math.floor(chunk / CHUNK_SIZE),
        wordIds,
        nativeCount: chunkRows.length,
      });
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "words.json"), JSON.stringify(words, null, 0));
  writeFileSync(join(OUT_DIR, "groups.json"), JSON.stringify(groups, null, 0));
  writeFileSync(
    join(OUT_DIR, "meta.json"),
    JSON.stringify(
      {
        version: 1,
        totalWords: words.length,
        totalGroups: groups.length,
        chunkSize: CHUNK_SIZE,
        coarsePosLabels: {
          verb: "動詞",
          noun: "名詞",
          adj: "形容詞",
          prep: "前置詞",
          other: "その他",
        },
      },
      null,
      2,
    ),
  );

  const thin = words.filter((w) => isThinKaisetsu(w.kaisetsu, w.answer)).length;
  console.log(`✓ ${words.length} words, ${groups.length} groups → ${OUT_DIR}`);
  console.log(`  thin kaisetsu remaining: ${thin}`);
}

main();
