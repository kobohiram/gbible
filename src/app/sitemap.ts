import type { MetadataRoute } from "next";
import { grammarChapters } from "@/data/grammar";
import { SITE_URL } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/study/synoptic`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/quiz/alphabet`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/quiz/vocab`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const chapters = [...grammarChapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  const grammar: MetadataRoute.Sitemap = chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({
      url: `${SITE_URL}/grammar/${chapter.chapterNumber}/${lesson.lessonNumber}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  );

  return [...pages, ...grammar].map((entry) => ({ ...entry, lastModified }));
}
