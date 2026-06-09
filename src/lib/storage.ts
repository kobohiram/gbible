import type { BookId, PersonalTranslation } from "@/types";

const STORAGE_KEY = "gbible-personal-translations";

function loadAll(): PersonalTranslation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersonalTranslation[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: PersonalTranslation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadAllTranslations(): PersonalTranslation[] {
  return loadAll();
}

export function replaceAllTranslations(items: PersonalTranslation[]): void {
  saveAll(items);
}

export function mergeTranslations(
  incoming: PersonalTranslation[],
): { merged: number; total: number } {
  const map = new Map(
    loadAll().map((t) => [`${t.bookId}:${t.chapter}:${t.verse}`, t]),
  );
  let merged = 0;
  for (const item of incoming) {
    const key = `${item.bookId}:${item.chapter}:${item.verse}`;
    const prev = map.get(key);
    if (
      !prev ||
      new Date(item.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()
    ) {
      if (!prev) merged += 1;
      map.set(key, item);
    }
  }
  const all = [...map.values()];
  saveAll(all);
  return { merged, total: all.length };
}

export function getTranslationsForChapter(
  bookId: BookId,
  chapter: number,
): PersonalTranslation[] {
  return loadAll().filter((t) => t.bookId === bookId && t.chapter === chapter);
}

export function getTranslation(
  bookId: BookId,
  chapter: number,
  verse: number,
): PersonalTranslation | undefined {
  return loadAll().find(
    (t) => t.bookId === bookId && t.chapter === chapter && t.verse === verse,
  );
}

export function saveTranslation(
  entry: Omit<PersonalTranslation, "updatedAt">,
): PersonalTranslation {
  const items = loadAll();
  const updated: PersonalTranslation = {
    ...entry,
    updatedAt: new Date().toISOString(),
  };
  const index = items.findIndex(
    (t) =>
      t.bookId === entry.bookId &&
      t.chapter === entry.chapter &&
      t.verse === entry.verse,
  );
  if (index >= 0) {
    items[index] = updated;
  } else {
    items.push(updated);
  }
  saveAll(items);
  return updated;
}
