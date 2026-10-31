import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { grammarChapters, getChapter, getLesson } from "@/data/grammar";
import { GrammarShell } from "@/components/grammar/GrammarShell";
import { pageMetadata } from "@/lib/site-metadata";

type Params = { chapter: string; lesson: string };

export async function generateStaticParams() {
  const params: Params[] = [];
  for (const chapter of grammarChapters) {
    for (const lesson of chapter.lessons) {
      params.push({
        chapter: String(chapter.chapterNumber),
        lesson: String(lesson.lessonNumber),
      });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { chapter: chStr, lesson: lesStr } = await params;
  const chapter = getChapter(Number(chStr));
  const lesson = getLesson(Number(chStr), Number(lesStr));
  if (!chapter || !lesson) return {};
  return pageMetadata({
    title: `${lesson.title}｜新約ギリシャ語文法 第${chapter.chapterNumber}章 第${lesson.lessonNumber}課 — Gbible`,
    description: `コイネーギリシャ語（新約聖書のギリシャ語）文法の第${chapter.chapterNumber}章「${chapter.title}」第${lesson.lessonNumber}課「${lesson.title}」。図解でわかりやすく解説し、4択クイズで理解を確かめられます。`,
    path: `/grammar/${chapter.chapterNumber}/${lesson.lessonNumber}`,
  });
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { chapter: chStr, lesson: lesStr } = await params;
  const chNum = Number(chStr);
  const lesNum = Number(lesStr);
  const chapter = getChapter(chNum);
  const lesson = getLesson(chNum, lesNum);
  if (!chapter || !lesson) notFound();

  return (
    <GrammarShell
      chapters={grammarChapters}
      chapter={chapter}
      lesson={lesson}
    />
  );
}
