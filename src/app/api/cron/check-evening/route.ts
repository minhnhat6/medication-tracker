import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllActiveMedicines, getOrCreateLog } from "@/lib/logs";
import { notifyAll } from "@/lib/notify";
import { localDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Chạy sau 1 giờ kể từ giờ uống thuốc buổi tối.
 * Kiểm tra nếu chưa uống → gửi thông báo nhắc nhở.
 */
async function run() {
  const today = localDateStr();
  const meds = await getAllActiveMedicines();
  const missing: string[] = [];

  for (const med of meds) {
    const log = await getOrCreateLog(med.id, today);
    
    // Chỉ nhắc nếu chưa uống liều tối
    if (!log.eveningTaken) {
      missing.push(`${med.name} (liều tối ${med.eveningTime})`);
    }
  }

  let notified = null;
  if (missing.length > 0) {
    notified = await notifyAll({
      title: "⏰ Nhắc nhở: Bạn chưa uống thuốc buổi tối!",
      body: `Đã quá 1 giờ kể từ giờ uống thuốc.\n\nCòn thiếu: ${missing.join(", ")}`,
      url: "/",
      tag: "evening-reminder",
    });
  }

  return { 
    time: new Date().toISOString(),
    date: today, 
    missing, 
    notified,
    message: missing.length > 0 
      ? `Đã gửi nhắc nhở cho ${missing.length} liều tối`
      : "Đã uống đủ liều tối"
  };
}

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }
    const result = await run();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Cho phép test thủ công
export const POST = GET;
