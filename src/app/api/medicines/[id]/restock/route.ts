import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/medicines/[id]/restock
 * Nhập kho thuốc — cộng thêm số liều vào stockDoses hiện tại.
 * Body: { quantity: number }
 *
 * Quan trọng: KHÔNG dùng Prisma `increment` vì NULL + n = NULL trong SQL.
 * Thay vào đó: đọc giá trị hiện tại, cộng thủ công, rồi SET mới.
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

    // Đọc giá trị hiện tại trước (null → xem như 0)
    const current = await prisma.medicine.findUnique({
      where: { id },
      select: { stockDoses: true },
    });
    const currentStock = current?.stockDoses ?? 0;
    const newStock = currentStock + quantity;

    const medicine = await prisma.medicine.update({
      where: { id },
      data: { stockDoses: newStock },
    });

    memCache.invalidate("active_medicines");
    return NextResponse.json({ medicine, newStock });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

