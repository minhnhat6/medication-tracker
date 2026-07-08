import { prisma } from "./prisma";
import { dateOnlyUTC, fmt } from "./time";

export type TimelineKind = "morning" | "evening" | "episode" | "change";

export interface TimelineEvent {
  at: string; // ISO
  kind: TimelineKind;
  icon: string;
  label: string;
  detail?: string;
}

/** Xây dòng thời gian từ log uống thuốc, phát bệnh, đổi thuốc trong khoảng. */
export async function buildTimeline(
  fromStr: string | null,
  toStr: string
): Promise<TimelineEvent[]> {
  const from = fromStr ? dateOnlyUTC(fromStr) : new Date(0);
  const toExclusive = new Date(dateOnlyUTC(toStr).getTime() + 86400000);

  const [logs, episodes, changes] = await Promise.all([
    prisma.medicationLog.findMany({
      where: { date: { gte: from, lt: toExclusive } },
      include: { medicine: true },
    }),
    prisma.episode.findMany({
      where: { episodeTime: { gte: from, lt: toExclusive } },
    }),
    prisma.medicationChange.findMany({
      where: { changeDate: { gte: from, lt: toExclusive } },
    }),
  ]);

  const events: TimelineEvent[] = [];

  for (const l of logs) {
    if (l.morningTaken && l.morningTakenAt) {
      events.push({
        at: l.morningTakenAt.toISOString(),
        kind: "morning",
        icon: "✅",
        label: `Uống sáng — ${l.medicine.name}`,
        detail: l.medicine.dosage,
      });
    }
    if (l.eveningTaken && l.eveningTakenAt) {
      events.push({
        at: l.eveningTakenAt.toISOString(),
        kind: "evening",
        icon: "✅",
        label: `Uống tối — ${l.medicine.name}`,
        detail: l.medicine.dosage,
      });
    }
  }

  for (const e of episodes) {
    events.push({
      at: e.episodeTime.toISOString(),
      kind: "episode",
      icon: "⚡",
      label: "Phát bệnh",
      detail: [
        e.severity,
        e.duration ? `${e.duration} phút` : null,
        e.location,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  for (const c of changes) {
    events.push({
      at: c.changeDate.toISOString(),
      kind: "change",
      icon: "💊",
      label: `Đổi thuốc: ${c.medicineName} (${c.dosage})`,
      detail: c.reason || undefined,
    });
  }

  events.sort((a, b) => b.at.localeCompare(a.at)); // mới nhất trước
  return events;
}

export { fmt };
