"use client";

import {
  getCatalogSubjects,
  needsCourseTrack,
  subjectCatalogId,
} from "@/lib/subjectCatalog";
import { CourseTrack, SubjectConfig } from "@/lib/types";

interface SubjectSelectorProps {
  grade: string;
  courseTrack: CourseTrack;
  onCourseTrackChange: (track: CourseTrack) => void;
  subjects: SubjectConfig[];
  onChange: (subjects: SubjectConfig[]) => void;
}

export function SubjectSelector({
  grade,
  courseTrack,
  onCourseTrackChange,
  subjects,
  onChange,
}: SubjectSelectorProps) {
  const catalog = getCatalogSubjects(grade, courseTrack);
  const selectedNames = new Set(subjects.map((s) => s.name));

  const toggle = (name: string) => {
    if (selectedNames.has(name)) {
      onChange(subjects.filter((s) => s.name !== name));
    } else {
      onChange([
        ...subjects,
        {
          id: subjectCatalogId(grade, name),
          name,
          units: [],
          strength: "normal",
        },
      ]);
    }
  };

  if (!grade) {
    return (
      <p className="text-sm text-muted text-center py-6">
        先に学年を選んでください
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {needsCourseTrack(grade) && (
        <div className="flex gap-2">
          {(
            [
              { value: "arts" as const, label: "文系" },
              { value: "science" as const, label: "理系" },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => onCourseTrackChange(t.value)}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border-2 ${
                courseTrack === t.value
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-card"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {catalog.map((name) => {
          const active = selectedNames.has(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => toggle(name)}
              className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-card text-text"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted text-center">
        {subjects.length} 科目選択中
      </p>
    </div>
  );
}
