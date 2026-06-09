import { getLlmApiKey, saveLlmApiKey } from "@/lib/llm-settings";
import {
  loadAllTranslations,
  mergeTranslations,
  replaceAllTranslations,
} from "@/lib/storage";
import type { PersonalTranslation } from "@/types";

export const BACKUP_VERSION = 1 as const;

export type UserDataBackup = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  translations: PersonalTranslation[];
  llmApiKey?: string;
};

export type ImportMode = "merge" | "replace";

export function buildUserDataBackup(includeApiKey: boolean): UserDataBackup {
  const backup: UserDataBackup = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    translations: loadAllTranslations(),
  };
  if (includeApiKey) {
    const apiKey = getLlmApiKey();
    if (apiKey) backup.llmApiKey = apiKey;
  }
  return backup;
}

export function downloadUserDataBackup(includeApiKey: boolean): void {
  const backup = buildUserDataBackup(includeApiKey);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const date = backup.exportedAt.slice(0, 10);
  anchor.href = url;
  anchor.download = `gbible-backup-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function parseUserDataBackup(raw: string): UserDataBackup {
  const data = JSON.parse(raw) as UserDataBackup;
  if (data.version !== BACKUP_VERSION) {
    throw new Error("このバックアップ形式には対応していません。");
  }
  if (!Array.isArray(data.translations)) {
    throw new Error("バックアップデータが不正です。");
  }
  return data;
}

export function importUserDataBackup(
  backup: UserDataBackup,
  mode: ImportMode,
  importApiKey: boolean,
): { translationCount: number; apiKeyImported: boolean } {
  let translationCount: number;
  if (mode === "replace") {
    replaceAllTranslations(backup.translations);
    translationCount = backup.translations.length;
  } else {
    translationCount = mergeTranslations(backup.translations).total;
  }

  let apiKeyImported = false;
  if (importApiKey && backup.llmApiKey?.trim()) {
    saveLlmApiKey(backup.llmApiKey);
    apiKeyImported = true;
  }

  return { translationCount, apiKeyImported };
}
