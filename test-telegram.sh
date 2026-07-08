#!/bin/bash

# Script test Telegram Bot
# Sử dụng: ./test-telegram.sh <BOT_TOKEN> <CHAT_ID>

set -e

if [ $# -ne 2 ]; then
  echo "❌ Sử dụng: $0 <BOT_TOKEN> <CHAT_ID>"
  echo ""
  echo "Ví dụ:"
  echo "  $0 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz 123456789"
  echo ""
  echo "📖 Hướng dẫn:"
  echo "  1. Lấy BOT_TOKEN từ @BotFather"
  echo "  2. Lấy CHAT_ID từ @userinfobot"
  echo "  3. Chạy script này để test"
  exit 1
fi

BOT_TOKEN="$1"
CHAT_ID="$2"

echo "🤖 Testing Telegram Bot..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Bot Token: ${BOT_TOKEN:0:20}..."
echo "Chat ID: $CHAT_ID"
echo ""

# Test 1: Kiểm tra bot có hợp lệ không
echo "📡 Test 1: Kiểm tra Bot Token..."
BOT_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getMe")

if echo "$BOT_INFO" | grep -q '"ok":true'; then
  BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
  BOT_NAME=$(echo "$BOT_INFO" | grep -o '"first_name":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Bot hợp lệ!"
  echo "   Tên: $BOT_NAME"
  echo "   Username: @$BOT_USERNAME"
else
  echo "❌ Bot Token không hợp lệ!"
  echo "$BOT_INFO" | jq .
  exit 1
fi

echo ""

# Test 2: Gửi tin nhắn test
echo "📤 Test 2: Gửi tin nhắn test..."
MESSAGE="🔔 Test Notification

Đây là tin nhắn test từ Medication Tracker!

✅ Nếu bạn nhận được tin nhắn này, cấu hình đã thành công!

⏰ Từ giờ bạn sẽ nhận thông báo lúc 23:00 mỗi ngày nếu quên uống thuốc."

RESULT=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": \"${CHAT_ID}\",
    \"text\": \"${MESSAGE}\",
    \"parse_mode\": \"HTML\"
  }")

if echo "$RESULT" | grep -q '"ok":true'; then
  echo "✅ Tin nhắn đã được gửi thành công!"
  echo ""
  echo "📱 Kiểm tra Telegram của bạn để xem tin nhắn."
else
  echo "❌ Không thể gửi tin nhắn!"
  ERROR_DESC=$(echo "$RESULT" | grep -o '"description":"[^"]*"' | cut -d'"' -f4)
  echo "   Lỗi: $ERROR_DESC"
  echo ""
  echo "💡 Các lỗi thường gặp:"
  echo "   - 'chat not found': Bạn chưa bấm Start với bot"
  echo "   - 'Unauthorized': Bot Token sai"
  echo "   - 'Bad Request': Chat ID sai"
  echo ""
  echo "🔧 Khắc phục:"
  echo "   1. Tìm bot @$BOT_USERNAME trên Telegram"
  echo "   2. Bấm Start"
  echo "   3. Chạy lại script này"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Tất cả test đã pass!"
echo ""
echo "📝 Tiếp theo, thêm vào file .env:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TELEGRAM_BOT_TOKEN=\"$BOT_TOKEN\""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Sau đó vào http://localhost:3000/settings"
echo "   → Telegram → Bật → Nhập Chat ID: $CHAT_ID → Lưu"
echo ""
echo "✅ Hoàn tất!"
