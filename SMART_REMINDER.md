# ✨ Nhắc nhở thông minh - Tự động hoàn toàn!

## 🎯 Giải pháp đơn giản

**Bạn KHÔNG CẦN làm gì thêm khi thay đổi giờ uống thuốc!**

### Cách hoạt động:

1. Hệ thống chạy **tự động mỗi 30 phút**
2. Kiểm tra xem đã đến giờ nhắc chưa (giờ uống + 1h)
3. Nếu đúng giờ VÀ chưa uống → Gửi thông báo
4. Tránh spam: Mỗi liều chỉ nhắc **1 lần/ngày**

### Ví dụ:

**Giờ uống sáng: 07:00**
- ⏰ Giờ nhắc: 08:00
- Cron chạy lúc 08:00, 08:30 → Nhắc lúc 08:00 (nếu chưa uống)
- Chỉ nhắc 1 lần, dù cron chạy 2 lần

**Thay đổi giờ uống → 09:00**
- ⏰ Giờ nhắc tự động: 10:00
- Không cần sửa code gì!
- Không cần deploy lại!

## 📋 So sánh với cách cũ:

| Tính năng | Cách cũ (check-morning/evening) | Cách mới (smart-reminder) |
|-----------|--------------------------------|---------------------------|
| Thay đổi giờ uống | ❌ Phải sửa `vercel.json` + deploy | ✅ Tự động, không làm gì |
| Độ chính xác | ✅ Chính xác tuyệt đối | ⚠️ Sai lệch tối đa 30 phút |
| Tần suất cron | 2 lần/ngày | 48 lần/ngày (mỗi 30 phút) |
| Chi phí Vercel | Thấp hơn | Cao hơn một chút |

## ⚙️ Cấu hình (đã xong sẵn)

File `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/smart-reminder",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

- `*/30 * * * *` = Mỗi 30 phút
- Chạy lúc: 00:00, 00:30, 01:00, 01:30, ...

## 🧪 Test thủ công:

```bash
curl -X POST http://localhost:3000/api/cron/smart-reminder
```

Response:
```json
{
  "currentTime": "08:15",
  "date": "2026-07-08",
  "reminders": ["Thuốc chính (liều sáng 07:00)"],
  "notified": { "telegram": true },
  "message": "Đã gửi nhắc nhở cho 1 liều",
  "checks": [
    {
      "medicine": "Thuốc chính",
      "morningTime": "07:00",
      "eveningTime": "19:30",
      "morningReminderTime": "08:00",
      "eveningReminderTime": "20:30",
      "currentTime": "08:15",
      "isTimeToRemindMorning": true,
      "isTimeToRemindEvening": false,
      "morningTaken": false,
      "eveningTaken": false
    }
  ]
}
```

## 📱 Trong UI:

Vào `/settings` → **"⏰ Lịch nhắc nhở tự động"**

Bạn sẽ thấy:
- Giờ uống hiện tại
- Giờ nhắc (tự động tính = giờ uống + 1h)
- **Không có cảnh báo phức tạp nữa!**

## ❓ FAQ

**Q: Tại sao không nhắc đúng giờ mà lệch vài phút?**

A: Cron chạy mỗi 30 phút, nên có thể nhắc muộn tối đa 29 phút. Ví dụ:
- Giờ nhắc: 08:00
- Cron chạy: 08:30
- Bạn nhận nhắc lúc 08:30 (muộn 30 phút)

Nếu muốn chính xác hơn → Đổi thành chạy mỗi 15 phút: `*/15 * * * *`

---

**Q: Có tốn thêm chi phí Vercel không?**

A: Có, nhưng không đáng kể:
- Cách cũ: 2 cron jobs/ngày
- Cách mới: 48 cron jobs/ngày
- Vercel Free: 100 cron executions/day → Vẫn đủ!

---

**Q: Nếu tôi uống thuốc sau khi đã nhắc thì sao?**

A: Không vấn đề gì! Hệ thống chỉ nhắc **1 lần/ngày** cho mỗi liều. Dù bạn uống sau khi nhắc, ngày hôm sau sẽ nhắc lại bình thường.

---

**Q: Có thể tắt tính năng này không?**

A: Có, xóa cron job trong `vercel.json`:
```json
{
  "crons": [
    // Xóa dòng smart-reminder
    {
      "path": "/api/cron/check",
      "schedule": "0 16 * * *"
    }
  ]
}
```

## 🎉 Tóm lại:

✅ **Thay đổi giờ uống thuốc trong `/settings`** → Xong!

✅ Không cần sửa code

✅ Không cần deploy

✅ Tự động 100%

---

**Cách cũ vẫn hoạt động:** Nếu muốn dùng lại, xem `REMINDER_1HOUR.md`
