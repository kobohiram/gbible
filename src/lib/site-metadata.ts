import type { Metadata } from "next";

export const SITE_URL = "https://gbible.online";
export const SITE_NAME = "Gbible";

const OG_IMAGE = {
  url: "/screenshot.png",
  width: 1400,
  height: 900,
  alt: "Gbible — 聖書を原文（ギリシャ語・ヘブル語）で読む画面",
};

type PageMeta = {
  /** <title> にそのまま使う（サイト名を含めた完全な形） */
  title: string;
  description: string;
  /** 先頭が / のパス（例: "/quiz/vocab"） */
  path: string;
  keywords?: string[];
};

/**
 * ページごとのメタデータ。
 * Next.js は openGraph を親とマージせず丸ごと置き換えるため、画像やサイト名もここで毎回入れる。
 */
export function pageMetadata({ title, description, path, keywords }: PageMeta): Metadata {
  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      siteName: SITE_NAME,
      url: path,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
