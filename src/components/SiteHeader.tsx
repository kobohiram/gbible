"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteNavLinks } from "./SiteNavLinks";
import { AuthButton } from "./AuthButton";
import { DataBackupMenu } from "./DataBackupMenu";

type Props = {
  /** データ読み込み後のコールバック（聖書を読むページで私訳・メモを読み直す） */
  onDataImported?: () => void;
};

let userCountCache: number | null = null;

/** 全ページ共通のヘッダー。ページ固有の操作はヘッダーの下に置く */
export function SiteHeader({ onDataImported }: Props) {
  const [userCount, setUserCount] = useState<number | null>(userCountCache);

  useEffect(() => {
    if (userCountCache != null) return;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { users?: number } | null) => {
        if (d?.users != null) {
          userCountCache = d.users;
          setUserCount(d.users);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="shrink-0 border-b border-primary/30 bg-primary px-4 text-primary-foreground">
      <div className="flex min-h-14 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 text-lg font-bold tracking-tight text-primary-foreground hover:opacity-80"
            aria-label="GBIBLE トップへ"
          >
            <span className="font-extrabold text-accent">G</span>BIBLE
          </Link>
          <div className="hidden md:block">
            <SiteNavLinks onDark />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {userCount != null && userCount > 0 && (
            <span className="hidden text-xs text-primary-foreground/60 lg:inline">{userCount}人が利用中</span>
          )}
          <DataBackupMenu onImported={onDataImported ?? (() => {})} />
          <AuthButton />
        </div>
      </div>
      {/* スマホではメニューを2段目に置き、すべての項目が見えるようにする */}
      <div className="-mx-1 overflow-x-auto pb-2 md:hidden">
        <SiteNavLinks onDark />
      </div>
    </header>
  );
}
