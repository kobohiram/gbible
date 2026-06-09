const API_KEY_STORAGE = "gbible-llm-api-key";

export function getLlmApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = localStorage.getItem(API_KEY_STORAGE)?.trim();
    return key || null;
  } catch {
    return null;
  }
}

export function hasLlmApiKey(): boolean {
  return getLlmApiKey() !== null;
}

export function saveLlmApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    clearLlmApiKey();
    return;
  }
  localStorage.setItem(API_KEY_STORAGE, trimmed);
}

export function clearLlmApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

/** 表示用に API キーをマスク（先頭7文字 + 末尾4文字） */
export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return "••••••••";
  return `${trimmed.slice(0, 7)}••••${trimmed.slice(-4)}`;
}

export function isLikelyOpenAiKey(key: string): boolean {
  return /^sk-/.test(key.trim());
}
