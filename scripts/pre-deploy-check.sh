#!/bin/bash
# Pre-deployment verification script
# Chạy script này TRƯỚC KHI deploy lên Vercel để đảm bảo mọi thứ OK

set -e  # Exit on error

echo "🔍 Medication Tracker - Pre-Deploy Check"
echo "========================================"
echo ""

# Check .env exists
if [ ! -f .env ]; then
  echo "❌ File .env không tồn tại"
  echo "   → Copy từ .env.example: cp .env.example .env"
  exit 1
fi
echo "✅ .env exists"

# Check required env vars
required_vars=("DATABASE_URL" "DIRECT_URL" "NEXT_PUBLIC_SUPABASE_URL" "SUPABASE_SERVICE_ROLE_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
  if ! grep -q "^$var=" .env || grep -q "^$var=\"\"" .env || grep -q "^$var=xxxx" .env; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
  echo "❌ Thiếu env vars bắt buộc:"
  for var in "${missing_vars[@]}"; do
    echo "   - $var"
  done
  echo "   → Xem DEPLOY.md để lấy values từ Supabase"
  exit 1
fi
echo "✅ Required env vars filled"

# Check dependencies installed
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules chưa cài"
  echo "   → Chạy: npm install"
  exit 1
fi
echo "✅ node_modules installed"

# Check Prisma client generated
if [ ! -d "node_modules/@prisma/client" ]; then
  echo "❌ Prisma client chưa được generate"
  echo "   → Chạy: npx prisma generate"
  exit 1
fi
echo "✅ Prisma client generated"

# Check database connection
echo ""
echo "🔌 Testing database connection..."
if npx prisma db pull --schema=./prisma/schema.prisma 2>&1 | grep -q "Introspected"; then
  echo "✅ Database connection OK"
else
  echo "❌ Không kết nối được database"
  echo "   → Kiểm tra DATABASE_URL và DIRECT_URL trong .env"
  echo "   → Verify Supabase project đang chạy"
  exit 1
fi

# Check tables exist
echo ""
echo "📊 Checking database tables..."
table_count=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" 2>/dev/null | grep -oE '[0-9]+' | head -1 || echo "0")

if [ "$table_count" -lt 8 ]; then
  echo "⚠️  Database có $table_count tables (cần tối thiểu 8)"
  echo "   → Chạy: npm run db:push"
  echo "   → Sau đó chạy: npm run db:seed"
else
  echo "✅ Database có $table_count tables"
fi

# Build check
echo ""
echo "🏗️  Building project..."
if npm run build > /tmp/build.log 2>&1; then
  echo "✅ Build successful"
else
  echo "❌ Build failed:"
  tail -20 /tmp/build.log
  exit 1
fi

# Final summary
echo ""
echo "========================================"
echo "✅ ALL CHECKS PASSED"
echo ""
echo "📋 Next steps:"
echo "   1. Push to GitHub: git push origin main"
echo "   2. Import vào Vercel: vercel.com"
echo "   3. Thêm env vars vào Vercel (copy từ .env)"
echo "   4. Deploy!"
echo ""
echo "📖 Xem chi tiết: DEPLOY.md"
echo "========================================"
