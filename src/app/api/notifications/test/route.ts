import { NextResponse } from "next/server";
import { notifyAll } from "@/lib/notify";

export async function POST() {
  try {
    const result = await notifyAll({
      title: "🔔 Thông báo test",
      body: "Đây là tin nhắn test từ hệ thống nhắc uống thuốc. Nếu bạn nhận được tin nhắn này, tức là cấu hình thông báo đã hoạt động!",
      tag: "test",
    });

    return NextResponse.json({
      success: true,
      result,
      message: `Đã gửi thông báo test qua ${result.push} thiết bị Web Push${result.telegram ? ", Telegram" : ""}${result.email ? ", Email" : ""}`,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
