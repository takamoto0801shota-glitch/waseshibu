"use client";

import { MOOD_OPTIONS, MoodCheck } from "@/lib/types";

interface MoodCheckProps {
  onSelect: (mood: MoodCheck) => void;
  loading?: boolean;
}

export function MoodCheckPanel({ onSelect, loading }: MoodCheckProps) {
  return (
    <div className="w-full max-w-xs space-y-3">
      {MOOD_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          disabled={loading}
          className="sketch-btn w-full py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <span className="text-2xl">{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
