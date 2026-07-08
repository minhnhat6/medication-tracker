import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAllActiveMedicines, getOrCreateLog } from "@/lib/logs";
import { notifyAll } from "@/lib/notify";
import { localDateStr } from "@/lib/time";

export const dynamic = "force-dynamic";

/**
 * Smart Reminder: Chạy định kỳ mỗi 30 phút, tự động kiểm tra xem đã đến giờ nhắc chưa.
 * Không cần cập nhật cron khi thay đổi giờ uống thuốc!
 */
async function run() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  
  const today = localDateStr();
  const meds = await getAllActiveMedicines();
  const reminders: string[] = [];
  const checks: any[] = [];

  for (const med of meds) {
    const log = await getOrCreateLog(med.id, today);
    
    // Tính giờ nhắc (giờ uống + 1h)
    const [morningHour, morningMin] = med.morningTime.split(":").map(Number);
    const [eveningHour, eveningMin] = med.eveningTime.split(":").map(Number);
    
    const morningReminderHour = (morningHour + 1) % 24;
    const eveningReminderHour = (eveningHour + 1) % 24;
    
    const morningReminderTime = `${String(morningReminderHour).padStart(2, '0')}:${String(morningMin).padStart(2, '0')}`;
    const eveningReminderTime = `${String(eveningReminderHour).padStart(2, '0')}:${String(eveningMin).padStart(2, '0')}`;
    
    // Kiểm tra xem hiện tại có phải giờ nhắc không (với khoảng 30 phút)
    const isTimeToRemindMorning = isWithinReminderWindow(currentHour, currentMinute, morningReminderHour, morningMin);
    const isTimeToRemindEvening = isWithinReminderWindow(currentHour, currentMinute, eveningReminderHour, eveningMin);
    
    // Kiểm tra xem đã gửi nhắc nhở chưa (để tránh spam)
    const lastNotified = await prisma.reminderLog.findFirst({
      where: {
        medicineId: med.id,
        date: new Date(today),
      },
    });
    
    checks.push({
      medicine: med.name,
      morningTime: med.morningTime,
      eveningTime: med.eveningTime,
      morningReminderTime,
      eveningReminderTime,
      currentTime,
      isTimeToRemindMorning,
      isTimeToRemindEvening,
      morningTaken: log.morningTaken,
      eveningTaken: log.eveningTaken,
      lastNotifiedMorning: lastNotified?.morningNotified,
      lastNotifiedEvening: lastNotified?.eveningNotified,
    });
    
    // Nhắc sáng: đúng giờ, chưa uống, chưa nhắc
    if (isTimeToRemindMorning && !log.morningTaken && !lastNotified?.morningNotified) {
      reminders.push(`${med.name} (liều sáng ${med.morningTime})`);
      // Lưu log đã nhắc
      await prisma.reminderLog.upsert({
        where: {
          medicineId_date: {
            medicineId: med.id,
            date: new Date(today),
          },
        },
        create: {
          medicineId: med.id,
          date: new Date(today),
          morningNotified: true,
          eveningNotified: false,
        },
        update: {
          morningNotified: true,
        },
      });
    }
    
    // Nhắc tối: đúng giờ, chưa uống, chưa nhắc
    if (isTimeToRemindEvening && !log.eveningTaken && !lastNotified?.eveningNotified) {
      reminders.push(`${med.name} (liều tối ${med.eveningTime})`);
      // Lưu log đã nhắc
      await prisma.reminderLog.upsert({
        where: {
          medicineId_date: {
            medicineId: med.id,
            date: new Date(today),
          },
        },
        create: {
          medicineId: med.id,
          date: new Date(today),
          morningNotified: false,
          eveningNotified: true,
        },
        update: {
          eveningNotified: true,
        },
      });
    }
  }

  let notified = null;
  if (reminders.length > 0) {
    notified = await notifyAll({
      title: "⏰ Nhắc nhở: Bạn chưa uống thuốc!",
      body: `Đã quá 1 giờ kể từ giờ uống thuốc.\n\nCòn thiếu: ${reminders.join(", ")}`,
      url: "/",
      tag: "smart-reminder",
    });
  }

  return { 
    currentTime,
    date: today, 
    reminders, 
    notified,
    checks,
    message: reminders.length > 0 
      ? `Đã gửi nhắc nhở cho ${reminders.length} liều`
      : "Không có liều nào cần nhắc lúc này"
  };
}

/**
 * Kiểm tra xem thời gian hiện tại có nằm trong khung nhắc nhở không
 * (Trong vòng 30 phút kể từ giờ nhắc)
 */
function isWithinReminderWindow(
  currentHour: number,
  currentMinute: number,
  reminderHour: number,
  reminderMinute: number
): boolean {
  const currentMinutes = currentHour * 60 + currentMinute;
  const reminderMinutes = reminderHour * 60 + reminderMinute;
  const diff = currentMinutes - reminderMinutes;
  
  // Trong khoảng 0-30 phút sau giờ nhắc
  return diff >= 0 && diff < 30;
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

export const POST = GET;
