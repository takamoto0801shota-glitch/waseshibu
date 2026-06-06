/** 月日だけから今年または来年の ISO 日付を決定 */
export function resolveTestDate(month: number, day: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let year = today.getFullYear();
  const candidate = new Date(year, month - 1, day);
  candidate.setHours(0, 0, 0, 0);

  if (candidate < today) {
    year += 1;
  }

  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function parseTestDate(iso: string): {
  month: number;
  day: number;
} | null {
  if (!iso) return null;
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!month || !day) return null;
  return { month, day };
}

export function formatTestDateLabel(iso: string): string {
  const parsed = parseTestDate(iso);
  if (!parsed) return "";
  return `${parsed.month}月${parsed.day}日`;
}

export function daysInMonth(month: number): number {
  const year = new Date().getFullYear();
  return new Date(year, month, 0).getDate();
}
