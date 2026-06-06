"use client";

import { useState } from "react";
import { MODE_HINTS, MODE_LABELS, StudyMode } from "@/lib/types";

const MODES: StudyMode[] = ["light", "self_study", "serious", "top_grade"];

interface ModeDropdownProps {
  value: StudyMode;
  onChange: (mode: StudyMode) => void;
  align?: "left" | "right";
}

export function ModeDropdown({
  value,
  onChange,
  align = "left",
}: ModeDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="sketch-border bg-card px-4 py-2 text-sm font-semibold"
      >
        {MODE_LABELS[value]} ▾
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute top-full mt-1 z-50 sketch-border bg-card min-w-[200px] shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  onChange(mode);
                  setOpen(false);
                }}
                className={`block w-full text-left px-4 py-3 hover:bg-bg ${
                  mode === value ? "font-bold text-primary" : ""
                }`}
              >
                <span className="text-sm block">{MODE_LABELS[mode]}</span>
                <span className="text-[10px] text-muted">
                  {MODE_HINTS[mode]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
