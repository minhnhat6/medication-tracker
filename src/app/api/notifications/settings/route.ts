import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Lấy hoặc tạo settings (chỉ có 1 record)
    let settings = await prisma.notificationSettings.findFirst();
    if (!settings) {
      settings = await prisma.notificationSettings.create({
        data: {},
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    
    // Tìm record hiện tại
    let settings = await prisma.notificationSettings.findFirst();
    
    if (!settings) {
      // Tạo mới nếu chưa có
      settings = await prisma.notificationSettings.create({
        data: body,
      });
    } else {
      // Cập nhật
      settings = await prisma.notificationSettings.update({
        where: { id: settings.id },
        data: body,
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
