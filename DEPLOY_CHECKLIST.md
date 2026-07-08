# Deployment Checklist ✅

## Pre-Deploy (Local)

- [ ] Copy `.env.example` → `.env`
- [ ] Supabase: tạo project → lấy `DATABASE_URL` + `DIRECT_URL`
- [ ] Supabase: tạo bucket `medical-documents` (public)
- [ ] Supabase: lấy `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Điền vào `.env` local
- [ ] `npm run db:push` → verify tables created
- [ ] `npm run db:seed` → 1 thuốc demo
- [ ] `npm run dev` → test local app hoạt động
- [ ] `npm run build` → verify build thành công

## Git + GitHub

- [ ] `git init` (nếu chưa có)
- [ ] `.gitignore` có chứa `.env` (đã có sẵn)
- [ ] `git add . && git commit -m "Initial commit"`
- [ ] Tạo GitHub repo
- [ ] `git remote add origin <URL>`
- [ ] `git push -u origin main`

## Vercel Deploy

- [ ] Login [vercel.com](https://vercel.com) with GitHub
- [ ] New Project → Import repo
- [ ] **Configure Project** → **Environment Variables**:
  - [ ] `DATABASE_URL`
  - [ ] `DIRECT_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_STORAGE_BUCKET=medical-documents`
  - [ ] `APP_TIMEZONE=Asia/Ho_Chi_Minh`
  - [ ] `CRON_SECRET=<random string>`
  - [ ] (Optional) Telegram/Email/VAPID keys
- [ ] **Deploy** → đợi 2-3 phút
- [ ] Visit URL → verify app hoạt động

## Post-Deploy Verification

- [ ] Dashboard hiện dữ liệu (thuốc demo)
- [ ] Đánh dấu sáng/tối → reload → trạng thái lưu
- [ ] `/settings` → thêm thuốc mới
- [ ] `/episodes/new` → ghi phát bệnh
- [ ] `/documents` → upload file → verify Supabase Storage
- [ ] Test cron thủ công: `curl -X POST <URL>/api/cron/smart-reminder -H "Authorization: Bearer <CRON_SECRET>"`
- [ ] (Optional) Test Telegram notification

## Optional

- [ ] Custom domain (Vercel Settings → Domains)
- [ ] Setup monitoring (Vercel Analytics)
- [ ] Invite teammates (Vercel Team)

---

**Chi tiết đầy đủ:** xem `DEPLOY.md`
