/** 2ペイン向けの短い訳語抽出（sync スクリプトと word-gloss.ts で同じルール） */

export const MAX_PANE_LEN = 8;

export const COMMON_GLOSS = {
  H1004: '家',
  H776: '地',
  H8064: '天',
  H430: '神',
  H853: '（対格）',
  H854: 'と共に',
  H5921: '〜に',
  H413: '〜へ',
};

const VERBOSE_RE =
  /を示す|を指す|新たに|ことが|接続詞|前置詞|ものを|集団|空間|原因|理由|混沌状態|荒れ地|虚空・|広く表す|発する・|二者の/;

function firstSegment(text) {
  if (!text) return '';
  return text.split(/[・、,／/]/)[0]?.trim() ?? '';
}

function trimToPane(text) {
  const t = firstSegment(text);
  if (!t) return '';
  if (t.length <= MAX_PANE_LEN && !VERBOSE_RE.test(t)) return t;
  if (t.length <= 6) return t;
  return t.slice(0, MAX_PANE_LEN);
}

function fromDetailJa(detail) {
  if (!detail) return '';

  const posMatch = detail.match(/(?:名詞|動詞|前置詞|接続詞|副詞|形容詞|数詞)「([^」]+)」/);
  if (posMatch) {
    const c = trimToPane(posMatch[1]);
    if (c) return c;
  }

  const lineMatch = detail.match(
    /^[「"]?(名詞|動詞|前置詞|接続詞|副詞|形容詞|数詞)[「」"]?([^。\n]{1,24})/,
  );
  if (lineMatch) {
    const c = trimToPane(lineMatch[2]);
    if (c) return c;
  }

  const quoted = detail.match(/「([^」]{1,12})」/g);
  if (quoted) {
    for (const q of quoted) {
      const inner = q.match(/「([^」]+)」/)?.[1] ?? '';
      const c = trimToPane(inner);
      if (c && !VERBOSE_RE.test(c)) return c;
    }
  }

  return '';
}

/** 辞書エントリから 2ペイン用の短い訳語を得る（辞書本文 detailJa は変更しない） */
export function extractPaneGloss(entry, stubGloss) {
  const strongs = entry.strongs;
  if (COMMON_GLOSS[strongs]) return COMMON_GLOSS[strongs];

  if (stubGloss) {
    const s = trimToPane(stubGloss);
    if (s) return s;
  }

  const fromDetail = fromDetailJa(entry.detailJa ?? '');
  if (fromDetail) return fromDetail;

  const def = firstSegment(entry.definitionJa ?? '');
  if (def && def.length <= MAX_PANE_LEN && !VERBOSE_RE.test(def)) return def;

  const gloss = firstSegment(entry.glossJa ?? '');
  if (gloss && !VERBOSE_RE.test(gloss)) {
    return gloss.length <= MAX_PANE_LEN ? gloss : gloss.slice(0, MAX_PANE_LEN);
  }

  return '';
}
