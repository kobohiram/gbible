let cache: Record<string, string> | null = null;
let promise: Promise<Record<string, string>> | null = null;

/** 2ペイン専用：TBESH gloss の日本語訳（Strong → paneJa） */
export function loadOtPaneGloss(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (!promise) {
    promise = fetch("/data/ot/pane-gloss.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: Record<string, string>) => {
        cache = data;
        return data;
      })
      .catch(() => ({}));
  }
  return promise;
}

export function getOtPaneGloss(
  strongs: string,
  map: Record<string, string> | null,
): string {
  return map?.[strongs]?.trim() ?? "";
}
