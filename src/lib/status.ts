import type { MedStatus } from "@prisma/client";

/**
 * Tính trạng thái ngày dựa trên đã uống sáng/tối và ngày đó đã qua chưa.
 * - Ngày hiện tại/tương lai: nếu chưa đủ -> pending (chưa kết luận thiếu).
 * - Ngày đã qua (hoặc sau mốc chốt 23:00): thiếu -> missing_*.
 */
export function computeStatus(
  morningTaken: boolean,
  eveningTaken: boolean,
  finalized: boolean
): MedStatus {
  if (morningTaken && eveningTaken) return "completed";
  if (!finalized) return "pending";
  if (!morningTaken && !eveningTaken) return "missing_both";
  if (!morningTaken) return "missing_morning";
  return "missing_evening";
}

export const STATUS_LABEL: Record<MedStatus, string> = {
  pending: "Chưa hoàn tất",
  completed: "Đủ thuốc",
  missing_morning: "Thiếu liều sáng",
  missing_evening: "Thiếu liều tối",
  missing_both: "Thiếu cả hai liều",
};

export const STATUS_COLOR: Record<MedStatus, string> = {
  pending: "#9ca3af",
  completed: "#22c55e",
  missing_morning: "#f59e0b",
  missing_evening: "#f59e0b",
  missing_both: "#ef4444",
};
