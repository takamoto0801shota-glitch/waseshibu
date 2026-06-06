"use client";

import {
  daysInMonth,
  formatTestDateLabel,
  parseTestDate,
  resolveTestDate,
} from "@/lib/testDateUtils";

interface TestDatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  compact?: boolean;
  onSkip?: () => void;
}

export function TestDatePicker({
  value,
  onChange,
  compact = false,
  onSkip,
}: TestDatePickerProps) {
  const parsed = parseTestDate(value);
  const month = parsed?.month ?? 0;
  const day = parsed?.day ?? 0;

  const handleMonth = (m: number) => {
    const maxDay = daysInMonth(m);
    const d = day > 0 ? Math.min(day, maxDay) : 1;
    onChange(resolveTestDate(m, d));
  };

  const handleDay = (d: number) => {
    if (month > 0) onChange(resolveTestDate(month, d));
  };

  const maxDay = month > 0 ? daysInMonth(month) : 31;

  const selectClass = compact
    ? "sketch-border bg-card w-full py-2 px-2 text-sm text-center font-bold outline-none appearance-none"
    : "sketch-border bg-card w-full py-3 px-2 text-lg text-center font-bold outline-none appearance-none";

  return (
    <div>
      <div className={`flex gap-2 items-center justify-center ${compact ? "" : "gap-3"}`}>
        <div className="flex-1">
          <label className="text-xs text-muted block mb-1 text-center">月</label>
          <select
            value={month || ""}
            onChange={(e) => handleMonth(Number(e.target.value))}
            className={selectClass}
          >
            <option value="" disabled>
              --
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>

        <span
          className={`font-bold text-muted mt-5 ${compact ? "text-lg" : "text-2xl"}`}
        >
          /
        </span>

        <div className="flex-1">
          <label className="text-xs text-muted block mb-1 text-center">日</label>
          <select
            value={day || ""}
            onChange={(e) => handleDay(Number(e.target.value))}
            disabled={month === 0}
            className={`${selectClass} disabled:opacity-40`}
          >
            <option value="" disabled>
              --
            </option>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}日
              </option>
            ))}
          </select>
        </div>
      </div>

      {value && (
        <p
          className={`text-center text-primary font-semibold ${
            compact ? "text-xs mt-2" : "text-sm mt-4"
          }`}
        >
          {formatTestDateLabel(value)}
        </p>
      )}
      {!compact && (
        <p className="text-center text-xs text-muted mt-2">
          年は入力不要です（今年または来年を自動で設定）
        </p>
      )}
      {onSkip && (
        <div className="text-center mt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-[10px] text-muted underline underline-offset-2"
          >
            スキップ
          </button>
        </div>
      )}
    </div>
  );
}
