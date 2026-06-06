"use client";

import { SubjectConfig } from "@/lib/types";

interface TodaySubjectSheetProps {
  open: boolean;
  subjects: SubjectConfig[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onClose: () => void;
}

export function TodaySubjectSheet({
  open,
  subjects,
  selectedIds,
  onChange,
  onClose,
}: TodaySubjectSheetProps) {
  if (!open) return null;

  const selectedSet = new Set(selectedIds);
  const allSelected = subjects.every((s) => selectedSet.has(s.id));

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      if (selectedIds.length <= 1) return;
      onChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onChange(subjects.map((s) => s.id));
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 sketch-border bg-card rounded-t-2xl px-5 pt-5 pb-8 max-w-md mx-auto">
        <h2 className="text-lg font-bold mb-1">今日やる科目</h2>
        <p className="text-xs text-muted mb-4">
          タップでオン/オフ。今日やらない科目は外してください。
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {subjects.map((s) => {
            const active = selectedSet.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary font-bold"
                    : "border-border bg-bg text-muted"
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={selectAll}
            disabled={allSelected}
            className="sketch-btn flex-1 py-2 text-xs disabled:opacity-40"
          >
            全選択
          </button>
          <p className="flex-1 text-xs text-muted flex items-center justify-end">
            {selectedIds.length} / {subjects.length} 科目
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="sketch-btn sketch-btn-primary w-full py-3"
        >
          完了
        </button>
      </div>
    </>
  );
}

export function formatTodaySubjectsSummary(
  subjects: SubjectConfig[],
  selectedIds: string[]
): string {
  if (subjects.length === 0) return "科目未登録";
  if (selectedIds.length === 0) return "タップして選ぶ";
  if (selectedIds.length === subjects.length) {
    return `全${subjects.length}科目`;
  }
  const names = subjects
    .filter((s) => selectedIds.includes(s.id))
    .map((s) => s.name);
  if (names.length <= 3) return names.join("・");
  return `${names.slice(0, 2).join("・")} 他${names.length - 2}`;
}
