import type { BookId } from "@/types";

export type TranslationSourceId = "mnsp";

export type MnspVerseEntry = {
  sotaku: string;
  chouyaku: string;
};

export type MnspBookData = {
  version: number;
  source: "mnsp";
  book: BookId;
  name: string;
  verses: Record<string, MnspVerseEntry>;
};

export type TranslationManifest = {
  version: number;
  sources: Array<{
    id: TranslationSourceId;
    name: string;
    attribution: string;
    books: Partial<
      Record<
        BookId,
        { chapters: Record<string, { from: number; to: number }> }
      >
    >;
  }>;
};

/** 節一覧プレビュー用 */
export type TranslationPreviewId = "private" | "mnsp";

export const TRANSLATION_PREVIEW_LABELS: Record<TranslationPreviewId, string> = {
  private: "私訳",
  mnsp: "みんなの聖書",
};

export const MISSING_TRANSLATION_LABEL = "未収録（翻訳プロジェクト進行中）";

const PREVIEW_STORAGE_KEY = "gbible-translation-preview";

const bookCache = new Map<string, MnspBookData | null>();
let manifestCache: TranslationManifest | null = null;
let manifestPromise: Promise<TranslationManifest> | null = null;

export function loadTranslationPreview(): TranslationPreviewId {
  if (typeof window === "undefined") return "private";
  const v = localStorage.getItem(PREVIEW_STORAGE_KEY);
  return v === "mnsp" ? "mnsp" : "private";
}

export function saveTranslationPreview(id: TranslationPreviewId) {
  localStorage.setItem(PREVIEW_STORAGE_KEY, id);
}

export async function fetchManifest(): Promise<TranslationManifest> {
  if (manifestCache) return manifestCache;
  if (!manifestPromise) {
    manifestPromise = fetch("/data/translations/manifest.json")
      .then((r) => (r.ok ? r.json() : { version: 1, sources: [] }))
      .then((d: TranslationManifest) => {
        manifestCache = d;
        return d;
      });
  }
  return manifestPromise;
}

export async function fetchMnspBook(bookId: BookId): Promise<MnspBookData | null> {
  const cached = bookCache.get(bookId);
  if (cached !== undefined) return cached;

  const manifest = await fetchManifest();
  const hasBook = manifest.sources.some(
    (s) => s.id === "mnsp" && s.books[bookId],
  );
  if (!hasBook) {
    bookCache.set(bookId, null);
    return null;
  }

  const r = await fetch(`/data/translations/mnsp/${bookId}.json`);
  if (!r.ok) {
    bookCache.set(bookId, null);
    return null;
  }
  const data = (await r.json()) as MnspBookData;
  bookCache.set(bookId, data);
  return data;
}

export function getMnspVerse(
  data: MnspBookData | null,
  chapter: number,
  verse: number,
): MnspVerseEntry | null {
  if (!data) return null;
  return data.verses[`${chapter}:${verse}`] ?? null;
}

export function getMnspChouyaku(
  data: MnspBookData | null,
  chapter: number,
  verse: number,
): string | null {
  const entry = getMnspVerse(data, chapter, verse);
  const text = entry?.chouyaku?.trim();
  return text || null;
}

export function getMnspSotaku(
  data: MnspBookData | null,
  chapter: number,
  verse: number,
): string | null {
  const entry = getMnspVerse(data, chapter, verse);
  const text = entry?.sotaku?.trim();
  return text || null;
}

export function getPreviewText(
  previewId: TranslationPreviewId,
  verse: number,
  privateTranslation: string,
  mnspData: MnspBookData | null,
  chapter: number,
): string {
  if (previewId === "private") {
    return privateTranslation.trim();
  }
  const chouyaku = getMnspChouyaku(mnspData, chapter, verse);
  return chouyaku ?? "";
}
