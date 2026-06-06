import { SubjectConfig } from "./types";

/** 現時点では除外する単元・科目キーワード */
const EXCLUDED_KEYWORDS = ["確率", "統計"];

export function isExcludedText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return EXCLUDED_KEYWORDS.some((kw) => t.includes(kw));
}

export function filterUnits(units: string[]): string[] {
  return units.filter((u) => !isExcludedText(u));
}

export function filterSubjects(subjects: SubjectConfig[]): SubjectConfig[] {
  return subjects
    .filter((s) => !isExcludedText(s.name))
    .map((s) => ({ ...s, units: filterUnits(s.units) }));
}
