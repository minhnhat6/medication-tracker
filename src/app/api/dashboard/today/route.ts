import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  getAllActiveMedicines,
  getOrCreateLog,
  nextDose,
  isDoseDue,
} from "@/lib/logs";
import { localDateStr, dateOnlyUTC } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const today = localDateStr();
    const meds = await getAllActiveMedicines();

    const items = await Promise.all(
      meds.map(async (med) => {
        const log = await getOrCreateLog(med.id, today);
        return {
          medicine: med,
          log,
          next: nextDose(med, log),
          due: isDoseDue(med, log),
        };
      })
    );

    const totalDoses = meds.length * 2;
    const takenDoses = items.reduce(
      (n, it) => n + (it.log.morningTaken ? 1 : 0) + (it.log.eveningTaken ? 1 : 0),
      0
    );

    // Phát bệnh hôm nay
    const start = dateOnlyUTC(today);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const episodesToday = await prisma.episode.findMany({
      where: { episodeTime: { gte: start, lt: end } },
      orderBy: { episodeTime: "asc" },
    });

    const dueList = items.filter((it) => it.due).map((it) => ({
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
