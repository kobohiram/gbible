import Link from "next/link";
import { ABOUT_NAV, NAV_GROUPS } from "@/lib/site-nav";

/** 読み物のページ（クイズ・このサイトについて）の下に置く案内。全ページへのリンクを並べる */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30 px-6 py-8 text-sm">
      <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground">{group.label}</p>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-semibold text-foreground hover:text-primary hover:underline">
                    {item.label}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground">Gbible</p>
          <ul className="space-y-1.5">
            <li>
              <Link href={ABOUT_NAV.href} className="font-semibold text-foreground hover:text-primary hover:underline">
                {ABOUT_NAV.label}
              </Link>
            </li>
            <li>
              <Link href="/about#license" className="text-foreground/80 hover:text-primary hover:underline">
                使用資料・ライセンス
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-muted-foreground">
        © Gbible · 運営:{" "}
        <a
          href="https://hiram.tokyo"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          工房ヒラム
        </a>
      </p>
    </footer>
  );
}
