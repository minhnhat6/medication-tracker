import { localDateStr, dateOnlyUTC } from "./time";

export type RangePreset = "7d" | "30d" | "3m" | "6m" | "1y" | "all" | "custom";

/** Đổi preset/khoảng thời gian thành {from, to} dạng "yyyy-MM-dd". */
export function resolveRange(
  preset: RangePreset,
  fromParam?: string | null,
  toParam?: string | null
): { from: string | null; to: string } {
  const to = toParam || localDateStr();
  if (preset === "all") return { from: null, to };
  if (preset === "custom") return { from: fromParam || null, to };

  const days: Record<Exclude<RangePreset, "all" | "custom">, number> = {
    "7d": 7,
    "30d": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
  };
  const n = days[preset as keyof typeof days] ?? 30;
  const toDate = dateOnlyUTC(to);
  const fromDate = new Date(toDate.getTime() - (n - 1) * 86400000);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

export const RANGE_LABELS: Record<RangePreset, string> = {
  "7d": "7 ngày",
  "30d": "30 ngày",
  "3m": "3 tháng",
  "6m": "6 tháng",
  "1y": "1 năm",
  all: "Toàn bộ",
  custom: "Tùy chọn",
};
