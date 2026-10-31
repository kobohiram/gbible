import { SynopticShell } from "@/components/synoptic/SynopticShell";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "共観福音書をギリシャ語原文で並べて読む — Gbible",
  description:
    "マタイ・マルコ・ルカの並行記事をギリシャ語原文で横に並べ、共通する語句や違いを見比べられる共観福音書ビュー。語形解析と辞書つき。",
  path: "/study/synoptic",
  keywords: ["共観福音書", "並行記事", "マタイ マルコ ルカ", "ギリシャ語", "シノプシス"],
});

export default function SynopticPage() {
  return <SynopticShell />;
}
