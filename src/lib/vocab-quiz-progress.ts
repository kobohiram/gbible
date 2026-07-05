const STORAGE_KEY = "vocab_quiz_progress_v1";

export function loadVocabProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveVocabProgress(map: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function syncVocabProgressFromDB(): Promise<Record<string, boolean>> {
  try {
    const res = await fetch("/api/vocab-quiz-progress");
    if (!res.ok) return {};
    const { learned } = await res.json();
    const map: Record<string, boolean> = {};
    for (const wordId of learned as string[]) {
      map[wordId] = true;
    }
    return map;
  } catch {
    return {};
  }
}

export async function postVocabProgressToDb(wordId: string) {
  try {
    await fetch("/api/vocab-quiz-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId }),
    });
  } catch {
    // silent — localStorage already saved
  }
}
