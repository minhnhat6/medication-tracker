import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dateOnlyUTC } from "@/lib/time";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const change = await prisma.medicationChange.update({
      where: { id },
      data: {
        ...(b.medicineName !== undefined && { medicineName: String(b.medicineName) }),
        ...(b.dosage !== undefined && { dosage: String(b.dosage) }),
        ...(b.changeDate !== undefined && { changeDate: dateOnlyUTC(String(b.changeDate)) }),
        ...(b.reason !== undefined && { reason: b.reason ? String(b.reason) : null }),
        ...(b.notes !== undefined && { notes: b.notes ? String(b.notes) : null }),
      },
    });
    return ok({ change });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await prisma.medicationChange.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
