import { filterSubjects } from "./exclusions";
import { SubjectConfig } from "./types";

export function createSubjectId(): string {
  return `subject-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptySubject(): SubjectConfig {
  return {
    id: createSubjectId(),
    name: "",
    units: [],
    strength: "normal",
  };
}

export function parseUnits(text: string): string[] {
  return text
    .split(/[,、\s]+/)
    .map((u) => u.trim())
    .filter(Boolean);
}

export function sanitizeSubjects(subjects: SubjectConfig[]): SubjectConfig[] {
  return filterSubjects(subjects);
}
