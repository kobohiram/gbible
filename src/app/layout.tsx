import type { Metadata } from "next";
import { Cardo, Geist, Geist_Mono, Gentium_Plus } from "next/font/google";
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

/** Bible Hub 系 interlinear に近いギリシャ語書体（Cardo → Gentium 系） */
const cardo = Cardo({
  variable: "--font-cardo",
  subsets: ["greek", "greek-ext", "latin", "latin-ext"],
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
  title: "Gbible",
  description: "ギリシャ語で聖書を読みたい人のためのツール",
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
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
