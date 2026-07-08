import { ok, serverError } from "@/lib/api";
import { computeStatistics, getDayStats } from "@/lib/stats";
import { resolveRange, RangePreset } from "@/lib/range";
import { dateOnlyUTC } from "@/lib/time";

export const dynamic = "force-dynamic";

/** GET /api/statistics?range=30d[&from=&to=] */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const preset = (url.searchParams.get("range") || "30d") as RangePreset;
    const { from, to } = resolveRange(
      preset,
      url.searchParams.get("from"),
      url.searchParams.get("to")
    );

    const [stats, days] = await Promise.all([
      computeStatistics(from, to),
      getDayStats(from ? dateOnlyUTC(from) : null, dateOnlyUTC(to)),
    ]);

    return ok({ range: preset, stats, days });
  } catch (e) {
    return serverError(e);
  }
}
