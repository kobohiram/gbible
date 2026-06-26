"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",        label: "トップ" },
  { href: "/study",   label: "聖書を読む" },
  { href: "/grammar", label: "文法" },
];

type Props = {
  /** ヘッダー背景が primary（暗色）のとき true */
  onDark?: boolean;
};

export function SiteNavLinks({ onDark = true }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5" aria-label="サイトナビゲーション">
      {NAV.map(({ href, label }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(href + "/");

        const base =
          "rounded px-2.5 py-1 text-sm font-semibold transition-colors";

        const colorClass = onDark
          ? active
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          : active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground";

        return (
          <Link key={href} href={href} className={`${base} ${colorClass}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
