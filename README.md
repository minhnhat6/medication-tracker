# Medication Tracker 💊

Web app cá nhân (PWA) theo dõi uống thuốc 2 lần/ngày, ghi nhận phát bệnh, và xuất báo cáo tái khám. Xây theo `Medication_Tracker_PRD.md`.

**Stack:** Next.js 15 (App Router) · TypeScript · TailwindCSS · Prisma · Supabase (Postgres + Storage) · Vercel Cron · Web Push / Telegram / Email · PWA offline.

## Tính năng (theo PRD)

| PRD | Trang / API |
|---|---|
| Dashboard 1 chạm, banner cảnh báo & phát bệnh | `/` · `GET /api/dashboard/today` · `POST /api/logs/morning|evening` |
| Lịch sử uống thuốc | `/history` · `GET /api/logs` |
| Calendar (🟢🔴⚡) | `/calendar` · `GET /api/calendar` |
| Statistics (tỷ lệ, streak, phát bệnh) + biểu đồ | `/statistics` · `GET /api/statistics` |
| Episode Tracker (tự liên kết ngày) | `/episodes` · `CRUD /api/episodes` |
| Timeline có lọc ngày/tuần/tháng | `/timeline` · `GET /api/timeline` |
| Lịch sử thay đổi thuốc | `/changes` · `CRUD /api/medication-changes` |
| Hồ sơ khám bệnh (upload Supabase Storage) | `/documents` · `CRUD /api/documents` |
| Export PDF + Excel (7d/30d/3m/6m/1y/tùy chọn/toàn bộ) | `/export` · `POST /api/export/pdf|excel` |
| Nhắc 23:00 đa kênh | `/api/cron/check` (Vercel Cron) |
| Quản lý thuốc & giờ uống, bật thông báo | `/settings` · `CRUD /api/medicines` · `/api/push/*` |
| PWA offline, dark mode | `public/sw.js` · `manifest.webmanifest` |

## Chạy local

```bash
npm install
cp .env.example .env      # điền DATABASE_URL, DIRECT_URL (bắt buộc)
npm run db:push           # tạo bảng trên Supabase
npm run db:seed           # tạo 1 thuốc mặc định (07:00 / 21:00)
npm run dev               # http://localhost:3000
```

## Cấu hình Supabase

1. Tạo project trên [supabase.com](https://supabase.com).
2. **Database** → Connection string:
   - `DATABASE_URL` = pooler (port **6543**, thêm `?pgbouncer=true`).
   - `DIRECT_URL` = direct (port **5432**) — dùng cho `prisma db push`.
3. **Storage** → tạo bucket `medical-documents`, đặt **Public** (để xem file qua link).
   - `NEXT_PUBLIC_SUPABASE_URL` = Project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` = Settings → API → `service_role` (bí mật, chỉ ở server).

## Deploy lên Vercel

1. Push code lên GitHub, import vào Vercel.
2. **Settings → Environment Variables**: dán toàn bộ biến trong `.env.example` đã điền.
3. Vercel tự chạy `npm run build` (đã bao gồm `prisma generate`).
4. **Cron** đã khai báo trong `vercel.json` (`/api/cron/check` lúc **16:00 UTC = 23:00 giờ VN**).
   - Đặt thêm `CRON_SECRET` để bảo vệ endpoint — Vercel tự gửi `Authorization: Bearer <CRON_SECRET>`.
5. Lần đầu, chạy `npm run db:push` từ máy (trỏ `DIRECT_URL` vào Supabase) để tạo bảng.

## Deploy lên Vercel

**Xem hướng dẫn chi tiết:** [DEPLOY.md](./DEPLOY.md) | [Checklist](./DEPLOY_CHECKLIST.md)

**Tóm tắt nhanh:**
1. Tạo Supabase project → lấy DATABASE_URL + DIRECT_URL
2. Tạo bucket `medical-documents` (public) trên Supabase Storage
3. Push code lên GitHub
4. Import vào Vercel → thêm env vars → Deploy
5. Verify: test dashboard + cron + storage

**Pre-deploy check:**
```bash
./scripts/pre-deploy-check.sh
```

## Thông báo nhắc thuốc (tùy chọn, bật thêm khi cần)

Ứng dụng hỗ trợ 4 kênh thông báo: **Web Push**, **Email**, **Telegram**, và **Zalo** (đang phát triển).

### 🚀 Bắt đầu nhanh

Xem **[NOTIFICATION_QUICK_START.md](./NOTIFICATION_QUICK_START.md)** để bắt đầu ngay!

### Cấu hình trong UI (khuyến nghị)

Vào `/settings` → **Cấu hình kênh thông báo** để:
- Bật/tắt từng kênh
- Nhập email, Telegram chat ID, số điện thoại Zalo
- Lưu cấu hình và gửi thử

Cấu hình này lưu trong database (`notification_settings`), không cần thay đổi file `.env`.

### Cấu hình server (bắt buộc cho email/telegram)

- **Web Push:** tạo VAPID keys `npx web-push generate-vapid-keys` → điền `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Vào `/settings` bấm **Bật thông báo**.
- **Telegram:** 📖 Xem [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) - Tạo bot với [@BotFather](https://t.me/BotFather) → `TELEGRAM_BOT_TOKEN`; lấy chat id qua [@userinfobot](https://t.me/userinfobot).
  - **Script test:** Chạy `./test-telegram.sh <BOT_TOKEN> <CHAT_ID>` để kiểm tra nhanh.
- **Email (SMTP):** điền `SMTP_HOST/PORT/USER/PASS/FROM` trong `.env` hoặc Vercel environment variables.
- **Zalo:** 📖 Xem [ZALO_SETUP.md](./ZALO_SETUP.md) - (chưa triển khai) Dự kiến tích hợp Zalo OA API hoặc ZNS.

Kênh nào không cấu hình sẽ tự bỏ qua. Bấm **Gửi thử** trong `/settings` để kiểm tra.

## Ghi chú kỹ thuật

- Múi giờ tính theo `APP_TIMEZONE` (mặc định `Asia/Ho_Chi_Minh`). Mốc chốt ngày: **23:00**.
- Trạng thái ngày: `completed` / `missing_morning` / `missing_evening` / `missing_both` (ngày chưa qua 23:00 = `pending`).
- Schema thiết kế sẵn cho **nhiều thuốc** (bảng `medicines`), UI hiện hỗ trợ thêm/sửa nhiều thuốc trong `/settings`.
- PDF dùng font **Roboto** (nhúng base64) để hiển thị tiếng Việt chuẩn.
- Backup dữ liệu: Supabase Dashboard → Database → Backups.
- **Nhắc nhở thông minh:** Tự động gửi thông báo sau 1 giờ nếu chưa uống thuốc. **Không cần cấu hình gì khi thay đổi giờ uống!** Xem [SMART_REMINDER.md](./SMART_REMINDER.md).
