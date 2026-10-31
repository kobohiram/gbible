/** ヘッダー・フッターで共通に使うサイトの案内。グループ単位で区切って表示する */
export type NavItem = {
  href: string;
  label: string;
  /** フッターなどで添える短い説明 */
  description: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "読む",
    items: [
      { href: "/", label: "聖書を読む", description: "原文・語形解析・辞書・私訳メモ" },
      { href: "/study/synoptic", label: "共観福音書", description: "マタイ・マルコ・ルカを並べて読む" },
    ],
  },
  {
    label: "学ぶ",
    items: [
      { href: "/grammar", label: "文法", description: "ギリシャ語文法の図解とクイズ" },
      { href: "/quiz/alphabet", label: "アルファベット", description: "文字の読み方クイズ" },
      { href: "/quiz/vocab", label: "単語クイズ", description: "新約頻出600語" },
    ],
  },
];

export const ABOUT_NAV: NavItem = {
  href: "/about",
  label: "このサイトについて",
  description: "使い方・使用資料・ライセンス",
};

/** 今のページに最も具体的に当てはまるメニュー（/study/synoptic では「共観福音書」だけを強調） */
export function activeNavHref(pathname: string): string | null {
  const all = [...NAV_GROUPS.flatMap((g) => g.items), ABOUT_NAV];
  const matches = all.filter(({ href }) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"),
  );
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
