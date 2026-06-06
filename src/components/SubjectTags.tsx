"use client";

import { SubjectConfig } from "@/lib/types";

interface SubjectTagsProps {
  subjects: SubjectConfig[];
  activeIds: string[];
  onToggle: (id: string) => void;
}

export function SubjectTags({
  subjects,
  activeIds,
  onToggle,
}: SubjectTagsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {subjects.map((s) => {
        const active = activeIds.includes(s.id);
        return (
          <button
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`px-4 py-1.5 text-sm rounded-full border-2 transition-colors ${
              active
                ? "border-primary bg-primary/10 text-primary font-semibold"
                : "border-border bg-card text-muted"
            }`}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
