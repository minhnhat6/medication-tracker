# Hướng dẫn Deploy lên Supabase + Vercel

## Phần 1: Setup Supabase (Database + Storage)

### 1.1 Tạo Project Supabase

1. Truy cập [supabase.com](https://supabase.com) → Sign in (hoặc tạo tài khoản mới)
2. **New Project**:
   - Project name: `medication-tracker` (hoặc tên bạn muốn)
   - Database Password: tạo password mạnh → **LƯU LẠI** (cần dùng sau)
   - Region: chọn `Southeast Asia (Singapore)` (gần Việt Nam nhất)
3. Đợi ~2 phút để project khởi tạo

### 1.2 Lấy Database Connection Strings

1. Vào project vừa tạo → **Settings** (icon bánh răng bên trái) → **Database**
2. Scroll xuống phần **Connection string** → chọn tab **URI**
3. **Copy 2 connection strings:**

   **Connection pooling (cho app):**
   ```
   postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
   → Đây là `DATABASE_URL`

   **Session mode (cho migration):**
   ```
   postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
   ```
   → Đây là `DIRECT_URL`

4. **Thay `[YOUR-PASSWORD]`** bằng password bạn vừa tạo ở bước 1.1
5. **LƯU 2 STRINGS NÀY** vào file `.env` local (tạo từ `.env.example`)

### 1.3 Tạo Storage Bucket (lưu hồ sơ y tế)

1. Trong Supabase project → **Storage** (sidebar bên trái)
2. **Create a new bucket**:
   - Name: `medical-documents`
   - Public bucket: **BẬT** (để có thể xem file qua URL)
3. **Create bucket**

### 1.4 Lấy Supabase API Keys

1. **Settings** → **API**
2. Copy 3 giá trị:
   - **Project URL**: `https://xxxx.supabase.co` → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API keys** → **anon public**: không cần (app này dùng service role)
   - **Project API keys** → **service_role**: `eyJhbG...` (**BÍ MẬT**, không commit vào git) → `SUPABASE_SERVICE_ROLE_KEY`

### 1.5 Push Database Schema lên Supabase

Từ máy local:

```bash
# Điền DATABASE_URL và DIRECT_URL vào .env
cp .env.example .env
nano .env  # hoặc code .env

# Push schema lên Supabase (tạo tất cả bảng)
npm run db:push

# Seed dữ liệu mặc định (1 thuốc demo)
npm run db:seed
```

Nếu thành công, bạn sẽ thấy:
```
✔ Generated Prisma Client
Your database is now in sync with your Prisma schema.
```

**Verify:** vào Supabase → **Table Editor** → kiểm tra các bảng đã được tạo:
- `Medicine`
- `MedicationLog`
- `Episode`
- `MedicationChange`
- `MedicalDocument`
- `NotificationSettings`
- `ReminderLog`
- `PushSubscription`

---

## Phần 2: Deploy lên Vercel

### 2.1 Push Code lên GitHub

```bash
# Khởi tạo Git (nếu chưa có)
git init
git add .
git commit -m "Initial commit - medication tracker"

# Tạo repo trên GitHub
# Truy cập github.com/new → tạo repo mới (ví dụ: medication-tracker)
# Copy URL: https://github.com/YOUR-USERNAME/medication-tracker.git

# Push lên GitHub
git remote add origin https://github.com/YOUR-USERNAME/medication-tracker.git
git branch -M main
git push -u origin main
```

### 2.2 Import Project vào Vercel

1. Truy cập [vercel.com](https://vercel.com) → Sign in with GitHub
2. **Add New** → **Project**
3. **Import Git Repository** → chọn repo `medication-tracker` vừa push
4. **Configure Project:**
   - Framework Preset: **Next.js** (tự detect)
   - Root Directory: `./` (mặc định)
   - Build Command: `npm run build` (mặc định)
   - **KHÔNG** deploy ngay, chọn **Environment Variables** trước

### 2.3 Thêm Environment Variables

Trong màn hình **Configure Project**, kéo xuống phần **Environment Variables**.

**Copy TOÀN BỘ từ file `.env` local** (đã điền đầy đủ ở bước 1.5), paste vào Vercel:

#### BẮT BUỘC (database + storage):
```
DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@...6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.xxxx:[PASSWORD]@...5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_STORAGE_BUCKET=medical-documents
APP_TIMEZONE=Asia/Ho_Chi_Minh
```

#### BẮT BUỘC (bảo vệ cron):
```
CRON_SECRET=<tạo random string, ví dụ: openssl rand -hex 32>
```

#### TÙY CHỌN (thông báo - xem TELEGRAM_SETUP.md):
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BP...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=app-password
SMTP_FROM=Medication Tracker <you@gmail.com>
```

**Lưu ý:**
- Mỗi biến **một dòng**: `KEY=value`
- **Không có dấu ngoặc** xung quanh value
- **service_role key** phải giữ bí mật (đừng commit vào GitHub)

### 2.4 Deploy

1. Sau khi thêm xong env vars → **Deploy**
2. Đợi ~2-3 phút (Vercel build + deploy)
3. Nếu thành công, bạn sẽ thấy:
   ```
   ✓ Deployment ready
   ```
4. Click vào URL (ví dụ: `medication-tracker-abc123.vercel.app`) → mở app

---

## Phần 3: Verify Deployment

### 3.1 Kiểm tra App hoạt động

1. Mở URL Vercel → dashboard "Hôm nay" hiện ra
2. Thử đánh dấu "Sáng" hoặc "Tối" → reload → trạng thái được lưu
3. Vào `/settings` → thử thêm thuốc mới
4. Vào `/episodes/new` → ghi nhận phát bệnh

### 3.2 Kiểm tra Cron Jobs (nhắc nhở)

Vercel Cron đã được config trong `vercel.json`:
- `/api/cron/smart-reminder` chạy **mỗi 30 phút** (nhắc nếu quên uống thuốc)
- `/api/cron/check` chạy lúc **23:00 VN** (kiểm tra cuối ngày)

**Test thủ công:**
```bash
# Từ local hoặc Postman
curl -X POST https://medication-tracker-abc123.vercel.app/api/cron/smart-reminder \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Nếu thành công, response:
```json
{
  "message": "Smart reminder check completed",
  "currentTime": "...",
  "notified": {...}
}
```

### 3.3 Kiểm tra Storage (upload file)

1. Vào `/documents` → **Thêm hồ sơ**
2. Upload 1 file PDF hoặc ảnh
3. Kiểm tra Supabase Storage → bucket `medical-documents` → file đã được upload

---

## Phần 4: Custom Domain (Tùy chọn)

1. Vercel Dashboard → chọn project → **Settings** → **Domains**
2. **Add Domain** → nhập domain của bạn (ví dụ: `thuoc.yourdomain.com`)
3. Làm theo hướng dẫn để config DNS (CNAME record)
4. Đợi ~1-5 phút → SSL tự động được cấp

---

## Troubleshooting

### Build failed: "DATABASE_URL is not defined"
→ Kiểm tra lại env vars trong Vercel Settings → đảm bảo `DATABASE_URL` và `DIRECT_URL` đã được thêm

### Prisma error: "Can't reach database"
→ Kiểm tra password trong connection string → đảm bảo đúng password từ Supabase

### Cron không chạy
→ Kiểm tra `CRON_SECRET` đã thêm vào Vercel env vars chưa
→ Vercel Cron **chỉ chạy trên production**, không chạy trên preview deployment

### Storage upload fail: "Invalid storage URL"
→ Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` đúng chưa
→ Kiểm tra bucket `medical-documents` đã tạo và bật **Public** chưa

### Dark mode không hoạt động
→ Đây là client-side preference, không liên quan deploy. Kiểm tra browser setting `prefers-color-scheme`.

---

## Bảo mật Production

- **KHÔNG commit** `.env` vào Git
- **service_role key** chỉ dùng server-side (Vercel env vars), không expose ra client
- **CRON_SECRET** đảm bảo cron endpoint không bị abuse
- Supabase Row Level Security (RLS) **đã TẮT** trong app này (single-user app). Nếu muốn multi-user, cần bật RLS.

---

## Maintenance

### Update code
```bash
git add .
git commit -m "Update: ..."
git push origin main
```
→ Vercel tự động deploy khi có commit mới lên `main`

### Backup database
Supabase → **Database** → **Backups** → tự động backup daily
Hoặc export thủ công: **Table Editor** → **...** → **Download as CSV**

### Monitor cron logs
Vercel Dashboard → project → **Logs** → filter `api/cron`

---

Xong! App giờ đã live trên internet. 🎉
