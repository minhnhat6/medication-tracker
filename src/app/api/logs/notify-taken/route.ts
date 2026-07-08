import { NextResponse } from "next/server";
import { sendTelegram } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/logs/notify-taken
 * Được gọi sau 5 phút khi người dùng tích uống thuốc,
 * chỉ gửi nếu liều đó VẪN còn được đánh dấu là đã uống.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { medicineId, which, date } = body;

    if (!medicineId || !which || !date) {
      return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
    }

    // Kiểm tra lại trạng thái hiện tại — nếu người dùng đã hoàn trả thì bỏ qua
    const log = await prisma.medicationLog.findFirst({
      where: { medicineId, date: new Date(date) },
      include: { medicine: { select: { name: true } } },
    });

    if (!log) return NextResponse.json({ sent: false, reason: "Không tìm thấy log" });

    const taken =
      which === "morning" ? log.morningTaken : log.eveningTaken;

    if (!taken) {
      return NextResponse.json({ sent: false, reason: "Liều đã bị hoàn trả" });
    }

    const takenAt =
      which === "morning" ? log.morningTakenAt : log.eveningTakenAt;

    const timeStr = takenAt
      ? new Date(takenAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Ho_Chi_Minh",
        })
      : "?";

    const label = which === "morning" ? "Sáng" : "Tối";
    const medName = log.medicine.name;

    const text =
      `✅ <b>Đã uống ${label}</b>\n` +
      `💊 ${medName}\n` +
      `⏰ Lúc ${timeStr}`;

    const sent = await sendTelegram(text);
    return NextResponse.json({ sent });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
