import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/medicines/[id]/restock
 * Nhập kho thuốc — cộng thêm số liều, lưu lịch sử.
 * Body: { quantity: number, note?: string }
 *
 * Quan trọng: KHÔNG dùng Prisma `increment` vì NULL + n = NULL trong SQL.
 */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const quantity = Number(body.quantity);
    const note: string | undefined = body.note || undefined;

    if (!quantity || quantity <= 0 || !Number.isInteger(quantity)) {
      return NextResponse.json(
        { error: "Số liều phải là số nguyên dương." },
        { status: 400 }
      );
    }

    // Đọc giá trị hiện tại (null → 0)
    const current = await prisma.medicine.findUnique({
      where: { id },
      select: { stockDoses: true },
    });
    const currentStock = current?.stockDoses ?? 0;
    const newStock = currentStock + quantity;

    // Cập nhật tồn kho + ghi lịch sử trong 1 transaction
    const [medicine, history] = await prisma.$transaction([
      prisma.medicine.update({
        where: { id },
        data: { stockDoses: newStock },
      }),
      prisma.stockHistory.create({
        data: {
          medicineId: id,
          quantity,
          totalAfter: newStock,
          note,
        },
      }),
    ]);

    memCache.invalidate("active_medicines");
    return NextResponse.json({ medicine, history, newStock });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

/**
 * GET /api/medicines/[id]/restock
 * Lấy lịch sử nhập kho của thuốc (10 bản ghi gần nhất).
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const history = await prisma.stockHistory.findMany({
      where: { medicineId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json({ history });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
