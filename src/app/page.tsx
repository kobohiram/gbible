import { AppShell } from "@/components/AppShell";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "Gbible｜聖書を原文で読む — 新約ギリシャ語・旧約ヘブル語の語形解析と辞書",
  description:
    "新約聖書のギリシャ語原典（SBLGNT）と旧約聖書のヘブル語原典（WLC）を、単語ごとの語形解析・日本語辞書・私訳メモと一緒に無料で読めるウェブツール。みんなの聖書の日本語訳も並べて読めます。",
  path: "/",
  keywords: ["聖書 原文", "聖書 ギリシャ語", "聖書 ヘブル語", "新約聖書 原典", "旧約聖書 原典", "語形解析", "SBLGNT", "インターリニア"],
});

export default function Home() {
  return (
    <>
      <h1 className="sr-only">Gbible — 聖書を原文（新約ギリシャ語・旧約ヘブル語）で読む</h1>
      <AppShell />
    </>
  );
}
