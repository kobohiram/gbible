import { MorphLabels } from "./MorphLabels";
import type { VerseWord } from "@/types";

type Props = {
  word: VerseWord;
  /** 読む形（本文）の短い訳 */
  qereGloss: string;
  /** 同じ組の読む形（複数語のとき全体を表示するため） */
  qereText: string;
};

/** 3ペイン：異読（ケティブ／ケレ）の説明 */
export function KetivQereNote({ word, qereGloss, qereText }: Props) {
  const kq = word.kq;
  if (!kq) return null;

  return (
    <section className="rounded-lg border border-[var(--variant-border)] bg-[var(--variant-bg)] p-3">
      <h3 className="section-label">異読（ケティブ／ケレ）</h3>
      <div className="mt-2 space-y-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">読む形（ケレ）・本文に採用</p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-hebrew text-xl" dir="rtl">{qereText}</span>
            {qereGloss && <span className="font-medium text-[var(--gloss)]">{qereGloss}</span>}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">書かれた形（ケティブ）</p>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span className="font-hebrew text-xl" dir="rtl">{kq.ketiv}</span>
            {kq.ketivGloss && <span className="font-medium text-[var(--gloss)]">{kq.ketivGloss}</span>}
          </p>
          {kq.ketivMorph && (
            <div className="mt-1">
              <MorphLabels morph={kq.ketivMorph} />
            </div>
          )}
        </div>
      </div>
      {kq.of > 1 && (
        <p className="mt-2 text-xs text-muted-foreground">
          書かれた形1語に対して、読む形は{kq.of}語で1組です（この語は{kq.part}語目）。
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        マソラ本文では、子音で書き伝えられた形（ケティブ）とは別に、朗読で読む形（ケレ）が欄外に示されている箇所があります。Gbible の本文は読む形を採っています。
      </p>
    </section>
  );
}
