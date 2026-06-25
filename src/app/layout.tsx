import type { Metadata } from "next";
import { Cardo, Geist, Geist_Mono, Gentium_Plus } from "next/font/google";
import Script from "next/script";
import { Providers } from "@/components/Providers";
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
  metadataBase: new URL("https://gbible.online"),
  title: {
    default: "Gbible — 新約聖書をギリシャ語原典で読む",
    template: "%s — Gbible",
  },
  description:
    "新約聖書のギリシャ語原典（SBLGNT）を、語形解析・日本語辞書・私訳メモと一緒に読めるツール。工房ヒラム運営。",
  keywords: [
    "新約聖書",
    "ギリシャ語",
    "原典",
    "コイネーギリシャ語",
    "聖書研究",
    "語形解析",
    "SBLGNT",
    "MorphGNT",
    "聖書",
    "原文",
  ],
  authors: [{ name: "工房ヒラム", url: "https://hiram.tokyo" }],
  creator: "工房ヒラム",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "https://gbible.online",
    siteName: "Gbible",
    title: "Gbible — 新約聖書をギリシャ語原典で読む",
    description:
      "新約聖書のギリシャ語原典を、語形解析・日本語辞書・私訳メモと一緒に読めるツール。工房ヒラム運営。",
    images: [
      {
        url: "/screenshot.png",
        width: 1400,
        height: 900,
        alt: "Gbible — ギリシャ語原典と語形解析の画面",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gbible — 新約聖書をギリシャ語原典で読む",
    description:
      "新約聖書のギリシャ語原典を、語形解析・日本語辞書・私訳メモと一緒に読めるツール。",
    images: ["/screenshot.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
