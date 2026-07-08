import { prisma } from "./prisma";
import { computeStatus } from "./status";
import { dateOnlyUTC, localDateStr, nowMinutes, minutesOfDay, TZ } from "./time";
import type { Medicine, MedicationLog } from "@prisma/client";

/** Mốc chốt ngày: sau 23:00 coi như ngày đã kết thúc (khớp PRD mục 5). */
export const CUTOFF_MINUTES = 23 * 60;

export async function getActiveMedicine(): Promise<Medicine | null> {
  return prisma.medicine.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getAllActiveMedicines(): Promise<Medicine[]> {
  return prisma.medicine.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Ngày `dateStr` đã "chốt" chưa (đã qua, hoặc hôm nay nhưng đã quá 23:00). */
export function isFinalized(dateStr: string, now = new Date()): boolean {
  const today = localDateStr(now);
  if (dateStr < today) return true;
  if (dateStr > today) return false;
  return nowMinutes(now) >= CUTOFF_MINUTES;
}

/** Lấy (hoặc tạo) log của một thuốc cho một ngày, có cập nhật status. */
export async function getOrCreateLog(
  medicineId: string,
  dateStr: string
): Promise<MedicationLog> {
  const date = dateOnlyUTC(dateStr);
  const existing = await prisma.medicationLog.findUnique({
    where: { medicineId_date: { medicineId, date } },
  });
  if (existing) return recomputeStatus(existing, dateStr);

  return prisma.medicationLog.create({
    data: {
      medicineId,
      date,
      status: isFinalized(dateStr) ? "missing_both" : "pending",
    },
  });
}

/** Cập nhật lại status nếu lệch (ví dụ sau khi qua mốc 23:00). */
async function recomputeStatus(log: MedicationLog, dateStr: string): Promise<MedicationLog> {
  const desired = computeStatus(log.morningTaken, log.eveningTaken, isFinalized(dateStr));
  if (desired === log.status) return log;
  return prisma.medicationLog.update({
    where: { id: log.id },
    data: { status: desired },
  });
}

/** Đánh dấu đã uống liều sáng/tối. */
export async function markDose(
  medicineId: string,
  which: "morning" | "evening",
  dateStr = localDateStr(),
  taken = true
): Promise<MedicationLog> {
  const date = dateOnlyUTC(dateStr);
  const log = await getOrCreateLog(medicineId, dateStr);
  const now = new Date();

  const data =
    which === "morning"
      ? { morningTaken: taken, morningTakenAt: taken ? now : null }
      : { eveningTaken: taken, eveningTakenAt: taken ? now : null };

  const morningTaken = which === "morning" ? taken : log.morningTaken;
  const eveningTaken = which === "evening" ? taken : log.eveningTaken;
  const status = computeStatus(morningTaken, eveningTaken, isFinalized(dateStr, now));

  return prisma.medicationLog.update({
    where: { medicineId_date: { medicineId, date } },
    data: { ...data, status },
  });
}

/** Liều kế tiếp trong ngày cho một thuốc, hoặc null nếu đã xong cả hai. */
export function nextDose(
  med: Medicine,
  log: Pick<MedicationLog, "morningTaken" | "eveningTaken">,
  now = new Date()
): { which: "morning" | "evening"; time: string } | null {
  if (!log.morningTaken) return { which: "morning", time: med.morningTime };
  if (!log.eveningTaken) return { which: "evening", time: med.eveningTime };
  return null;
}

/** Có đang "đến giờ" uống mà chưa uống không (dùng cho banner cảnh báo). */
export function isDoseDue(
  med: Medicine,
  log: Pick<MedicationLog, "morningTaken" | "eveningTaken">,
  now = new Date()
): { which: "morning" | "evening"; time: string } | null {
  const cur = nowMinutes(now);
  if (!log.morningTaken && cur >= minutesOfDay(med.morningTime))
    return { which: "morning", time: med.morningTime };
  if (!log.eveningTaken && cur >= minutesOfDay(med.eveningTime))
    return { which: "evening", time: med.eveningTime };
  return null;
}

export { TZ };
