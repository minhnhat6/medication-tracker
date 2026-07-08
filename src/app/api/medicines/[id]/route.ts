import { ok, bad, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        ...(b.name !== undefined && { name: String(b.name) }),
        ...(b.dosage !== undefined && { dosage: String(b.dosage) }),
        ...(b.morningTime !== undefined && { morningTime: String(b.morningTime) }),
        ...(b.eveningTime !== undefined && { eveningTime: String(b.eveningTime) }),
        ...(b.active !== undefined && { active: Boolean(b.active) }),
      },
    });
    memCache.invalidate("active_medicines");
    return ok({ medicine });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const count = await prisma.medicine.count();
    if (count <= 1) return bad("Phải giữ lại ít nhất 1 thuốc.");
    await prisma.medicine.delete({ where: { id } });
    memCache.invalidate("active_medicines");
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
