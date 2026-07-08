import { prisma } from "./prisma";
import { computeStatistics, getDayStats, Statistics, DayStat } from "./stats";
import { buildTimeline, TimelineEvent } from "./timeline";
import { resolveRange, RangePreset, RANGE_LABELS } from "./range";
import { dateOnlyUTC, fmt } from "./time";
import { STATUS_LABEL } from "./status";

export interface ReportData {
  rangeLabel: string;
  from: string | null;
  to: string;
  stats: Statistics;
  days: DayStat[];
  episodes: {
    time: string;
    severity: string;
    duration: number | null;
    location: string | null;
    notes: string | null;
  }[];
  timeline: TimelineEvent[];
  changes: {
    date: string;
    medicine: string;
    dosage: string;
    reason: string | null;
    notes: string | null;
  }[];
}

const SEVERITY_LABEL: Record<string, string> = {
  mild: "Nhẹ",
  moderate: "Vừa",
  severe: "Nặng",
};

export async function gatherReport(
  preset: RangePreset,
  fromParam?: string | null,
  toParam?: string | null
): Promise<ReportData> {
  const { from, to } = resolveRange(preset, fromParam, toParam);

  const [stats, days, episodesRaw, changesRaw, timeline] = await Promise.all([
    computeStatistics(from, to),
    getDayStats(from ? dateOnlyUTC(from) : null, dateOnlyUTC(to)),
    prisma.episode.findMany({
      where: {
        episodeTime: {
          gte: from ? dateOnlyUTC(from) : new Date(0),
          lt: new Date(dateOnlyUTC(to).getTime() + 86400000),
        },
      },
      orderBy: { episodeTime: "desc" },
    }),
    prisma.medicationChange.findMany({
      where: {
        changeDate: {
          gte: from ? dateOnlyUTC(from) : new Date(0),
          lt: new Date(dateOnlyUTC(to).getTime() + 86400000),
        },
      },
      orderBy: { changeDate: "desc" },
    }),
    buildTimeline(from, to),
  ]);

  return {
    rangeLabel: RANGE_LABELS[preset] || preset,
    from,
    to,
    stats,
    days,
    episodes: episodesRaw.map((e) => ({
      time: fmt(e.episodeTime, "dd/MM/yyyy HH:mm"),
      severity: SEVERITY_LABEL[e.severity] || e.severity,
      duration: e.duration,
      location: e.location,
      notes: e.notes,
    })),
    timeline,
    changes: changesRaw.map((c) => ({
      date: fmt(c.changeDate, "dd/MM/yyyy"),
      medicine: c.medicineName,
      dosage: c.dosage,
      reason: c.reason,
      notes: c.notes,
    })),
  };
}

export { STATUS_LABEL, SEVERITY_LABEL };
