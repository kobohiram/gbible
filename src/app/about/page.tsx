import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "使用資料について",
  description:
    "Gbible が使用するギリシャ語・ヘブル語本文、形態論データ、辞書、日本語語義の出典とライセンス。工房ヒラム運営。",
  openGraph: {
    url: "https://gbible.online/about",
  },
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

        <Section title="Strong&apos;s 番号">
          <p>
            単語の同定に使用している Strong&apos;s 番号（G1234 形式）は、
            MorphGNT プロジェクトが公開している{" "}
            <strong>Strong&apos;s Dictionary XML</strong>（morphgnt/strongs-dictionary-xml）
            のギリシャ語見出し語との照合によって付与しています。
          </p>
          <p>
            Strong&apos;s 番号は 19 世紀に James Strong が作成した単語索引で、
            聖書研究ツールの標準的な語彙識別子として現在も広く使われています。
          </p>
        </Section>

        <Section title="ヘブル語本文（旧約）">
          <p>
            旧約聖書のヘブル語本文には{" "}
            <strong>WLC（Westminster Leningrad Codex）</strong>
            を使用しています。テキストおよび形態論は{" "}
            <strong>OSHB（Open Scriptures Hebrew Bible）</strong> プロジェクトのデータに基づきます。
          </p>
          <p>
            WLC 本文はパブリックドメイン、OSHB のレンマ・形態論データは{" "}
            <strong>CC BY 4.0</strong> です。
            現在は創世記1章を試験公開しています。
          </p>
          <Ref href="https://hb.openscriptures.org">hb.openscriptures.org</Ref>
        </Section>

        <Section title="ヘブル語形態論解析">
          <p>
            旧約の品詞・語幹・性・数・状態などは OSHB が付与した形態論タグを使用しています。
            Gbible 内の「文法」表示はこのデータを日本語に変換して表示しています。
          </p>
          <Ref href="https://github.com/openscriptures/morphhb">github.com/openscriptures/morphhb</Ref>
        </Section>

        <Section title="ギリシャ語辞書（TBESG）">
          <p>
            新約の詳細辞書には Tyndale House（ケンブリッジ）の{" "}
            <strong>TBESG（Translators Brief lexicon of Extended Strongs for Greek）</strong>
            を使用しています。Abbott-Smith 要約に基づく CC BY 4.0 のオープンデータです。
          </p>
          <Ref href="https://github.com/STEPBible/STEPBible-Data">github.com/STEPBible/STEPBible-Data</Ref>
        </Section>

        <Section title="ヘブル語辞書（BDB + Strong's + TBESH）">
          <p>
            旧約の詳細辞書には{" "}
            <strong>TBESH</strong>（Tyndale House, CC BY 4.0）、
            <strong>Open Scriptures Hebrew Strong&apos;s</strong>（CC BY 4.0）、
            <strong>Brown-Driver-Briggs</strong>（Open Scriptures, CC BY 4.0）を
            統合した英語資料をもとに、AI が日本語化しています。
          </p>
          <Ref href="https://github.com/STEPBible/STEPBible-Data">github.com/STEPBible/STEPBible-Data</Ref>
          <Ref href="https://github.com/openscriptures/HebrewLexicon">github.com/openscriptures/HebrewLexicon</Ref>
        </Section>

        <Section title="日本語語義・辞書定義">
          <p>
            各単語の日本語語義（短い訳語）と辞書定義は、
            <strong>TBESG / TBESH / BDB / Strong&apos;s の英語エントリ</strong>をもとに{" "}
            <strong>AI（Claude by Anthropic）が日本語化</strong>したものです。
            オープンソース辞典の内容を根拠とし、神学者・言語学者による全文査読は行っていません。
          </p>
          <p>
            そのため誤りや不適切な訳語が含まれる可能性があります。
            参照・学習目的でのご利用を推奨します。
          </p>
          <p className="text-xs text-muted-foreground">
            ※ 辞書ペインに TBESG / BDB バッジが表示されます。
            再生成は <code className="text-xs">npm run generate:ot</code>（旧約）で行えます。
            API キーがない場合は <code className="text-xs">npm run build:ot-stub</code> でスタブ辞書を更新できます。
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

        <Section title="日本語訳（みんなの聖書）">
          <p>
            学習画面の参考訳として、
            <a
              href="https://bible.tbts.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-foreground"
            >
              みんなの聖書翻訳プロジェクト
            </a>
            の日本語訳を掲載しています。プロジェクトから使用の許可をいただいています。
          </p>
          <p>
            このプロジェクトは、原文の語順や文法をできるだけ残す<strong>素訳</strong>（直訳）と、
            日本語として読みやすく聞きなおす<strong>超訳</strong>（意訳）を並べて提示する翻訳です。
            聖書をただ読むだけでなく、原典の手触りを味わうことを目指しています。
          </p>
          <Ref href="https://bible.tbts.jp/greeting/">プロジェクトのご挨拶・趣旨（bible.tbts.jp）</Ref>
          <p>
            原文ペインでは超訳を「みんなの聖書」として表示し、
            メモペインでは素訳を「メモ（素訳）」として表示します。
            私訳と並べて読み比べできるよう、原文の下に積み重ねて表示しています。
          </p>
          <p>
            収録は書・章ごとに順次追加しています。
            未収録の節は「未収録（翻訳プロジェクト進行中）」と表示されます。
            現在の収録範囲はマルコ福音書1章、ルカ福音書1〜20章です。
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
                <td className="py-2 pr-4">WLC テキスト（旧約）</td>
                <td className="py-2">Public Domain</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">OSHB 形態論タグ</td>
                <td className="py-2">CC BY 4.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">TBESG / TBESH 辞典</td>
                <td className="py-2">CC BY 4.0 / Tyndale House</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">日本語語義・定義</td>
                <td className="py-2">Gbible（TBESG/TBESH ベース AI 日本語化）</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">みんなの聖書（超訳・素訳）</td>
                <td className="py-2">みんなの聖書翻訳プロジェクト（使用許諾・bible.tbts.jp）</td>
              </tr>
            </tbody>
          </table>
        </Section>

        <div className="border-t border-border pt-6 space-y-1 text-xs text-muted-foreground">
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
          <p>誤りや改善点があればフィードバックをお寄せください。</p>
        </div>
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
