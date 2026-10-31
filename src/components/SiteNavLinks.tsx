"use client";

import { Fragment, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ABOUT_NAV, NAV_GROUPS, activeNavHref, type NavItem } from "@/lib/site-nav";

type Props = {
  /** ヘッダー背景が primary（暗色）のとき true */
  onDark?: boolean;
};

/** 「読む」「学ぶ」のまとまりごとに区切って並べる。今いるページは強調する */
export function SiteNavLinks({ onDark = true }: Props) {
  const pathname = usePathname();
  const current = activeNavHref(pathname);
  const navRef = useRef<HTMLElement>(null);

  // 狭い画面ではメニューが横にスクロールするので、今いるページの項目を見える位置へ寄せる
  useEffect(() => {
    const nav = navRef.current;
    const scroller = nav?.parentElement;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!scroller || !link || scroller.scrollWidth <= scroller.clientWidth) return;
    const offset = link.getBoundingClientRect().left - scroller.getBoundingClientRect().left;
    scroller.scrollLeft += offset - (scroller.clientWidth - link.offsetWidth) / 2;
  }, [current]);

  const divider = (
    <span
      aria-hidden
      className={`mx-1.5 h-4 w-px shrink-0 ${onDark ? "bg-primary-foreground/25" : "bg-border"}`}
    />
  );

  function renderLink({ href, label, description }: NavItem) {
    const active = href === current;
    const base = "rounded px-2.5 py-1 text-sm font-semibold transition-colors";
    const colorClass = onDark
      ? active
        ? "bg-primary-foreground/15 text-primary-foreground"
        : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
      : active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground";

    return (
      <Link
        key={href}
        href={href}
        title={description}
        className={`${base} ${colorClass}`}
        aria-current={active ? "page" : undefined}
      >
        {label}
      </Link>
    );
  }

  return (
    <nav ref={navRef} className="flex items-center whitespace-nowrap" aria-label="サイトナビゲーション">
      {NAV_GROUPS.map((group, i) => (
        <Fragment key={group.label}>
          {i > 0 && divider}
          <div role="group" aria-label={group.label} className="flex items-center gap-0.5">
            <span
              className={`mr-1 hidden text-[10px] font-semibold tracking-wider xl:inline ${
                onDark ? "text-primary-foreground/45" : "text-muted-foreground"
              }`}
            >
              {group.label}
            </span>
            {group.items.map(renderLink)}
          </div>
        </Fragment>
      ))}
      {divider}
      {renderLink(ABOUT_NAV)}
    </nav>
  );
}
