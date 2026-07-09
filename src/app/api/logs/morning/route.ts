import { ok, bad, serverError } from "@/lib/api";
import { getActiveMedicine, markDose } from "@/lib/logs";
import { localDateStr } from "@/lib/time";
import { sendTelegram } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = typeof body.date === "string" ? body.date : localDateStr();
    const taken = body.taken === undefined ? true : Boolean(body.taken);
    const medicineId =
      body.medicineId || (await getActiveMedicine())?.id;
    if (!medicineId) return bad("Chưa cấu hình thuốc.");

    const log = await markDose(medicineId, "morning", date, taken);

    // Gửi Telegram ngay khi đánh dấu đã uống
    if (taken) {
      const med = await prisma.medicine.findUnique({
        where: { id: medicineId },
        select: { name: true },
      });
      const timeStr = log.morningTakenAt
        ? new Date(log.morningTakenAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh",
          })
        : "?";
      // fire-and-forget bị kill ngay sau return trong serverless — phải await
      await sendTelegram(
        `✅ <b>Đã uống Sáng</b>\n💊 ${med?.name ?? ""}\n⏰ Lúc ${timeStr}`
      ).catch(() => {});
    }

    return ok({ log });
  } catch (e) {
    return serverError(e);
  }
}
