import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dateOnlyUTC, localDateStr } from "@/lib/time";
import { isFinalized } from "@/lib/logs";
import { computeStatus } from "@/lib/status";
import type { MedStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

/** GET /api/calendar?month=yyyy-MM */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || localDateStr().slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const first = `${month}-01`;
    const startDate = dateOnlyUTC(first);
    const endDate = new Date(Date.UTC(y, m, 1)); // ngày 1 tháng sau (exclusive)

    const [logs, episodes] = await Promise.all([
      prisma.medicationLog.findMany({
        where: { date: { gte: startDate, lt: endDate } },
      }),
      prisma.episode.findMany({
        where: { episodeTime: { gte: startDate, lt: endDate } },
        select: { episodeTime: true },
      }),
    ]);

    // Gom log theo ngày (nhiều thuốc -> lấy trạng thái xấu nhất)
    const rank: Record<MedStatus, number> = {
      completed: 0,
      pending: 1,
      missing_morning: 2,
      missing_evening: 2,
      missing_both: 3,
    };
    const byDay = new Map<string, MedStatus>();
    for (const l of logs) {
      const dateStr = l.date.toISOString().slice(0, 10);
      const st = computeStatus(l.morningTaken, l.eveningTaken, isFinalized(dateStr));
      const cur = byDay.get(dateStr);
      if (!cur || rank[st] > rank[cur]) byDay.set(dateStr, st);
    }

    const episodeDays = new Set(
      episodes.map((e) => localDateStr(e.episodeTime))
    );

    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${month}-${String(d).padStart(2, "0")}`;
      days.push({
        date: dateStr,
        status: byDay.get(dateStr) ?? null,
        hasEpisode: episodeDays.has(dateStr),
      });
    }

    return ok({ month, days });
  } catch (e) {
    return serverError(e);
  }
}
