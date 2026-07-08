import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAllActiveMedicines, getOrCreateLog } from "@/lib/logs";
import { computeStatus } from "@/lib/status";
import { notifyAll } from "@/lib/notify";
import { localDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Chạy lúc 23:00 (Vercel Cron). Kiểm tra ngày hôm nay:
 * - Chốt trạng thái thiếu liều.
 * - Nếu thiếu bất kỳ liều nào -> gửi Web Push + Telegram + Email.
 */
async function run() {
  const today = localDateStr();
  const meds = await getAllActiveMedicines();
  const missing: string[] = [];

  for (const med of meds) {
    const log = await getOrCreateLog(med.id, today);
    const status = computeStatus(log.morningTaken, log.eveningTaken, true);
    // Chốt trạng thái vào DB
    if (status !== log.status) {
      await prisma.medicationLog.update({ where: { id: log.id }, data: { status } });
    }
    if (!log.morningTaken) missing.push(`${med.name}: liều sáng`);
    if (!log.eveningTaken) missing.push(`${med.name}: liều tối`);
  }

  let notified = null;
  if (missing.length) {
    notified = await notifyAll({
      title: "⚠️ Bạn còn thiếu liều hôm nay",
      body: missing.join("; "),
      url: "/",
      tag: "missing-doses",
    });
  }

  return { date: today, missing, notified };
}

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }
    const result = await run();
    return ok(result);
  } catch (e) {
    return serverError(e);
  }
}

// POST không yêu cầu secret — dùng cho nút "Kiểm tra ngay" trong UI.
export async function POST() {
  try {
    const result = await run();
    return ok(result);
  } catch (e) {
    return serverError(e);
  }
}
