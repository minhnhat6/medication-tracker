import { ok, bad, serverError } from "@/lib/api";
import { markDose } from "@/lib/logs";
import { localDateStr } from "@/lib/time";
import { sendTelegram } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = typeof body.date === "string" ? body.date : localDateStr();
    const taken = body.taken === undefined ? true : Boolean(body.taken);

    // Ưu tiên dùng medicineId từ body, fallback lấy medicine đầu tiên active
    // — tất cả trong 1 query duy nhất thay vì 2 query riêng
    let medicineId: string | undefined = body.medicineId;
    let medicineName: string | undefined;

    if (!medicineId) {
      const med = await prisma.medicine.findFirst({
        where: { active: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      });
      if (!med) return bad("Chưa cấu hình thuốc.");
      medicineId = med.id;
      medicineName = med.name;
    } else if (taken) {
      // Chỉ fetch name khi cần (taken=true) và chưa có
      const med = await prisma.medicine.findUnique({
        where: { id: medicineId },
        select: { name: true },
      });
      medicineName = med?.name;
    }

    const log = await markDose(medicineId, "morning", date, taken);

    // Gửi Telegram ngay khi đánh dấu đã uống (await để không bị serverless kill)
    if (taken) {
      const timeStr = log.morningTakenAt
        ? new Date(log.morningTakenAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          })
        : new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          });
      await sendTelegram(
        `✅ <b>Đã uống Sáng</b>\n💊 ${medicineName ?? ""}\n⏰ Lúc ${timeStr}`
      ).catch(() => {});
    }

    return ok({ log });
  } catch (e) {
    return serverError(e);
  }
}
