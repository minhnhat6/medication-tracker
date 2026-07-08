import { ok, serverError } from "@/lib/api";
import { buildTimeline } from "@/lib/timeline";
import { resolveRange, RangePreset } from "@/lib/range";

export const dynamic = "force-dynamic";

/** GET /api/timeline?range=7d  hoặc  ?from=&to= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const preset = (url.searchParams.get("range") || "7d") as RangePreset;
    const { from, to } = resolveRange(
      preset,
      url.searchParams.get("from"),
      url.searchParams.get("to")
    );
    const events = await buildTimeline(from, to);
    return ok({ range: preset, from, to, events });
  } catch (e) {
    return serverError(e);
  }
}
