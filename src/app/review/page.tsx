import type { Metadata } from "next";
import { ReviewDashboard } from "@/components/ReviewDashboard";

export const metadata: Metadata = {
  title: "確認待ちの提案",
  description: "みんなで作る辞書：確認者向けの提案一覧と確認者の管理",
  robots: { index: false },
};

export default function ReviewPage() {
  return <ReviewDashboard />;
}
