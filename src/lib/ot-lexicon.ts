import type { LexiconEntry } from "@/types";

let cache: Record<string, LexiconEntry> | null = null;
let promise: Promise<Record<string, LexiconEntry>> | null = null;

export function loadOtLexicon(): Promise<Record<string, LexiconEntry>> {
  if (cache) return Promise.resolve(cache);
  if (!promise) {
    promise = fetch("/data/ot/lexicon.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, LexiconEntry>) => {
        cache = data;
        return data;
      })
      .catch(() => ({}));
  }
  return promise;
}

export function getOtLexiconEntry(
  strongs: string,
  lexicon: Record<string, LexiconEntry> | null,
): LexiconEntry | null {
  return lexicon?.[strongs] ?? null;
}
