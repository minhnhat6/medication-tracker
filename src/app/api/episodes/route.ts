import { ok, bad, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import type { Severity } from "@prisma/client";

export const dynamic = "force-dynamic";

const SEVERITIES: Severity[] = ["mild", "moderate", "severe"];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 100), 500);
    const episodes = await prisma.episode.findMany({
      orderBy: { episodeTime: "desc" },
      take: limit,
    });
    return ok({ episodes });
  } catch (e) {
    return serverError(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({}));
    if (!b.episodeTime) return bad("Thiếu thời gian phát bệnh.");
    const severity: Severity = SEVERITIES.includes(b.severity) ? b.severity : "moderate";
    const episode = await prisma.episode.create({
      data: {
        episodeTime: new Date(b.episodeTime),
        duration: b.duration != null && b.duration !== "" ? Number(b.duration) : null,
        severity,
        location: b.location ? String(b.location) : null,
        notes: b.notes ? String(b.notes) : null,
      },
    });
    return ok({ episode }, { status: 201 });
  } catch (e) {
    return serverError(e);
  }
}
