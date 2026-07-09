import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/medicines/[id]/reset-stock
 * Đặt lại tồn kho về 0 hoặc null (ngừng theo dõi).
 * Body: { mode: "zero" | "stop" }
 * - "zero": đặt về 0 (vẫn theo dõi, nhưng hết hàng)
 * - "stop": đặt về null (ngừng theo dõi hoàn toàn)
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const mode: "zero" | "stop" = body.mode === "stop" ? "stop" : "zero";

    const medicine = await prisma.medicine.update({
      where: { id },
      data: { stockDoses: mode === "stop" ? null : 0 },
    });

    memCache.invalidate("active_medicines");
    return NextResponse.json({ medicine, mode });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
