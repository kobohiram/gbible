import type { ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "button";
  onClick?: () => void;
  fixedHeight?: boolean;
};

export function VocabQuizCard({ children, className = "", as = "div", onClick, fixedHeight }: Props) {
  const base =
    "overflow-hidden rounded-2xl border border-border bg-white text-left shadow-lg transition-shadow";
  const size = fixedHeight ? "flex h-[640px] w-[400px] max-w-[calc(100vw-2rem)] flex-col" : "w-full";

  if (as === "button") {
    return (
      <button type="button" onClick={onClick} className={`${base} ${size} hover:shadow-xl ${className}`}>
        {children}
      </button>
    );
  }

  return <div className={`${base} ${size} ${className}`}>{children}</div>;
}

export function VocabQuizCardHeader({
  children,
  borderless = false,
}: {
  children: ReactNode;
  borderless?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-between bg-white px-5 py-4 ${borderless ? "" : "border-b border-border"}`}
    >
      {children}
    </div>
  );
}

export function VocabQuizCardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-1 flex-col overflow-hidden bg-white px-6 pb-6 pt-2 ${className}`}>{children}</div>;
}

export function QuizCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="閉じる"
      className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
    >
      <X className="size-5" strokeWidth={2} />
    </button>
  );
}
