import { ok, bad, serverError } from "@/lib/api";
import { markDose } from "@/lib/logs";
import { localDateStr } from "@/lib/time";
import { sendTelegram } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Ngưỡng cảnh báo sắp hết thuốc: ≤ 3 ngày (6 liều) */
const STOCK_WARN_DOSES = 6;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = typeof body.date === "string" ? body.date : localDateStr();
    const taken = body.taken === undefined ? true : Boolean(body.taken);

    let medicineId: string | undefined = body.medicineId;
    let medicineName: string | undefined;
    let currentStock: number | null = null;

    if (!medicineId) {
      const med = await prisma.medicine.findFirst({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, stockDoses: true },
      });
      if (!med) return bad("Chưa cấu hình thuốc.");
      medicineId = med.id;
      medicineName = med.name;
      currentStock = med.stockDoses ?? null;
    } else {
      const med = await prisma.medicine.findUnique({
        where: { id: medicineId },
        select: { name: true, stockDoses: true },
      });
      medicineName = med?.name;
      currentStock = med?.stockDoses ?? null;
    }

    const log = await markDose(medicineId, "evening", date, taken);

    // Cập nhật tồn kho nếu đang theo dõi
    let newStock: number | null = currentStock;
    if (currentStock !== null) {
      const delta = taken ? -1 : 1;
      newStock = Math.max(0, currentStock + delta);
      await prisma.medicine.update({
        where: { id: medicineId },
        data: { stockDoses: newStock },
      });
    }

    const remainingDays = newStock !== null ? Math.floor(newStock / 2) : null;

    // Telegram: xác nhận uống
    if (taken) {
      const timeStr = log.eveningTakenAt
        ? new Date(log.eveningTakenAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          })
        : new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          });

      let msg = `✅ <b>Đã uống Tối</b>\n💊 ${medicineName ?? ""}\n⏰ Lúc ${timeStr}`;

      if (newStock !== null && newStock <= STOCK_WARN_DOSES) {
        msg += `\n\n⚠️ <b>SẮP HẾT THUỐC!</b>\n📦 Còn ${newStock} liều (đủ ${remainingDays} ngày)\n🛒 Nhớ mua thêm thuốc nhé!`;
      } else if (newStock !== null) {
        msg += `\n📦 Kho còn ${newStock} liều (~${remainingDays} ngày)`;
      }

      await sendTelegram(msg).catch(() => {});
    }

    return ok({ log, stockDoses: newStock, remainingDays });
  } catch (e) {
    return serverError(e);
  }
}
