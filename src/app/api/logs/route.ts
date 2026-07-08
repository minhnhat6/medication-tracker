import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dateOnlyUTC, localDateStr } from "@/lib/time";
import { isFinalized } from "@/lib/logs";
import { computeStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

/** GET /api/logs?from=yyyy-MM-dd&to=yyyy-MM-dd&limit=90 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const to = url.searchParams.get("to") || localDateStr();
    const from = url.searchParams.get("from");
    const limit = Math.min(Number(url.searchParams.get("limit") || 90), 366);

    const where: Record<string, unknown> = {};
    if (from) {
      where.date = { gte: dateOnlyUTC(from), lte: dateOnlyUTC(to) };
    } else {
      where.date = { lte: dateOnlyUTC(to) };
    }

    const logs = await prisma.medicationLog.findMany({
      where,
      include: { medicine: true },
      orderBy: { date: "desc" },
      take: from ? undefined : limit,
    });

    // Chuẩn hoá status hiển thị theo mốc chốt ngày (không ghi DB ở đây)
    const items = logs.map((l) => {
      const dateStr = l.date.toISOString().slice(0, 10);
      const status = computeStatus(l.morningTaken, l.eveningTaken, isFinalized(dateStr));
      return { ...l, status, date: dateStr };
    });

    return ok({ items });
  } catch (e) {
    return serverError(e);
  }
}
