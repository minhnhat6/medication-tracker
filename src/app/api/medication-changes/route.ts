import { ok, bad, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { dateOnlyUTC } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const changes = await prisma.medicationChange.findMany({
      orderBy: { changeDate: "desc" },
    });
    return ok({ changes });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    if (!b.medicineName || !b.dosage || !b.changeDate)
      return bad("Thiếu thuốc / liều lượng / ngày thay đổi.");
    const change = await prisma.medicationChange.create({
      data: {
        medicineName: String(b.medicineName),
        dosage: String(b.dosage),
        changeDate: dateOnlyUTC(String(b.changeDate)),
        reason: b.reason ? String(b.reason) : null,
        notes: b.notes ? String(b.notes) : null,
      },
    });
    return ok({ change }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
