/**
 * 旧約パイプラインで扱う書の登録表（収録ロードマップ順）
 *
 * versification:
 *   'wlc' … ヘブル語本文（WLC）の節番号のまま。既存の創世記・出エジプト記はこちら
 *           （保存済みのメモ・私訳の節キーを変えないため）
 *   'kjv' … 新改訳2017 と同じ節番号。詩篇の表題は 0 節（psalmTitles）
 */
export const OT_BOOKS = {
  genesis: { id: 'genesis', name: '創世記', abbr: '創', osis: 'Gen', oshbFile: 'Gen.xml', versification: 'wlc' },
  exodus: { id: 'exodus', name: '出エジプト記', abbr: '出', osis: 'Exod', oshbFile: 'Exod.xml', versification: 'wlc' },
  leviticus: { id: 'leviticus', name: 'レビ記', abbr: 'レ', osis: 'Lev', oshbFile: 'Lev.xml', versification: 'kjv' },
  psalms: { id: 'psalms', name: '詩篇', abbr: '詩', osis: 'Ps', oshbFile: 'Ps.xml', versification: 'kjv', psalmTitles: true },
  isaiah: { id: 'isaiah', name: 'イザヤ書', abbr: 'イザ', osis: 'Isa', oshbFile: 'Isa.xml', versification: 'kjv' },
  proverbs: { id: 'proverbs', name: '箴言', abbr: '箴', osis: 'Prov', oshbFile: 'Prov.xml', versification: 'kjv' },
  ruth: { id: 'ruth', name: 'ルツ記', abbr: 'ルツ', osis: 'Ruth', oshbFile: 'Ruth.xml', versification: 'kjv' },
  jonah: { id: 'jonah', name: 'ヨナ書', abbr: 'ヨナ', osis: 'Jonah', oshbFile: 'Jonah.xml', versification: 'kjv' },
  deuteronomy: { id: 'deuteronomy', name: '申命記', abbr: '申', osis: 'Deut', oshbFile: 'Deut.xml', versification: 'kjv' },
  daniel: { id: 'daniel', name: 'ダニエル書', abbr: 'ダニ', osis: 'Dan', oshbFile: 'Dan.xml', versification: 'kjv' },
  jeremiah: { id: 'jeremiah', name: 'エレミヤ書', abbr: 'エレ', osis: 'Jer', oshbFile: 'Jer.xml', versification: 'kjv' },
  micah: { id: 'micah', name: 'ミカ書', abbr: 'ミカ', osis: 'Mic', oshbFile: 'Mic.xml', versification: 'kjv' },
};

export function getBook(id) {
  const book = OT_BOOKS[id];
  if (!book) {
    throw new Error(`未登録の書です: ${id}（登録済み: ${Object.keys(OT_BOOKS).join(', ')}）`);
  }
  return book;
}
