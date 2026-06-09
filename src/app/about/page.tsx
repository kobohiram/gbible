import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "使用資料について — Gbible",
  description: "Gbible が使用しているギリシャ語本文・形態論データ・日本語訳の出典と方法論",
};

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-primary/20 bg-primary px-6 py-3">
        <Link
          href="/study"
          className="text-lg font-extrabold tracking-tight text-primary-foreground"
        >
          <span className="text-accent">G</span>bible
        </Link>
      </header>

      <main className="mx-auto max-w-2xl space-y-10 px-6 py-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">使用資料について</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gbible が使用しているテキスト・解析データ・日本語コンテンツの出典と生成方法を説明します。
          </p>
        </div>

        <Section title="ギリシャ語本文">
          <p>
            新約聖書のギリシャ語本文には{" "}
            <strong>SBLGNT（Society of Biblical Literature Greek New Testament）</strong>
            を使用しています。
          </p>
          <p>
            SBLGNT は聖書協会国際連盟（SBL）が公開している批評版テキストで、
            学術的に広く用いられています。テキストデータは{" "}
            <abbr title="MorphGNT プロジェクト">MorphGNT</abbr>{" "}
            プロジェクト（GitHub: morphgnt/sblgnt）経由で取得し、
            ライセンスは <strong>CC BY-SA 4.0</strong> に従います。
          </p>
          <Ref href="https://sblgnt.com">sblgnt.com</Ref>
        </Section>

        <Section title="形態論解析（語形解析）">
          <p>
            品詞・格・数・性・時制・態・法などの文法情報は{" "}
            <strong>MorphGNT</strong> が付与した解析データを使用しています。
            MorphGNT は各単語に対して詳細な形態論タグを付した機械可読コーパスで、
            学術研究・聖書ソフトウェアで広く採用されています。
          </p>
          <p>
            ライセンスは <strong>CC BY-SA 3.0</strong>。
            Gbible 内の「文法」表示（格・人称・時制など）はこのデータを日本語に変換して表示しています。
          </p>
          <Ref href="https://github.com/morphgnt/sblgnt">github.com/morphgnt/sblgnt</Ref>
        </Section>

        <Section title="Strong's 番号">
          <p>
            単語の同定に使用している Strong's 番号（G1234 形式）は、
            MorphGNT プロジェクトが公開している{" "}
            <strong>Strong&apos;s Dictionary XML</strong>（morphgnt/strongs-dictionary-xml）
            のギリシャ語見出し語との照合によって付与しています。
          </p>
          <p>
            Strong&apos;s 番号は 19 世紀に James Strong が作成した単語索引で、
            聖書研究ツールの標準的な語彙識別子として現在も広く使われています。
          </p>
        </Section>

        <Section title="日本語語義・辞書定義">
          <p>
            各単語の日本語語義（語形ごとの訳語）と辞書定義は{" "}
            <strong>AI（Claude by Anthropic）によって生成したドラフト</strong>
            です。ギリシャ語の見出し語・文脈・Strong's 番号をもとに生成しており、
            神学者・言語学者による査読は行っていません。
          </p>
          <p>
            そのため誤りや不適切な訳語が含まれる可能性があります。
            参照・学習目的でのご利用を推奨し、教義判断や翻訳の根拠としてそのまま使用することはお勧めしません。
          </p>
          <p className="text-xs text-muted-foreground">
            ※ AI 生成コンテンツには「AI下書き」バッジが表示されます。
            将来的に専門家によるレビュー済みエントリへ順次置き換える予定です。
          </p>
        </Section>

        <Section title="文脈補足（LLM）">
          <p>
            辞書ペインの「文脈補足」機能は、選択した単語の節・文脈をもとに{" "}
            <strong>Claude API をリアルタイムで呼び出して</strong>生成します。
            応答内容は毎回生成されるため一定ではなく、あくまで学習補助の参考情報です。
          </p>
        </Section>

        <Section title="出現回数データ">
          <p>
            単語の出現回数（書ごと・新約全体）は MorphGNT の全 27 巻テキストを
            事前に集計したインデックスファイルから取得しています。LLM は使用しておらず、
            MorphGNT のデータに基づく正確な頻度カウントです。
          </p>
        </Section>

        <Section title="ライセンスまとめ">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">データ</th>
                <th className="py-2 font-medium">ライセンス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr>
                <td className="py-2 pr-4">SBLGNT テキスト</td>
                <td className="py-2">CC BY-SA 4.0 / SBL</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">MorphGNT 形態論タグ</td>
                <td className="py-2">CC BY-SA 3.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Strong&apos;s Dictionary XML</td>
                <td className="py-2">Public Domain / CC0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">日本語語義・定義（AI生成）</td>
                <td className="py-2">Gbible 独自（査読なし）</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <p className="text-xs text-muted-foreground border-t border-border pt-6">
          誤りや改善点があればフィードバックをお寄せください。
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold border-b border-border pb-1">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function Ref({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      参照:{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:text-foreground"
      >
        {children}
      </a>
    </p>
  );
}
