export const GRADE_OPTIONS = [
  "中学1年",
  "中学2年",
  "中学3年",
  "高校1年",
  "高校2年",
  "高校3年",
] as const;

export type GradeOption = (typeof GRADE_OPTIONS)[number];
