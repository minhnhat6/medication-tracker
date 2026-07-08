import { formatInTimeZone, toZonedTime } from "date-fns-tz";

export const TZ = process.env.APP_TIMEZONE || "Asia/Ho_Chi_Minh";

/** Chuỗi ngày "yyyy-MM-dd" theo múi giờ app cho một thời điểm (mặc định: bây giờ). */
export function localDateStr(d: Date = new Date()): string {
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** "HH:mm" theo múi giờ app. */
export function localTimeStr(d: Date = new Date()): string {
  return formatInTimeZone(d, TZ, "HH:mm");
}

/**
 * Đổi chuỗi ngày "yyyy-MM-dd" thành Date lúc 00:00 múi giờ app (dạng UTC instant).
 * Dùng để lưu cột @db.Date một cách nhất quán.
 */
export function dateOnlyUTC(dateStr: string): Date {
  // Chuẩn hoá về nửa đêm UTC cho cột @db.Date (tránh lệch múi giờ khi lưu/đọc)
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Số phút kể từ nửa đêm cho "HH:mm". */
export function minutesOfDay(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Phút hiện tại trong ngày theo múi giờ app. */
export function nowMinutes(d: Date = new Date()): number {
  return minutesOfDay(localTimeStr(d));
}

/** Định dạng hiển thị thân thiện. */
export function fmt(d: Date, pattern = "dd/MM/yyyy HH:mm"): string {
  return formatInTimeZone(d, TZ, pattern);
}

export { toZonedTime };
