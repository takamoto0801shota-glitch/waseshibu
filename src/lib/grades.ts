export const GRADE_OPTIONS = [
  "中学1年",
  "中学2年",
  "中学3年",
  "高校1年",
  "高校2年",
  "高校3年",
] as const;

export type GradeOption = (typeof GRADE_OPTIONS)[number];

/** 保存済み学年表記を正規化（例: 中学2年生 → 中学2年） */
export function normalizeGrade(grade: string): string {
  let g = grade.trim();
  if (!g) return "";

  g = g.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  g = g.replace(/生$/, "");

  const m = g.match(/^(中学|高校)([1-3])年?$/);
  if (m) return `${m[1]}${m[2]}年`;

  return g;
}
