"use client";

import { DURATION_OPTIONS } from "@/lib/desires";

interface DurationPickerProps {
  value: number;
  onChange: (minutes: number) => void;
}

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  return (
    <div className="flex gap-2">
      {DURATION_OPTIONS.map((min) => (
        <button
          key={min}
          type="button"
          onClick={() => onChange(min)}
          className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold ${
            value === min
              ? "border-reward bg-reward text-white"
              : "border-border bg-card"
          }`}
        >
          {min}分
        </button>
      ))}
    </div>
  );
}
