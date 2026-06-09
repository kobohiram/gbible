"use client";

import { useRef, useState } from "react";
import {
  downloadUserDataBackup,
  importUserDataBackup,
  parseUserDataBackup,
  type ImportMode,
} from "@/lib/user-data-backup";
import { Button } from "@/components/ui/button";

type Props = {
  onImported: () => void;
};

export function DataBackupMenu({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [includeApiKeyOnExport, setIncludeApiKeyOnExport] = useState(false);
  const [importApiKey, setImportApiKey] = useState(true);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    setError(null);
    downloadUserDataBackup(includeApiKeyOnExport);
    setMessage("バックアップファイルをダウンロードしました。");
  }

  async function handleImport(file: File) {
    setError(null);
    setMessage(null);
    try {
      const text = await file.text();
      const backup = parseUserDataBackup(text);
      const result = importUserDataBackup(backup, importMode, importApiKey);
      onImported();
      const parts = [`私訳 ${result.translationCount} 件を反映`];
      if (result.apiKeyImported) parts.push("APIキーを反映");
      setMessage(`${parts.join("、")}しました。`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "読み込みに失敗しました。",
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
        onClick={() => setOpen((v) => !v)}
      >
        データ
      </Button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-card p-3 text-sm text-foreground shadow-lg">
            <p className="text-xs leading-relaxed text-muted-foreground">
              私訳・メモはこのブラウザの localStorage に保存されています。別ブラウザや端末では
              <strong className="font-semibold text-foreground">
                書き出し → 読み込み
              </strong>
              で移せます（ログイン同期は今後対応予定）。
            </p>

            <div className="mt-3 space-y-2">
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={includeApiKeyOnExport}
                  onChange={(e) => setIncludeApiKeyOnExport(e.target.checked)}
                />
                <span>書き出しに LLM の API キーも含める</span>
              </label>
              <Button type="button" size="sm" className="w-full" onClick={handleExport}>
                書き出し（JSON）
              </Button>
            </div>

            <div className="mt-3 space-y-2 border-t border-border pt-3">
              <fieldset className="space-y-1 text-xs">
                <legend className="font-semibold text-foreground">読み込み方法</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === "merge"}
                    onChange={() => setImportMode("merge")}
                  />
                  統合（新しい方を優先）
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                  />
                  すべて置き換え
                </label>
              </fieldset>
              <label className="flex items-start gap-2 text-xs">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={importApiKey}
                  onChange={(e) => setImportApiKey(e.target.checked)}
                />
                <span>API キーも読み込む（ファイルに含まれる場合）</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImport(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                読み込み
              </Button>
            </div>

            {message && (
              <p className="mt-2 text-xs text-[var(--grammar)]">{message}</p>
            )}
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
