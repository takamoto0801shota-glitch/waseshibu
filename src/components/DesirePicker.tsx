"use client";

import { useState } from "react";
import { DESIRE_PRESETS, customDesireId } from "@/lib/desires";
import { UserDesire } from "@/lib/types";

interface DesirePickerProps {
  selected: UserDesire[];
  onChange: (desires: UserDesire[]) => void;
  multiple?: boolean;
  candidates?: UserDesire[];
  allowCustom?: boolean;
}

export function DesirePicker({
  selected,
  onChange,
  multiple = true,
  candidates,
  allowCustom = false,
}: DesirePickerProps) {
  const [customText, setCustomText] = useState("");
  const selectedIds = new Set(selected.map((d) => d.id));
  const options =
    candidates ??
    DESIRE_PRESETS.map((d) => ({ id: d.id, label: d.label }));

  const toggle = (id: string, label: string) => {
    if (multiple) {
      if (selectedIds.has(id)) {
        onChange(selected.filter((d) => d.id !== id));
      } else {
        onChange([...selected, { id, label }]);
      }
    } else {
      onChange([{ id, label }]);
    }
  };

  const addCustom = () => {
    const label = customText.trim();
    if (!label) return;
    const id = customDesireId(label);
    if (multiple) {
      if (!selectedIds.has(id)) {
        onChange([...selected, { id, label }]);
      }
    } else {
      onChange([{ id, label }]);
    }
    setCustomText("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selectedIds.has(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id, option.label)}
              className={`px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                active
                  ? "border-reward bg-reward/15 text-reward scale-[1.02]"
                  : "border-border bg-card hover:border-reward/40"
              }`}
            >
              {option.label}
            </button>
          );
        })}
        {allowCustom &&
          selected
            .filter((d) => d.id.startsWith("custom-"))
            .map((d) => {
              const active = selectedIds.has(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggle(d.id, d.label)}
                  className={`px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all ${
                    active
                      ? "border-reward bg-reward/15 text-reward scale-[1.02]"
                      : "border-border bg-card hover:border-reward/40"
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
      </div>

      {allowCustom && (
        <div className="mt-4 sketch-border bg-card p-4">
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="例）スポーツ・漫画・ショート動画"
            rows={3}
            className="w-full bg-transparent outline-none text-sm resize-none placeholder:text-muted text-text"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customText.trim()}
            className="sketch-btn w-full py-2.5 text-sm mt-3 disabled:opacity-50"
          >
            追加
          </button>
        </div>
      )}
    </div>
  );
}
