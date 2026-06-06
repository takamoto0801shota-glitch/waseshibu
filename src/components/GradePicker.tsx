"use client";

import { GRADE_OPTIONS } from "@/lib/grades";

interface GradePickerProps {
  value: string;
  onChange: (grade: string) => void;
}

export function GradePicker({ value, onChange }: GradePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {GRADE_OPTIONS.map((grade) => {
        const selected = value === grade;
        return (
          <button
            key={grade}
            type="button"
            onClick={() => onChange(grade)}
            className={`py-4 rounded-xl border-2 text-sm font-bold transition-colors ${
              selected
                ? "border-primary bg-primary text-white"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {grade}
          </button>
        );
      })}
    </div>
  );
}
