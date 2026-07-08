import { ok, bad, serverError } from "@/lib/api";
import { getActiveMedicine, markDose } from "@/lib/logs";
import { localDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const date = typeof body.date === "string" ? body.date : localDateStr();
    const taken = body.taken === undefined ? true : Boolean(body.taken);
    const medicineId = body.medicineId || (await getActiveMedicine())?.id;
    if (!medicineId) return bad("Chưa cấu hình thuốc.");

    const log = await markDose(medicineId, "evening", date, taken);
    return ok({ log });
  } catch (e) {
    return serverError(e);
  }
}
