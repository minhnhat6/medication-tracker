import { ok, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import type { Severity } from "@prisma/client";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const SEVERITIES: Severity[] = ["mild", "moderate", "severe"];

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const b = await req.json().catch(() => ({}));
    const episode = await prisma.episode.update({
      where: { id },
      data: {
        ...(b.episodeTime !== undefined && { episodeTime: new Date(b.episodeTime) }),
        ...(b.duration !== undefined && {
          duration: b.duration === "" || b.duration == null ? null : Number(b.duration),
        }),
        ...(b.severity !== undefined &&
          SEVERITIES.includes(b.severity) && { severity: b.severity as Severity }),
        ...(b.location !== undefined && { location: b.location ? String(b.location) : null }),
        ...(b.notes !== undefined && { notes: b.notes ? String(b.notes) : null }),
      },
    });
    return ok({ episode });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await prisma.episode.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return serverError(e);
  }
}
