import type { Metadata } from "next";
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gbible — 新約聖書をギリシャ語原典で読む",
  description:
    "新約聖書のギリシャ語原典（SBLGNT）を語形解析・日本語辞書・私訳メモと一緒に読めるツール。コイネーギリシャ語の学習・聖書研究に。工房ヒラム運営。",
  openGraph: {
    url: "https://gbible.online",
  },
};

const SOURCES = [
  {
    name: "SBLGNT",
    fullName: "SBL Greek New Testament",
    credibility:
      "米国聖書文学会（Society of Biblical Literature）が発行する新約聖書批評版テキスト。SBL は世界最大規模の聖書学会で、学術出版の最高峰として知られます。",
    adoption:
      "Logos Bible Software、Accordance、Olive Tree など、世界中のプロ向け聖書研究ツールで標準テキストとして採用されています。",
  },
  {
    name: "MorphGNT",
    fullName: "Morphologically Analysed Greek New Testament",
    credibility:
      "新約聖書の全単語に品詞・格・数・性・時制・態などの形態論タグを付与したオープンソースコーパス。複数の聖書学・言語学の専門家によって構築・校正されています。",
    adoption:
      "OpenText.org をはじめ、国際的な学術 NLP プロジェクトや聖書言語教育ツールで広く利用。GitHub 上で継続的にメンテナンスされています。",
  },
  {
    name: "Strong's Concordance",
    fullName: "Strong's Exhaustive Concordance",
    credibility:
      "James Strong が 1890 年に完成させた聖書語彙索引。各単語に固有番号を割り当てた体系は、130 年以上にわたり聖書研究の標準参照番号として機能しています。",
    adoption:
      "BibleHub、Blue Letter Bible、Logos、YouVersion など、現代の主要な聖書ツールのほぼすべてで採用されている業界標準です。",
  },
];


export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/study");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* ヘッダー */}
      <header className="flex items-center border-b border-primary/20 bg-primary px-6 py-3">
        <Image src="/logo.png" alt="Gbible" width={120} height={40} className="h-8 w-auto" />
      </header>

      {/* メイン */}
      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        {/* キャッチ */}
        <div className="space-y-3">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
            ギリシャ語で聖書を読む
          </h2>
          <p className="mx-auto max-w-md text-base text-muted-foreground">
            新約聖書の原文を、語形解析・辞書・私訳メモと一緒に読めるツールです。
          </p>
        </div>

        {/* スクリーンショット */}
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

        {/* ボタン */}
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
              await signIn("google", { redirectTo: "/study" });
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

        {/* ログインのメリット */}
        <p className="text-xs text-muted-foreground">
          ログインすると私訳・メモをクラウドに保存でき、どの端末からでも続きを読めます。
        </p>
      </main>

      {/* 使用データの信頼性 */}
      <section className="border-t border-border bg-muted/40 px-6 py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="text-center">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              学術標準データを使用
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              テキストと語形解析は、世界中の聖書学者・研究ツールが採用している権威あるデータに基づいています。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {SOURCES.map((s) => (
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

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>日本語の語義・解説について：</strong>
            各単語の日本語訳語と辞書定義は AI（Claude by Anthropic）が生成したドラフトです。
            ギリシャ語の見出し語・文脈に基づいて生成していますが、神学者・言語学者による査読は行っていません。
            参照・学習目的の利用を推奨します。
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
              使用資料の詳細・ライセンスについて →
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-border bg-background px-6 py-5 text-center text-xs text-muted-foreground space-y-1">
        <p>
          運営:{" "}
          <a
            href="https://hiram.tokyo"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            工房ヒラム
          </a>
        </p>
        <p>© Gbible · <Link href="/about" className="underline underline-offset-2 hover:text-foreground">使用資料について</Link></p>
      </footer>
    </div>
  );
}
