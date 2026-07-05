"use client";

import Link from "next/link";
import { SiteNavLinks } from "./SiteNavLinks";
import { AuthButton } from "./AuthButton";
import { DataBackupMenu } from "./DataBackupMenu";

type Props = {
  /** ヘッダー右端の追加要素（ページ固有：ユーザー数表示・共観福音書リンクなど） */
  extra?: React.ReactNode;
  /** データ読み込み後のコールバック（聖書スタディーページ用） */
  onDataImported?: () => void;
};

export function SiteHeader({ extra, onDataImported }: Props) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-primary/30 bg-primary px-4 text-primary-foreground">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-primary-foreground hover:opacity-80"
          aria-label="GBIBLE トップへ"
        >
          <span className="font-extrabold text-accent">G</span>BIBLE
        </Link>
        <SiteNavLinks onDark />
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <DataBackupMenu onImported={onDataImported ?? (() => {})} />
        <AuthButton />
      </div>
    </header>
  );
}
