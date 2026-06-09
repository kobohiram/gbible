import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

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
    </div>
  );
}
