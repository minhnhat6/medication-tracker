import { ok, bad, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Trả về VAPID public key để client subscribe. */
export async function GET() {
  return ok({
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    configured: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  });
}

export async function POST(req: Request) {
  try {
    const sub = await req.json().catch(() => null);
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth)
      return bad("Subscription không hợp lệ.");
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return ok({ subscribed: true });
  } catch (e) {
    return serverError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const { endpoint } = await req.json().catch(() => ({}));
    if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return ok({ unsubscribed: true });
  } catch (e) {
    return serverError(e);
  }
}
