import Image from "next/image";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { ContentPage, ProseSection } from "@/components/ContentPage";
import { OT_PUBLISHED, getBook, getChapterCount } from "@/data/bible";
import { pageMetadata } from "@/lib/site-metadata";
import { NAV_GROUPS } from "@/lib/site-nav";
import type { OtBookId } from "@/types";

export const metadata = pageMetadata({
  title: "このサイトについて｜使い方・使用資料・ライセンス — Gbible",
  description:
    "Gbible（ジーバイブル）は、新約ギリシャ語・旧約ヘブル語の聖書原文を語形解析・日本語辞書・私訳メモと一緒に読める無料ツールです。できること、使用している本文・辞書の出典、AIによる日本語化、ライセンスをまとめています。",
  path: "/about",
  keywords: ["Gbible", "聖書 原文 ツール", "SBLGNT", "WLC", "MorphGNT", "OSHB", "ライセンス", "みんなの聖書"],
});

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
];

/** 旧約の公開範囲（例:「創世記・出エジプト記（全章）、詩篇1・23・24篇」）。ot-published.json から作る */
function otCoverageText(): string {
  const whole: string[] = [];
  const partial: string[] = [];
  for (const [id, v] of Object.entries(OT_PUBLISHED)) {
    if (!v) continue;
    const bookId = id as OtBookId;
    const name = getBook(bookId).name;
    if (v.chapters.length === getChapterCount(bookId)) {
      whole.push(name);
    } else {
      const unit = bookId === "psalms" ? "篇" : "章";
      partial.push(`${name}${v.chapters.join("・")}${unit}`);
    }
  }
  return [whole.length ? `${whole.join("・")}（全章）` : "", ...partial].filter(Boolean).join("、");
}

const MNSP_COVERAGE = "創世記1〜11章、マルコ福音書1章、ルカ福音書1〜20章";

