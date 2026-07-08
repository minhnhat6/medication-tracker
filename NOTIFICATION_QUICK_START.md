# 🚀 Hướng dẫn nhanh: Cấu hình thông báo

## 📱 Telegram (Khuyến nghị - Đơn giản & Miễn phí)

### 3 bước cơ bản:

**1. Tạo Bot**
- Mở Telegram → Tìm [@BotFather](https://t.me/BotFather)
- Gửi `/newbot`
- Đặt tên và username (kết thúc bằng `bot`)
- Lưu **Bot Token** nhận được

**2. Lấy Chat ID**
- Tìm [@userinfobot](https://t.me/userinfobot)
- Bấm Start
- Copy số **Id** hiển thị

**3. Cấu hình**
- Thêm vào `.env`:
  ```
  TELEGRAM_BOT_TOKEN="token_từ_bước_1"
  ```
- Vào app `/settings` → Telegram
  - ☑️ Bật
  - Nhập Chat ID từ bước 2
  - Lưu cấu hình
  - Bấm "Gửi thử" để test

✅ **Xong!** Bạn sẽ nhận thông báo trên Telegram mỗi 23:00 nếu quên uống thuốc.

---

## 📧 Email (Cần SMTP)

**Cấu hình `.env`:**
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Medication Tracker <your-email@gmail.com>"
```

**Trong UI:**
- Vào `/settings` → Email
- ☑️ Bật
- Nhập email nhận thông báo
- Lưu và gửi thử

💡 **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords

---

## 📲 Zalo (Đang phát triển - Phức tạp hơn)

### ⚠️ Hiện chưa hoạt động

**UI đã sẵn sàng**, nhưng cần:
1. Đăng ký [Zalo Official Account](https://oa.zalo.me/)
2. Xác thực doanh nghiệp (hoặc cá nhân có CMND/CCCD)
3. Đăng ký [ZNS](https://zns.zalo.me/) (Zalo Notification Service)
4. Tạo template thông báo → Chờ duyệt (1-3 ngày)
5. Implement backend code

**Chi phí:** 500 tin/tháng miễn phí, sau đó ~290đ/tin

**Khuyến nghị:** Dùng Telegram hoặc Email trước, chờ Zalo được triển khai.

📖 **Chi tiết:** Xem file `ZALO_SETUP.md`

---

## 🎯 So sánh nhanh

| Kênh | Độ khó | Chi phí | Trạng thái |
|------|--------|---------|------------|
| **Telegram** | ⭐ Dễ | 🆓 Miễn phí | ✅ Hoạt động |
| **Email** | ⭐⭐ Trung bình | 🆓 Miễn phí | ✅ Hoạt động |
| **Web Push** | ⭐ Dễ | 🆓 Miễn phí | ✅ Hoạt động |
| **Zalo** | ⭐⭐⭐⭐ Khó | 💰 Có phí | ⏳ Chưa có |

---

## 🆘 Cần trợ giúp?

**Telegram không nhận tin:**
- Kiểm tra Bot Token đúng chưa
- Đảm bảo đã bấm Start với bot
- Chat ID có đúng không

**Email không nhận:**
- Kiểm tra thư mục Spam
- Gmail: Cần dùng App Password, không phải mật khẩu thường
- Test SMTP settings bằng cách gửi thử

**Muốn test thủ công:**
- Vào `/settings`
- Bấm "Gửi thử"
- Hoặc "Kiểm tra thiếu liều ngay"

---

📚 **Tài liệu chi tiết:**
- `TELEGRAM_SETUP.md` - Hướng dẫn Telegram đầy đủ
- `ZALO_SETUP.md` - Roadmap và hướng dẫn Zalo
- `README.md` - Tổng quan dự án
