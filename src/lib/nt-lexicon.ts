import type { LexiconEntry } from "@/types";

let cache: Record<string, LexiconEntry> | null = null;
let promise: Promise<Record<string, LexiconEntry>> | null = null;

export function loadNtLexicon(): Promise<Record<string, LexiconEntry>> {
  if (cache) return Promise.resolve(cache);
  if (!promise) {
    promise = fetch("/data/nt/lexicon.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, LexiconEntry>) => {
        cache = data;
        return data;
      })
      .catch(() => ({}));
  }
  return promise;
}
