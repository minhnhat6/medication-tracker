import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/medicines/[id]/restock
 * Nhập kho thuốc — cộng thêm số liều vào stockDoses hiện tại.
 * Body: { quantity: number }
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const quantity = Number(body.quantity);

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: "Số liều phải là số nguyên dương." },
        { status: 400 }
      );
    }

    const medicine = await prisma.medicine.update({
      where: { id },
      data: {
        stockDoses: {
          increment: quantity,
        },
      },
    });

    memCache.invalidate("active_medicines");
    return NextResponse.json({ medicine });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
