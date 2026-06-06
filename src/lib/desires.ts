export const DESIRE_PRESETS = [
  { id: "tiktok", label: "TikTok", emoji: "📱" },
  { id: "youtube", label: "YouTube", emoji: "▶️" },
  { id: "netflix", label: "Netflix", emoji: "🎬" },
  { id: "game", label: "ゲーム", emoji: "🎮" },
  { id: "sns", label: "SNS", emoji: "💬" },
] as const;

export type DesirePresetId = (typeof DESIRE_PRESETS)[number]["id"];

export const DURATION_OPTIONS = [15, 30, 45, 60] as const;

export function getDesireLabel(id: string, customLabel?: string): string {
  const preset = DESIRE_PRESETS.find((d) => d.id === id);
  if (preset) return preset.label;
  return customLabel?.trim() || "解放時間";
}

export function getDesireEmoji(id: string): string {
  return DESIRE_PRESETS.find((d) => d.id === id)?.emoji ?? "✨";
}

export function customDesireId(label: string): string {
  return `custom-${label.trim()}`;
}
