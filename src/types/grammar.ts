// ─── Grammar content types ─────────────────────────────────────────────────

export type GreekWord = {
  text: string;
  strongs?: string;  // e.g. "G3056"
  lemma?: string;
  glossJa?: string;
  morph?: string;
};

export type ContentNode =
  | { type: "paragraph"; id?: string; text: string }
  | { type: "heading"; id?: string; level: 2 | 3 | 4; text: string }
  | { type: "table"; id?: string; caption?: string; headers: string[]; rows: string[][] }
  | { type: "list"; id?: string; items: string[]; ordered?: boolean }
  | { type: "greek-chars"; id?: string; label: string; chars: string[] }
  | { type: "example"; id?: string; reference?: string; greek: GreekWord[]; japaneseTranslation: string; note?: string }
  | { type: "formula"; id?: string; text: string; note?: string }
  | { type: "highlight"; id?: string; text: string }
  | { type: "note"; id?: string; text: string }
  | { type: "blank" };

// ─── Quiz types ──────────────────────────────────────────────────────────────

export type QuizQuestion = {
  id: string;
  question: string;
  choices: string[];
  correctIndex: number;      // 0-based
  hintSectionId: string;     // ID of the section to scroll to + highlight
  explanation: string;       // shown after answering correctly
};

// ─── Structure types ──────────────────────────────────────────────────────────

export type Lesson = {
  lessonNumber: number;
  title: string;
  color: string;          // CSS color for the balloon
  content: ContentNode[];
  quiz: QuizQuestion[];
};

export type GrammarChapter = {
  chapterNumber: number;
  title: string;
  lessons: Lesson[];
  isAppendix?: boolean;
};

// ─── Progress types ───────────────────────────────────────────────────────────

export type LessonProgress = {
  chapterNumber: number;
  lessonNumber: number;
  passed: boolean;
  score: number;   // 0.0 – 1.0
  attempts: number;
};
