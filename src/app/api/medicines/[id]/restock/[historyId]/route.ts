import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memCache } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; historyId: string }> };

/**
 * DELETE /api/medicines/[id]/restock/[historyId]
 * Xóa 1 bản ghi lịch sử nhập kho.
 * Đồng thời hoàn trả số liều đã nhập vào stockDoses hiện tại.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id, historyId } = await params;

    // Lấy bản ghi cần xóa
    const entry = await prisma.stockHistory.findUnique({
      where: { id: historyId },
    });
    if (!entry || entry.medicineId !== id) {
      return NextResponse.json({ error: "Không tìm thấy bản ghi." }, { status: 404 });
    }

    // Đọc tồn kho hiện tại → trừ số liều đã nhập lần đó
    const current = await prisma.medicine.findUnique({
      where: { id },
      select: { stockDoses: true },
    });
    const currentStock = current?.stockDoses ?? 0;
    const newStock = Math.max(0, currentStock - entry.quantity);

    // Xóa bản ghi + cập nhật tồn kho trong transaction
    await prisma.$transaction([
      prisma.stockHistory.delete({ where: { id: historyId } }),
      prisma.medicine.update({
        where: { id },
        data: { stockDoses: newStock },
      }),
    ]);

    memCache.invalidate("active_medicines");
    return NextResponse.json({ deleted: true, newStock });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
