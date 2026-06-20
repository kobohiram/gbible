"use client";

import { createElement, useEffect, useRef, useState } from "react";

type Options = {
  enabled: boolean;
  delayMs?: number;
  onSave: () => Promise<void>;
};

/** resetKey（書・章・節など）が変わった直後は保存しない */
export function useAutoSave(
  value: string,
  resetKey: string,
  { enabled, delayMs = 2000, onSave }: Options,
) {
  const [status, setStatus] = useState<"idle" | "pending" | "saved" | "error">("idle");
  const onSaveRef = useRef(onSave);
  const skipOnceRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    skipOnceRef.current = true;
    setStatus("idle");
  }, [resetKey]);

  useEffect(() => {
    if (!enabled) return;

    if (skipOnceRef.current) {
      skipOnceRef.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("pending");

    timerRef.current = setTimeout(() => {
      void onSaveRef
        .current()
        .then(() => {
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 2000);
        })
        .catch(() => setStatus("error"));
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, enabled, delayMs, resetKey]);

  return status;
}

function SaveStatus({ status }: { status: ReturnType<typeof useAutoSave> }) {
  if (status === "pending") {
    return createElement(
      "span",
      { className: "text-[10px] text-muted-foreground" },
      "保存中…",
    );
  }
  if (status === "saved") {
    return createElement(
      "span",
      { className: "text-[10px] text-primary" },
      "保存しました",
    );
  }
  if (status === "error") {
    return createElement(
      "span",
      { className: "text-[10px] text-red-600" },
      "保存に失敗",
    );
  }
  return null;
}

export { SaveStatus };
