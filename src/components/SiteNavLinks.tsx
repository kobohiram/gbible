"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/study",          label: "聖書を読む" },
  { href: "/study/synoptic", label: "共観福音書" },
  { href: "/grammar",        label: "文法" },
];

/** 今のページに最も具体的に当てはまるメニュー（/study/synoptic では「共観福音書」だけを強調） */
function activeHref(pathname: string): string | null {
  const matches = NAV.filter(({ href }) => pathname === href || pathname.startsWith(href + "/"));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

type Props = {
  /** ヘッダー背景が primary（暗色）のとき true */
  onDark?: boolean;
};

export function SiteNavLinks({ onDark = true }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 whitespace-nowrap" aria-label="サイトナビゲーション">
      {NAV.map(({ href, label }) => {
        const active = href === activeHref(pathname);

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
          <Link key={href} href={href} className={`${base} ${colorClass}`} aria-current={active ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
