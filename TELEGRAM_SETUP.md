# Hướng dẫn cấu hình Telegram Bot

## Bước 1: Tạo Bot với BotFather

1. Mở Telegram, tìm và chat với [@BotFather](https://t.me/BotFather)
2. Gửi lệnh `/newbot`
3. BotFather sẽ hỏi tên bot của bạn (ví dụ: "Medication Reminder")
4. Tiếp theo nhập username cho bot (phải kết thúc bằng `bot`, ví dụ: `my_medication_bot`)
5. BotFather sẽ trả về **Bot Token** có dạng:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789
   ```
6. **LƯU LẠI TOKEN NÀY** - đây là `TELEGRAM_BOT_TOKEN`

## Bước 2: Lấy Chat ID của bạn

### Cách 1: Dùng userinfobot (Đơn giản nhất)
1. Tìm và chat với [@userinfobot](https://t.me/userinfobot)
2. Bấm **Start** hoặc gửi bất kỳ tin nhắn nào
3. Bot sẽ trả về thông tin của bạn, trong đó có **Id** (con số này là Chat ID của bạn)
   ```
   Id: 123456789
   ```

### Cách 2: Dùng bot vừa tạo
1. Tìm bot bạn vừa tạo (theo username, ví dụ: @my_medication_bot)
2. Bấm **Start** hoặc gửi tin nhắn `/start`
3. Mở trình duyệt và truy cập:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
   Thay `<YOUR_BOT_TOKEN>` bằng token ở Bước 1
4. Tìm trong JSON response trường `"from":{"id":123456789}` - con số đó là Chat ID

### Cách 3: Dùng API trực tiếp (Terminal)
```bash
# Thay YOUR_BOT_TOKEN bằng token thật
curl -s "https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates" | jq '.result[0].message.from.id'
```

## Bước 3: Cấu hình trong ứng dụng

### A. Cấu hình server (bắt buộc)
Thêm vào file `.env` (local) hoặc Vercel Environment Variables:
```env
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789"
```

### B. Cấu hình trong UI (khuyến nghị)
1. Mở ứng dụng, vào **Settings** (`/settings`)
2. Scroll xuống phần **"Cấu hình kênh thông báo"**
3. Tìm card **💬 Telegram**
4. Bật checkbox **"Bật"**
5. Nhập **Chat ID** (con số từ Bước 2, ví dụ: `123456789`)
6. Bấm **"💾 Lưu cấu hình thông báo"**

## Bước 4: Kiểm tra

1. Trong trang Settings, bấm nút **"Gửi thử"**
2. Bạn sẽ nhận được tin nhắn test từ bot trên Telegram
3. Nếu không nhận được:
   - Kiểm tra lại Bot Token trong `.env`
   - Kiểm tra lại Chat ID
   - Đảm bảo đã bấm **Start** với bot

## Lưu ý quan trọng

✅ **Bảo mật Bot Token**: Không commit token vào Git, không share công khai

✅ **Nhiều người dùng**: Nếu muốn gửi cho nhiều người, lấy Chat ID của từng người và lưu riêng (hiện app chỉ hỗ trợ 1 Chat ID)

✅ **Bot phải được Start**: Telegram không cho phép bot gửi tin đến người dùng nếu người đó chưa bấm Start

## Ví dụ hoàn chỉnh

File `.env`:
```env
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz123456789"
```

Trong UI Settings → Telegram:
- ☑️ Bật
- Chat ID: `123456789`

Khi 23:00 mỗi ngày, nếu bạn quên uống thuốc, bot sẽ tự động gửi tin nhắn nhắc nhở! 💊
