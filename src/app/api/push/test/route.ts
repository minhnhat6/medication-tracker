import { ok, serverError } from "@/lib/api";
import { notifyAll } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Gửi thông báo thử qua tất cả kênh. */
export async function POST() {
  try {
    const result = await notifyAll({
      title: "🔔 Thử thông báo",
      body: "Nếu bạn thấy tin này thì thông báo đã hoạt động.",
      url: "/",
      tag: "test",
    });
    return ok({ result });
  } catch (e) {
    return serverError(e);
  }
}
