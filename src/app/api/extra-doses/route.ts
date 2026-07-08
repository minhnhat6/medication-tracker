import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { localDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

// GET: danh sách thuốc uống thêm hôm nay
export async function GET() {
  try {
    const today = localDateStr();
    const rows = await prisma.extraDose.findMany({
      where: { date: new Date(today) },
      orderBy: { takenAt: "asc" },
    });
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST: thêm thuốc uống thêm
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, dosage, note } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Thiếu tên thuốc" }, { status: 400 });
    }
    const today = localDateStr();
    const row = await prisma.extraDose.create({
      data: {
        date: new Date(today),
        name: name.trim(),
        dosage: dosage?.trim() || null,
        note: note?.trim() || null,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
