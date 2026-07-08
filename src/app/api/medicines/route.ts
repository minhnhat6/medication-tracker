import { ok, bad, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: { createdAt: "asc" },
    });
    return ok({ medicines });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    if (!b.name || !b.dosage || !b.morningTime || !b.eveningTime)
      return bad("Thiếu tên / liều lượng / giờ uống.");
    const medicine = await prisma.medicine.create({
      data: {
        name: String(b.name),
        dosage: String(b.dosage),
        morningTime: String(b.morningTime),
        eveningTime: String(b.eveningTime),
        active: b.active === undefined ? true : Boolean(b.active),
      },
    });
    memCache.invalidate("active_medicines");
    return ok({ medicine }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
