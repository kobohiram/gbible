import type { Metadata } from "next";
import { auth, signIn } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { VocabQuizHub } from "@/components/vocab-quiz/VocabQuizHub";

export const metadata: Metadata = {
  title: "Gbible — ギリシャ語単語クイズ・聖書原文リーダー",
  description:
    "ギリシャ語クイズ（新約エレメンツ準拠・600語）と、新約・旧約原文を語形解析・辞書・私訳メモと一緒に読めるツール。工房ヒラム運営。",
  openGraph: {
    url: "https://gbible.online",
  },
};

const NT_SOURCES = [
  {
    name: "SBLGNT",
    fullName: "SBL Greek New Testament",
    credibility:
      "米国聖書文学会（SBL）が発行する新約批評版テキスト。学術出版で広く採用されています。",
    adoption:
      "Logos、Accordance、Olive Tree など主要な聖書研究ツールの標準テキスト。",
  },
  {
    name: "MorphGNT",
    fullName: "Morphologically Analysed Greek New Testament",
    credibility:
      "新約全単語に形態論タグを付与したオープンソースコーパス。専門家による校正済み。",
    adoption:
      "学術 NLP プロジェクトや聖書言語教育ツールで広く利用。",
  },
  {
    name: "TBESG",
    fullName: "Translators Brief lexicon of Extended Strongs (Greek)",
    credibility:
      "Tyndale House（ケンブリッジ）による Abbott-Smith 要約辞書。CC BY 4.0。",
    adoption:
      "STEP Bible プロジェクトの標準ギリシャ語辞書データ。",
  },
];

const OT_SOURCES = [
  {
    name: "WLC / OSHB",
    fullName: "Westminster Leningrad Codex + Open Scriptures Hebrew Bible",
    credibility:
      "レニングラード写本に基づくヘブル語旧約本文と、OSHB による形態論解析（CC BY 4.0）。",
    adoption:
      "Open Scriptures、Logos、BibleHub などで広く参照されるオープンデータ。",
  },
  {
    name: "BDB + Strong's",
    fullName: "Brown-Driver-Briggs + Hebrew Strong's (Open Scriptures)",
    credibility:
      "BDB 全文ベースと Strong's ヘブル語辞典。Open Scriptures Hebrew Bible Project, CC BY 4.0。",
    adoption:
      "Blue Letter Bible 等が参照する BDB のオープン版。",
  },
  {
    name: "TBESH",
    fullName: "Translators Brief lexicon of Extended Strongs (Hebrew)",
    credibility:
      "Tyndale House による BDB（Brown-Driver-Briggs）要約辞書。CC BY 4.0。",
    adoption:
      "STEP Bible プロジェクトの標準ヘブル語辞書データ。",
  },
  {
    name: "Strong's",
    fullName: "Strong's Exhaustive Concordance",
    credibility:
      "James Strong が作成した聖書語彙索引。ギリシャ語・ヘブル語の標準参照番号。",
    adoption:
      "BibleHub、Blue Letter Bible、Logos など主要ツールで採用。",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  await auth();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader />

      <VocabQuizHub />

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <div className="space-y-3">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
            原文で聖書を読む
          </h2>
          <p className="mx-auto max-w-md text-base text-muted-foreground">
            新約（ギリシャ語）と旧約（ヘブル語）を、語形解析・辞書・私訳メモと一緒に読めるツールです。
            参考訳として
            <a
              href="https://bible.tbts.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
            >
              みんなの聖書翻訳プロジェクト
            </a>
            の日本語訳も掲載しています。
          </p>
        </div>

        <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-border shadow-lg">
          <Image
            src="/screenshot.png"
            alt="Gbible 画面イメージ"
            width={1400}
            height={900}
            className="w-full"
            priority
          />
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/study"
            className="rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow hover:opacity-90"
          >
            ログインせずに開く
          </Link>
          <form
            action={async () => {
              "use server";
              const { callbackUrl: cb } = await searchParams;
              await signIn("google", { redirectTo: cb ?? "/study" });
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-primary bg-background px-8 py-3 text-base font-semibold text-primary shadow hover:bg-primary/5"
            >
              Googleでログイン
            </button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground">
          ログインすると私訳・メモをクラウドに保存でき、どの端末からでも続きを読めます。
        </p>
      </main>

      <section className="border-t border-border bg-muted/40 px-6 py-12">
        <div className="mx-auto max-w-3xl space-y-10">
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              学術標準データを使用
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              テキストと語形解析は、世界中の聖書学者・研究ツールが採用している権威あるオープンデータに基づいています。
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-center text-sm font-semibold text-foreground">新約（ギリシャ語）</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {NT_SOURCES.map((s) => (
                <div
                  key={s.name}
                  className="rounded-lg border border-border bg-background p-4 space-y-2"
                >
                  <div>
                    <p className="text-xs font-mono font-semibold text-primary">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.fullName}</p>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80">{s.credibility}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{s.adoption}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-center text-sm font-semibold text-foreground">旧約（ヘブル語）</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {OT_SOURCES.map((s) => (
                <div
                  key={s.name}
                  className="rounded-lg border border-border bg-background p-4 space-y-2"
                >
                  <div>
                    <p className="text-xs font-mono font-semibold text-primary">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.fullName}</p>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80">{s.credibility}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{s.adoption}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-4 text-left text-sm leading-relaxed text-foreground/90">
            <h3 className="mb-2 font-semibold text-foreground">日本語訳（みんなの聖書）</h3>
            <p>
              <a
                href="https://bible.tbts.jp"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-foreground underline underline-offset-2 hover:text-primary"
              >
                みんなの聖書翻訳プロジェクト
              </a>
              の訳を、原文と並べて読めるように掲載しています。
              プロジェクトから使用の許可をいただいています。
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              素訳（原文に近い直訳）と超訳（読みやすい意訳）を並べて味わう翻訳です。
              <a
                href="https://bible.tbts.jp/greeting/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline underline-offset-2 hover:text-foreground"
              >
                プロジェクトの趣旨
              </a>
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
              <li>原文ペインの「みんなの聖書」… 超訳（読みやすい日本語訳）</li>
              <li>メモペインの「メモ（素訳）」… 素訳（原文に近い訳）</li>
              <li>収録は順次追加（現在：創世記1〜11章、マルコ1章、ルカ1〜20章）</li>
            </ul>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>日本語の語義・辞書について：</strong>
            辞書は TBESG（ギリシャ語）・BDB/Strong&apos;s/TBESH（ヘブル語）などのオープンソース辞典をもとに、
            AI（Claude by Anthropic）が日本語化したものです。参照・学習目的の利用を推奨します。
            旧約は現在、創世記1章を試験公開中です。
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
              使用資料の詳細・ライセンスについて →
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-border bg-background px-6 py-4 text-center text-xs text-muted-foreground">
        © Gbible · 運営:{" "}
        <a
          href="https://hiram.tokyo"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          工房ヒラム
        </a>
      </footer>
    </div>
  );
}
