import { redirect } from "next/navigation";
import { grammarChapters } from "@/data/grammar";

export default function GrammarIndexPage() {
  const first = grammarChapters[0];
  redirect(`/grammar/${first.chapterNumber}/${first.lessons[0].lessonNumber}`);
}
