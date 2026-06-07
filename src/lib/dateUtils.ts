/** 日本時間の今日の日付 (YYYY-MM-DD) */
export function todayStrJST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
}
