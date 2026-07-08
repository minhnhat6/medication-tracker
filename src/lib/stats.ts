import { prisma } from "./prisma";
import { isFinalized } from "./logs";
import { computeStatus } from "./status";
import { dateOnlyUTC, localDateStr } from "./time";
import type { MedStatus } from "@prisma/client";

export interface DayStat {
  date: string;
  status: MedStatus;
  morningTaken: boolean;
  eveningTaken: boolean;
}

export interface Statistics {
  from: string | null;
  to: string;
  totalDays: number; // số ngày đã chốt có log
  completedDays: number;
  missedDays: number;
  completionRate: number; // 0..100
  currentStreak: number;
  longestStreak: number;
  totalEpisodes: number;
  daysSinceLastEpisode: number | null;
  longestEpisodeFreeDays: number | null;
}

/** Trả về danh sách ngày (đã chốt) kèm trạng thái, gộp theo ngày. */
export async function getDayStats(from: Date | null, to: Date): Promise<DayStat[]> {
  const where: Record<string, unknown> = { date: { lte: to } };
  if (from) (where.date as Record<string, Date>).gte = from;

  const logs = await prisma.medicationLog.findMany({
    where,
    orderBy: { date: "asc" },
  });

  const rank: Record<MedStatus, number> = {
    completed: 0,
    pending: 1,
    missing_morning: 2,
    missing_evening: 2,
    missing_both: 3,
  };
  const map = new Map<string, DayStat>();
  for (const l of logs) {
    const dateStr = l.date.toISOString().slice(0, 10);
    if (!isFinalized(dateStr)) continue; // chỉ tính ngày đã chốt
    const st = computeStatus(l.morningTaken, l.eveningTaken, true);
    const prev = map.get(dateStr);
    if (!prev || rank[st] > rank[prev.status]) {
      map.set(dateStr, {
        date: dateStr,
        status: st,
        morningTaken: l.morningTaken,
        eveningTaken: l.eveningTaken,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function computeStatistics(
  fromStr: string | null,
  toStr: string
): Promise<Statistics> {
  const from = fromStr ? dateOnlyUTC(fromStr) : null;
  const to = dateOnlyUTC(toStr);
  const days = await getDayStats(from, to);

  const completedDays = days.filter((d) => d.status === "completed").length;
  const missedDays = days.filter((d) => d.status !== "completed").length;
  const totalDays = days.length;
  const completionRate = totalDays ? Math.round((completedDays / totalDays) * 1000) / 10 : 0;

  // Streak hiện tại: đếm ngược từ ngày mới nhất còn "completed" liên tiếp
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].status === "completed") currentStreak++;
    else break;
  }
  let longestStreak = 0;
  let run = 0;
  for (const d of days) {
    if (d.status === "completed") {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else run = 0;
  }

  // Episodes
  const epWhere: Record<string, unknown> = { episodeTime: { lte: endOfDay(to) } };
  if (from) (epWhere.episodeTime as Record<string, Date>).gte = from;
  const episodes = await prisma.episode.findMany({
    where: epWhere,
    orderBy: { episodeTime: "asc" },
    select: { episodeTime: true },
  });
  const totalEpisodes = episodes.length;

  let daysSinceLastEpisode: number | null = null;
  if (episodes.length) {
    const last = episodes[episodes.length - 1].episodeTime;
    const lastDay = dateOnlyUTC(localDateStr(last));
    const today = dateOnlyUTC(localDateStr());
    daysSinceLastEpisode = Math.round((today.getTime() - lastDay.getTime()) / 86400000);
  }

  // Khoảng không phát bệnh dài nhất (giữa các lần)
  let longestEpisodeFreeDays: number | null = null;
  if (episodes.length >= 2) {
    let maxGap = 0;
    for (let i = 1; i < episodes.length; i++) {
      const gap = Math.round(
        (dateOnlyUTC(localDateStr(episodes[i].episodeTime)).getTime() -
          dateOnlyUTC(localDateStr(episodes[i - 1].episodeTime)).getTime()) /
          86400000
      );
      maxGap = Math.max(maxGap, gap);
    }
    longestEpisodeFreeDays = maxGap;
  } else if (episodes.length === 1) {
    longestEpisodeFreeDays = daysSinceLastEpisode;
  }

  return {
    from: fromStr,
    to: toStr,
    totalDays,
    completedDays,
    missedDays,
    completionRate,
    currentStreak,
    longestStreak,
    totalEpisodes,
    daysSinceLastEpisode,
    longestEpisodeFreeDays,
  };
}

function endOfDay(d: Date): Date {
  return new Date(d.getTime() + 86400000 - 1);
}
