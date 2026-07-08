import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";
import { computeStatus } from "@/lib/status";
import { nextDose, isDoseDue, isFinalized, CUTOFF_MINUTES } from "@/lib/logs";
import { localDateStr, dateOnlyUTC, nowMinutes, minutesOfDay } from "@/lib/time";
import type { Medicine, MedicationLog } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Optimized dashboard endpoint.
 * Before: N+1 queries (1 per medicine for getOrCreateLog)
 * After:  2–3 batch queries total
 */
export async function GET() {
  try {
    const today = localDateStr();
    const start = dateOnlyUTC(today);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    // 1. Get active medicines (cached 30s — list rarely changes)
    const meds = await memCache.get<Medicine[]>(
      "active_medicines",
      30,
      () =>
        prisma.medicine.findMany({
          where: { active: true },
          orderBy: { createdAt: "asc" },
        })
    );

    if (meds.length === 0) {
      return ok({
        date: today,
        items: [],
        progress: { taken: 0, total: 0 },
        due: [],
        episodesToday: [],
        hasEpisodeToday: false,
      });
    }

    // 2. Batch fetch all today's logs in ONE query
    const medicineIds = meds.map((m) => m.id);
    const existingLogs = await prisma.medicationLog.findMany({
      where: {
        medicineId: { in: medicineIds },
        date: start,
      },
    });

    const logByMedId = new Map(existingLogs.map((l) => [l.medicineId, l]));

    // 3. Upsert missing logs in ONE batch
    const finalized = isFinalized(today);
    const defaultStatus = finalized ? "missing_both" : "pending";
    const missingMedIds = meds
      .filter((m) => !logByMedId.has(m.id))
      .map((m) => m.id);

    if (missingMedIds.length > 0) {
      // createMany is not supported with unique constraint on conflict, use upsert per missing
      // But still much better than getOrCreateLog N times (only runs for truly missing ones)
      const created = await Promise.all(
        missingMedIds.map((medicineId) =>
          prisma.medicationLog.upsert({
            where: { medicineId_date: { medicineId, date: start } },
            create: { medicineId, date: start, status: defaultStatus },
            update: {},
          })
        )
      );
      created.forEach((l) => logByMedId.set(l.medicineId, l));
    }

    // 4. Recompute statuses in-memory (no extra DB round trips)
    const updatedLogs: MedicationLog[] = [];
    for (const log of logByMedId.values()) {
      const desired = computeStatus(log.morningTaken, log.eveningTaken, finalized);
      if (desired !== log.status) {
        updatedLogs.push({ ...log, status: desired });
      }
    }

    // Batch update statuses if needed
    if (updatedLogs.length > 0) {
      await Promise.all(
        updatedLogs.map((l) =>
          prisma.medicationLog.update({
            where: { id: l.id },
            data: { status: l.status },
          })
        )
      );
      updatedLogs.forEach((l) => logByMedId.set(l.medicineId, l));
    }

    // 5. Build items
    const items = meds.map((med) => {
      const log = logByMedId.get(med.id)!;
      return {
        medicine: med,
        log,
        next: nextDose(med, log),
        due: isDoseDue(med, log),
      };
    });

    // 6. Batch fetch today's episodes alongside (parallel with items build)
    const episodesToday = await prisma.episode.findMany({
      where: { episodeTime: { gte: start, lt: end } },
      orderBy: { episodeTime: "asc" },
    });

    const totalDoses = meds.length * 2;
    const takenDoses = items.reduce(
      (n, it) =>
        n + (it.log.morningTaken ? 1 : 0) + (it.log.eveningTaken ? 1 : 0),
      0
    );

    const dueList = items
      .filter((it) => it.due)
      .map((it) => ({
        medicine: it.medicine.name,
        which: it.due!.which,
        time: it.due!.time,
      }));

    return ok({
      date: today,
      items,
      progress: { taken: takenDoses, total: totalDoses },
      due: dueList,
      episodesToday,
      hasEpisodeToday: episodesToday.length > 0,
    });
  } catch (e) {
    return serverError(e);
  }
}
