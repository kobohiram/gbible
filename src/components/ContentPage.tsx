import Link from "next/link";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

type Props = {
  title: string;
  lead: React.ReactNode;
  children: React.ReactNode;
};

/** クイズ・このサイトについて など、上から下へ読むページの共通の枠 */
export function ContentPage({ title, lead, children }: Props) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />
      <div className="border-b border-primary/10 bg-primary/5 px-6 pt-10 pb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-balance text-foreground [word-break:auto-phrase] sm:text-3xl">{title}</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground [word-break:auto-phrase]">{lead}</p>
      </div>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** ページの下に置く「次はこちら」の案内。学ぶ順番に沿って次のページへ誘う */
export function NextSteps({ items }: { items: { href: string; label: string; description: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <p className="text-sm font-bold text-foreground group-hover:text-primary">{item.label} →</p>
          <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}

/** 読み物の小見出しと本文 */
export function ProseSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <h2 className="border-b border-border pb-1 text-base font-semibold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
