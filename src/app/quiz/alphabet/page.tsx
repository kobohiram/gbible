import { ContentPage, NextSteps, ProseSection } from "@/components/ContentPage";
import { AlphabetQuizHub } from "@/components/vocab-quiz/AlphabetQuizHub";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata({
  title: "ギリシャ語アルファベット読み方クイズ｜24文字・二重母音・気息記号 — Gbible",
  description:
    "新約聖書のギリシャ語アルファベット24文字の読み方を、学問的発音（エラスムス式）で覚える無料クイズ。50音順の音読み・文字の名前・二重母音・気息記号・聖書の単語まで4ステップ。歌の動画と読み方一覧表つき。",
  path: "/quiz/alphabet",
  keywords: ["ギリシャ語 アルファベット", "ギリシャ文字 読み方", "ギリシャ語 発音", "エラスムス式", "コイネーギリシャ語 入門", "新約聖書 ギリシャ語"],
});

export default function AlphabetQuizPage() {
  return (
    <ContentPage
      title="ギリシャ語アルファベット 読み方クイズ"
      lead="新約聖書のギリシャ語を読む第一歩。24文字の読み方を、歌とクイズで楽しく覚えましょう。"
    >
      <AlphabetQuizHub />

      <div className="mx-auto max-w-2xl space-y-10 px-6 py-12">
        <ProseSection title="このクイズについて">
          <p>
            ギリシャ語の文字を、<strong>学問的発音（エラスムス式）</strong>で読めるようにするクイズです。
            表示された文字や単語を見て、正しい読み方を4つの中から選びます。
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li><strong>ステップ1「50音」</strong>… α ι υ ε ο などを、あいうえお順に子音＋母音で読む</li>
            <li><strong>ステップ2「文字」</strong>… 24文字の名前と音</li>
            <li><strong>ステップ3「二重母音と記号」</strong>… αι・ου などの二重母音、気息記号、γγ</li>
            <li><strong>ステップ4「単語を読む」</strong>… λόγος など聖書の大切な単語</li>
          </ul>
          <p>
            進み具合はこの端末に保存されます。Googleでログインすると、ほかの端末でも続きから学べます。
          </p>
        </ProseSection>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">次はこちら</h2>
          <NextSteps
            items={[
              { href: "/quiz/vocab", label: "単語クイズ", description: "新約聖書によく出る600語を覚える" },
              { href: "/grammar", label: "文法", description: "文字と発音の解説から始まるギリシャ語文法" },
            ]}
          />
        </section>
      </div>
    </ContentPage>
  );
}
