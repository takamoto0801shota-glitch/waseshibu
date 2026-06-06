"use client";

import { SubjectConfig } from "@/lib/types";
import { createEmptySubject, parseUnits } from "@/lib/subjectUtils";

const STRENGTH_OPTIONS = [
  { value: "weak" as const, label: "苦手" },
  { value: "normal" as const, label: "普通" },
  { value: "strong" as const, label: "得意" },
];

interface SubjectEditorProps {
  subjects: SubjectConfig[];
  onChange: (subjects: SubjectConfig[]) => void;
  minCount?: number;
}

export function SubjectEditor({
  subjects,
  onChange,
  minCount = 1,
}: SubjectEditorProps) {
  const update = (index: number, patch: Partial<SubjectConfig>) => {
    onChange(subjects.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const remove = (index: number) => {
    if (subjects.length <= minCount) return;
    onChange(subjects.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...subjects, createEmptySubject()]);
  };

  return (
    <div className="space-y-4">
      {subjects.map((s, i) => (
        <div key={s.id} className="sketch-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted font-medium">
              科目 {i + 1}
            </span>
            {subjects.length > minCount && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-muted hover:text-red-500"
              >
                削除
              </button>
            )}
          </div>

          <input
            placeholder="科目名を入力（例: 数学、英語、物理）"
            value={s.name}
            onChange={(e) => update(i, { name: e.target.value })}
            className="w-full font-bold bg-transparent outline-none mb-3 border-b border-border pb-2"
          />

          <input
            placeholder="単元（任意・例: 二次関数、三角比）"
            value={s.units.join("、")}
            onChange={(e) =>
              update(i, { units: parseUnits(e.target.value) })
            }
            className="w-full text-sm bg-transparent outline-none mb-3 text-muted"
          />

          <div className="flex gap-2">
            {STRENGTH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update(i, { strength: opt.value })}
                className={`px-3 py-1 text-xs rounded-full border ${
                  s.strength === opt.value
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="sketch-btn w-full py-3 text-sm"
      >
        ＋ 科目を追加
      </button>
    </div>
  );
}
