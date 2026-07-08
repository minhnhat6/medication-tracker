import { NextResponse } from "next/server";
import { getAllActiveMedicines } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * API trả về giờ nhắc nhở dựa trên giờ uống thuốc.
 * Giờ nhắc = giờ uống + 1 giờ
 */
export async function GET() {
  try {
    const meds = await getAllActiveMedicines();
    
    if (meds.length === 0) {
      return NextResponse.json({
        reminders: [],
        message: "Chưa có thuốc nào được cấu hình"
      });
    }

    // Lấy thuốc đầu tiên (có thể mở rộng cho nhiều thuốc)
    const med = meds[0];
    
    // Parse giờ uống (format: "HH:mm")
    const [morningHour, morningMin] = med.morningTime.split(":").map(Number);
    const [eveningHour, eveningMin] = med.eveningTime.split(":").map(Number);
    
    // Tính giờ nhắc (+ 1 giờ)
    const morningReminderHour = (morningHour + 1) % 24;
    const eveningReminderHour = (eveningHour + 1) % 24;
    
    const morningReminderTime = `${String(morningReminderHour).padStart(2, '0')}:${String(morningMin).padStart(2, '0')}`;
    const eveningReminderTime = `${String(eveningReminderHour).padStart(2, '0')}:${String(eveningMin).padStart(2, '0')}`;
    
    return NextResponse.json({
      medicine: {
        name: med.name,
        morningTime: med.morningTime,
        eveningTime: med.eveningTime,
      },
      reminders: [
        {
          type: "morning",
          medicineTime: med.morningTime,
          reminderTime: morningReminderTime,
          description: "Nhắc nhở sau 1h nếu chưa uống liều sáng"
        },
        {
          type: "evening",
          medicineTime: med.eveningTime,
          reminderTime: eveningReminderTime,
          description: "Nhắc nhở sau 1h nếu chưa uống liều tối"
        },
        {
          type: "end_of_day",
          reminderTime: "23:00",
          description: "Kiểm tra tổng hợp cuối ngày"
        }
      ],
      note: "⚠️ Vercel Cron cần cấu hình cố định trong vercel.json. Nếu bạn thay đổi giờ uống thuốc, cần cập nhật lại cron schedule."
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
