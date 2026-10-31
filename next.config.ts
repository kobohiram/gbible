import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // 聖書を読む画面はトップ（/）に移した。旧URLのブックマークや検索結果を引き継ぐ
    return [{ source: "/study", destination: "/", permanent: true }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
