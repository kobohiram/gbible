import type { Metadata } from "next";
import { Cardo, Geist, Geist_Mono, Gentium_Plus } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/Providers";
import { SITE_NAME, SITE_URL } from "@/lib/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cardo = Cardo({
  variable: "--font-cardo",
  subsets: ["greek", "greek-ext", "hebrew", "latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

const gentiumPlus = Gentium_Plus({
  variable: "--font-gentium-plus",
  subsets: ["greek", "greek-ext", "latin", "latin-ext"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Gbible｜聖書を原文で読む — 新約ギリシャ語・旧約ヘブル語",
    template: "%s — Gbible",
  },
  description:
    "新約聖書のギリシャ語・旧約聖書のヘブル語原文を、語形解析・日本語辞書・私訳メモと一緒に読める無料ツール。アルファベット・単語クイズと文法の解説で、原語を基礎から学べます。工房ヒラム運営。",
  applicationName: SITE_NAME,
  keywords: [
    "聖書 原文",
    "ギリシャ語",
    "ヘブル語",
    "ヘブライ語",
    "新約聖書",
    "旧約聖書",
    "原典",
    "コイネーギリシャ語",
    "聖書研究",
    "語形解析",
    "ギリシャ語クイズ",
    "SBLGNT",
    "MorphGNT",
  ],
  authors: [{ name: "工房ヒラム", url: "https://hiram.tokyo" }],
  creator: "工房ヒラム",
  publisher: "工房ヒラム",
  // ページ側で pageMetadata() を使わないとき（確認者ページなど）の既定値
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: SITE_NAME,
    images: [{ url: "/screenshot.png", width: 1400, height: 900 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/screenshot.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/** サイト全体の構造化データ（サイト名・運営者・どんなアプリか） */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: "ジーバイブル",
      inLanguage: "ja",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "工房ヒラム",
      url: "https://hiram.tokyo",
    },
    {
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      inLanguage: "ja",
      offers: { "@type": "Offer", price: "0", priceCurrency: "JPY" },
      description:
        "新約聖書のギリシャ語（SBLGNT）・旧約聖書のヘブル語（WLC）原文を、語形解析・日本語辞書・私訳メモと一緒に読めるウェブアプリ。ギリシャ語のアルファベット・単語クイズと文法の解説つき。",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${cardo.variable} ${gentiumPlus.variable}`}
    >
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-PYZNNRHHFQ"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-PYZNNRHHFQ');
          `}
        </Script>
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
