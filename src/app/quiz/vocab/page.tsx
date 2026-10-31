import Link from "next/link";
import { ContentPage, NextSteps, ProseSection } from "@/components/ContentPage";
import { VocabQuizHub } from "@/components/vocab-quiz/VocabQuizHub";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "新約聖書ギリシャ語 単語クイズ｜頻出600語を4択で覚える — Gbible",
  description:
    "新約聖書のギリシャ語によく出る600語を、4択クイズで覚える無料の単語帳。『新約ギリシャ語エレメンツ』の単元順・品詞別・ランダムの3つの出題方法と、覚えた単語が一目でわかる進み具合の表つき。",
  path: "/quiz/vocab",
  keywords: ["ギリシャ語 単語", "ギリシャ語 単語帳", "新約聖書 ギリシャ語 単語", "コイネーギリシャ語 語彙", "新約ギリシャ語エレメンツ", "ギリシャ語クイズ"],
});

export default function VocabQuizPage() {
  return (
    <ContentPage
      title="新約聖書ギリシャ語 単語クイズ"
      lead="新約聖書によく出る単語を、4択クイズで少しずつ覚えましょう。覚えた単語は表に色がつきます。"
    >
      <VocabQuizHub />

      <div className="mx-auto max-w-2xl space-y-10 px-6 py-12">
        <ProseSection title="このクイズについて">
          <p>
            教科書『新約ギリシャ語エレメンツ』の単元に沿って、新約聖書で頻度の高い600語を収録しています。
            ギリシャ語の単語を見て、意味を4つの中から選びます。1回10問です。
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong>単元別</strong>… 教科書の順番どおりに進める</li>
            <li><strong>品詞別</strong>… 動詞・名詞・形容詞・前置詞などに絞って全単元から出題</li>
            <li><strong>ランダム</strong>… まだ覚えていない単語を優先して出題</li>
          </ul>
          <p>
            進み具合はこの端末に保存されます。Googleでログインすると、ほかの端末でも続きから学べます。
            文字がまだ読めない方は、先に
            <Link href="/quiz/alphabet" className="font-semibold underline underline-offset-2 hover:text-primary">アルファベット読み方クイズ</Link>
            から始めるのがおすすめです。
          </p>
        </ProseSection>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">次はこちら</h2>
          <NextSteps
            items={[
              { href: "/", label: "聖書を読む", description: "覚えた単語を、実際の聖書の原文で確かめる" },
              { href: "/grammar", label: "文法", description: "語形変化を図解とクイズで学ぶ" },
            ]}
          />
        </section>
      </div>
    </ContentPage>
  );
}
