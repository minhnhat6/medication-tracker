import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getAllActiveMedicines } from "@/lib/logs";
import { computeStatus } from "@/lib/status";
import { notifyAll } from "@/lib/notify";
import { localDateStr, dateOnlyUTC } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Chạy lúc 23:00 VN (Vercel Cron). Kiểm tra ngày hôm nay:
 * - Chốt trạng thái thiếu liều.
 * - Nếu thiếu bất kỳ liều nào → gửi Web Push + Telegram + Email.
 *
 * Optimized: batch fetch all logs trong 1 query thay vì N queries.
 */
async function run() {
  const today = localDateStr();
  const start = dateOnlyUTC(today);
  const meds = await getAllActiveMedicines();
  const missing: string[] = [];

  if (meds.length === 0) return { date: today, missing: [], notified: null };

  // Batch fetch tất cả logs hôm nay — 1 query thay vì N queries
  const logs = await prisma.medicationLog.findMany({
    where: {
      medicineId: { in: meds.map((m) => m.id) },
      date: start,
    },
  });
  const logByMedId = new Map(logs.map((l) => [l.medicineId, l]));

  const statusUpdates: { id: string; status: ReturnType<typeof computeStatus> }[] = [];

  for (const med of meds) {
    const log = logByMedId.get(med.id);
    if (!log) {
      // Không có log → bỏ qua (pending, chưa tạo)
      missing.push(`${med.name}: liều sáng`);
      missing.push(`${med.name}: liều tối`);
      continue;
    }
    const status = computeStatus(log.morningTaken, log.eveningTaken, true);
    if (status !== log.status) {
      statusUpdates.push({ id: log.id, status });
    }
    if (!log.morningTaken) missing.push(`${med.name}: liều sáng`);
    if (!log.eveningTaken) missing.push(`${med.name}: liều tối`);
  }

  // Batch update statuses
  if (statusUpdates.length > 0) {
    await Promise.all(
      statusUpdates.map((u) =>
        prisma.medicationLog.update({ where: { id: u.id }, data: { status: u.status } })
      )
    );
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

// Rate limit đơn giản cho POST (max 5 lần/phút)
let lastPostCallMs = 0;
let postCallCount = 0;

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

// POST dùng cho nút "Kiểm tra ngay" trong UI — có rate limit để tránh spam.
export async function POST() {
  try {
    const now = Date.now();
    if (now - lastPostCallMs < 60_000) {
      postCallCount++;
      if (postCallCount > 5) {
        return new Response("Too Many Requests", { status: 429 });
      }
    } else {
      lastPostCallMs = now;
      postCallCount = 1;
    }

    const result = await run();
    return ok(result);
  } catch (e) {
    return serverError(e);
  }
}
