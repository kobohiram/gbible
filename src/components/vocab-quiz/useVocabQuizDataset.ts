"use client";

import { useEffect, useState } from "react";
import type { VocabQuizDataset } from "@/types/vocab-quiz";

let cache: VocabQuizDataset | null = null;

export function useVocabQuizDataset() {
  const [dataset, setDataset] = useState<VocabQuizDataset | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    (async () => {
      try {
        const [wordsRes, groupsRes, metaRes] = await Promise.all([
          fetch("/data/quiz/words.json"),
          fetch("/data/quiz/groups.json"),
          fetch("/data/quiz/meta.json"),
        ]);
        if (!wordsRes.ok || !groupsRes.ok || !metaRes.ok) {
          throw new Error("クイズデータの読み込みに失敗しました");
        }
        const [words, groups, meta] = await Promise.all([
          wordsRes.json(),
          groupsRes.json(),
          metaRes.json(),
        ]);
        const wordsById: VocabQuizDataset["wordsById"] = {};
        for (const w of words) wordsById[w.id] = w;
        const groupsById: VocabQuizDataset["groupsById"] = {};
        for (const g of groups) groupsById[g.id] = g;
        const ds: VocabQuizDataset = { words, groups, meta, wordsById, groupsById };
        if (!cancelled) {
          cache = ds;
          setDataset(ds);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "エラー");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { dataset, loading, error };
}
