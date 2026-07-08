import webpush from "web-push";
import nodemailer from "nodemailer";
import { prisma } from "./prisma";

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  vapidReady = true;
  return true;
}

export interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Gửi Web Push tới tất cả thiết bị đã đăng ký. Xóa subscription hết hạn. */
export async function sendWebPush(payload: NotifyPayload): Promise<number> {
  if (!ensureVapid()) return 0;
  const subs = await prisma.pushSubscription.findMany();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    })
  );
  return sent;
}

/** Gửi tin nhắn Telegram. Ưu tiên dùng settings từ database. */
export async function sendTelegram(text: string): Promise<boolean> {
  // Đọc settings từ database
  const settings = await prisma.notificationSettings.findFirst();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings?.telegramEnabled && settings.telegramChatId 
    ? settings.telegramChatId 
    : process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) return false;
  if (settings && !settings.telegramEnabled) return false; // Tắt trong settings
  
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Gửi email qua SMTP (tùy chọn). Ưu tiên dùng settings từ database. */
export async function sendEmail(subject: string, html: string): Promise<boolean> {
  // Đọc settings từ database
  const settings = await prisma.notificationSettings.findFirst();
  const host = process.env.SMTP_HOST;
  const to = settings?.emailEnabled && settings.emailTo 
    ? settings.emailTo 
    : process.env.NOTIFY_EMAIL_TO;
  
  if (!host || !to) return false;
  if (settings && !settings.emailEnabled) return false; // Tắt trong settings
  
  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch {
    return false;
  }
}

/** Gửi qua tất cả kênh đang cấu hình. */
export async function notifyAll(payload: NotifyPayload) {
  const [push, tg, mail] = await Promise.all([
    sendWebPush(payload),
    sendTelegram(`<b>${payload.title}</b>\n${payload.body}`),
    sendEmail(payload.title, `<h3>${payload.title}</h3><p>${payload.body}</p>`),
  ]);
  return { push, telegram: tg, email: mail };
}