export default async function AboutPage() {
  const session = await auth();
  const otCoverage = otCoverageText();

  // 画面に出している質問と答えをそのまま構造化データにする（検索結果やAIの回答で引用されやすくする）
  const faqs = [
    {
      q: "Gbible は無料で使えますか？",
      a: "はい、無料です。ログインしなくても聖書を読む画面・クイズ・文法をすべて使えます。Googleでログインすると、私訳やメモ、クイズの進み具合をクラウドに保存して、どの端末からでも続きを読めます。",
    },
    {
      q: "どの聖書本文を使っていますか？",
      a: `新約聖書はギリシャ語の SBLGNT（SBL Greek New Testament）、旧約聖書はヘブル語の WLC（Westminster Leningrad Codex）です。旧約は現在、${otCoverage}を公開しています。`,
    },
    {
      q: "ギリシャ語やヘブル語が読めなくても使えますか？",
      a: "使えます。原文の単語をクリックすると、品詞・格・時制などの語形解析と日本語の意味が表示されます。文字から学びたい方は、アルファベット読み方クイズと単語クイズから始められます。",
    },
    {
      q: "日本語訳は載っていますか？",
      a: `みんなの聖書翻訳プロジェクトの許可を得て、超訳（読みやすい訳）と素訳（原文に近い訳）を原文と並べて表示しています。現在の収録範囲は${MNSP_COVERAGE}です。`,
    },
    {
      q: "辞書の日本語は誰が書いていますか？",
      a: "Tyndale House の TBESG・TBESH や BDB などのオープンな英語辞典をもとに、AI（Claude）が日本語化したものです。旧約は「みんなで作る辞書」として、ヘブル語の分かる方の確認を経たものに「確認済み」と表示しています。",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <ContentPage
      title="このサイトについて"
      lead="Gbible は、新約聖書（ギリシャ語）と旧約聖書（ヘブル語）を原文で読むための無料ツールです。語形解析・辞書・私訳メモと一緒に、一語ずつ確かめながら読めます。"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mx-auto max-w-3xl space-y-12 px-6 py-12">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-border shadow-lg">
            <Image
              src="/screenshot.png"
              alt="Gbible の聖書を読む画面。原文・辞書・メモが横に並ぶ"
              width={1400}
              height={900}
              className="w-full"
              priority
            />
          </div>
          <p className="text-sm leading-relaxed text-foreground/90">
            原文の単語を選ぶと、その語の形（品詞・格・時制など）と辞書の説明が隣に表示されます。
            自分の訳（私訳）やメモを節ごとに書き残せるほか、参考訳として
            <a
              href="https://bible.tbts.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-primary"
            >
              みんなの聖書翻訳プロジェクト
            </a>
            の日本語訳も並べて読めます。
          </p>
        </section>

        <ProseSection title="Gbible でできること">
          <div className="grid gap-4 sm:grid-cols-2">
            {NAV_GROUPS.map((group) => (
              <div key={group.label} className="rounded-lg border border-border bg-background p-4">
                <p className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground">{group.label}</p>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href} className="font-semibold text-foreground hover:text-primary hover:underline">
                        {item.label} →
                      </Link>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            はじめての方は「アルファベット」→「単語クイズ」→「聖書を読む」の順がおすすめです。
          </p>
        </ProseSection>

        <ProseSection title="ログインするとできること">
          <p>
            ログインしなくても、すべての画面を使えます。Googleでログインすると、私訳・メモ・クイズの進み具合をクラウドに保存でき、どの端末からでも続きを読めます。
            旧約の「みんなで作る辞書」への確認や提案もできます。
          </p>
          <div className="flex flex-col items-start gap-3 pt-2 sm:flex-row sm:items-center">
            <Link
              href="/"
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow hover:opacity-90"
            >
              聖書を読む
            </Link>
            {!session?.user && (
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-primary bg-background px-6 py-2.5 text-sm font-semibold text-primary shadow hover:bg-primary/5"
                >
                  Googleでログイン
                </button>
              </form>
            )}
          </div>
        </ProseSection>

        <ProseSection title="よくある質問">
          <dl className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-1 text-foreground/80">{f.a}</dd>
              </div>
            ))}
          </dl>
        </ProseSection>

        <ProseSection title="学術標準データを使用">
          <p>
            テキストと語形解析は、世界中の聖書学者・研究ツールが採用しているオープンデータに基づいています。
          </p>
          <SourceCards heading="新約（ギリシャ語）" sources={NT_SOURCES} />
          <SourceCards heading="旧約（ヘブル語）" sources={OT_SOURCES} />
        </ProseSection>

        <ProseSection id="sources" title="ギリシャ語本文（新約）">
          <p>
            新約聖書のギリシャ語本文には{" "}
            <strong>SBLGNT（Society of Biblical Literature Greek New Testament）</strong>
            を使用しています。
          </p>
          <p>
            SBLGNT は米国聖書文学会（SBL）が公開している批評版テキストで、
            学術的に広く用いられています。テキストデータは{" "}
            <abbr title="MorphGNT プロジェクト">MorphGNT</abbr>{" "}
            プロジェクト（GitHub: morphgnt/sblgnt）経由で取得し、
            ライセンスは <strong>CC BY-SA 4.0</strong> に従います。
          </p>
          <Ref href="https://sblgnt.com">sblgnt.com</Ref>
        </ProseSection>

        <ProseSection title="形態論解析（語形解析）">
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
        </ProseSection>

        <ProseSection title="Strong's 番号">
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
        </ProseSection>

        <ProseSection title="ヘブル語本文（旧約）">
          <p>
            旧約聖書のヘブル語本文には{" "}
            <strong>WLC（Westminster Leningrad Codex）</strong>
            を使用しています。テキストおよび形態論は{" "}
            <strong>OSHB（Open Scriptures Hebrew Bible）</strong> プロジェクトのデータに基づきます。
          </p>
          <p>
            WLC 本文はパブリックドメイン、OSHB のレンマ・形態論データは{" "}
            <strong>CC BY 4.0</strong> です。
            現在は{otCoverage}を公開しています。
          </p>
          <Ref href="https://hb.openscriptures.org">hb.openscriptures.org</Ref>
        </ProseSection>

        <ProseSection title="ヘブル語形態論解析">
          <p>
            旧約の品詞・語幹・性・数・状態などは OSHB が付与した形態論タグを使用しています。
            Gbible 内の「文法」表示はこのデータを日本語に変換して表示しています。
          </p>
          <Ref href="https://github.com/openscriptures/morphhb">github.com/openscriptures/morphhb</Ref>
        </ProseSection>

        <ProseSection title="ギリシャ語辞書（TBESG）">
          <p>
            新約の詳細辞書には Tyndale House（ケンブリッジ）の{" "}
            <strong>TBESG（Translators Brief lexicon of Extended Strongs for Greek）</strong>
            を使用しています。Abbott-Smith 要約に基づく CC BY 4.0 のオープンデータです。
          </p>
          <Ref href="https://github.com/STEPBible/STEPBible-Data">github.com/STEPBible/STEPBible-Data</Ref>
        </ProseSection>

        <ProseSection title="ヘブル語辞書（BDB + Strong's + TBESH）">
          <p>
            旧約の詳細辞書には{" "}
            <strong>TBESH</strong>（Tyndale House, CC BY 4.0）、
            <strong>Open Scriptures Hebrew Strong&apos;s</strong>（CC BY 4.0）、
            <strong>Brown-Driver-Briggs</strong>（Open Scriptures, CC BY 4.0）を
            統合した英語資料をもとに、AI が日本語化しています。
          </p>
          <Ref href="https://github.com/STEPBible/STEPBible-Data">github.com/STEPBible/STEPBible-Data</Ref>
          <Ref href="https://github.com/openscriptures/HebrewLexicon">github.com/openscriptures/HebrewLexicon</Ref>
        </ProseSection>

        <ProseSection title="日本語語義・辞書定義">
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
        </ProseSection>

        <ProseSection title="文脈補足（LLM）">
          <p>
            辞書ペインの「文脈補足」機能は、選択した単語の節・文脈をもとに{" "}
            <strong>Claude API をリアルタイムで呼び出して</strong>生成します。
            応答内容は毎回生成されるため一定ではなく、あくまで学習補助の参考情報です。
          </p>
        </ProseSection>

        <ProseSection title="出現回数データ">
          <p>
            単語の出現回数（書ごと・新約全体）は MorphGNT の全 27 巻テキストを
            事前に集計したインデックスファイルから取得しています。LLM は使用しておらず、
            MorphGNT のデータに基づく正確な頻度カウントです。
          </p>
        </ProseSection>

        <ProseSection title="日本語訳（みんなの聖書）">
          <p>
            聖書を読む画面の参考訳として、
            <a
              href="https://bible.tbts.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-primary"
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
          <ul className="list-inside list-disc space-y-1">
            <li>原文ペインの「みんなの聖書」… 超訳（読みやすい日本語訳）</li>
            <li>メモペインの「メモ（素訳）」… 素訳（原文に近い訳）</li>
          </ul>
          <p>
            創世記の翻訳資料では、スプレッドシート上の列名が「原訳」となっていますが、
            新約資料の「素訳」と同じ直訳テキストを指します。Gbible ではいずれも素訳として扱います。
          </p>
          <p>
            収録は書・章ごとに順次追加しています。
            未収録の節は「未収録（翻訳プロジェクト進行中）」と表示されます。
            現在の収録範囲は{MNSP_COVERAGE}です。
          </p>
        </ProseSection>

        <ProseSection title="みんなで作る辞書（旧約）">
          <p>
            旧約の原文ペインの短い訳（文脈訳）と辞書の説明は、AI（Claude）が英語辞典資料をもとに下書きし、別の AI が点検したものです。その後、ヘブル語が分かる方に確かめていただき、運営者が指名した確認者が承認したものから「確認済み」と表示されます。
          </p>
          <p>
            ログインした方は「この訳で正しい」の確認や修正の提案ができます。送っていただいた内容は Gbible の辞書として CC BY 4.0 で公開され、改良されることがあります。日本語訳聖書の本文は著作権のため投稿しないでください。
          </p>
        </ProseSection>

        <ProseSection id="license" title="ライセンス・著作権まとめ">
          <table className="w-full border-collapse text-sm">
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
                <td className="py-2 pr-4">BDB / Hebrew Strong&apos;s（Open Scriptures）</td>
                <td className="py-2">CC BY 4.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">日本語語義・定義</td>
                <td className="py-2">Gbible（TBESG/TBESH ベース AI 日本語化）</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">みんなで作る辞書（投稿内容）</td>
                <td className="py-2">CC BY 4.0</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">みんなの聖書（超訳・素訳）</td>
                <td className="py-2">みんなの聖書翻訳プロジェクト（使用許諾・bible.tbts.jp）</td>
              </tr>
            </tbody>
          </table>
        </ProseSection>

        <ProseSection title="運営">
          <p>
            Gbible は{" "}
            <a
              href="https://hiram.tokyo"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:text-primary"
            >
              工房ヒラム
            </a>
            が運営しています。誤りや改善点があればフィードバックをお寄せください。
          </p>
        </ProseSection>
      </div>
    </ContentPage>
  );
}

function SourceCards({
  heading,
  sources,
}: {
  heading: string;
  sources: { name: string; fullName: string; credibility: string; adoption: string }[];
}) {
  return (
    <div className="pt-2">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{heading}</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {sources.map((s) => (
          <div key={s.name} className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="font-mono text-xs font-semibold text-primary">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.fullName}</p>
            </div>
            <p className="text-xs leading-relaxed text-foreground/80">{s.credibility}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{s.adoption}</p>
          </div>
        ))}
      </div>
    </div>
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
