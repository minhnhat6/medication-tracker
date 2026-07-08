# Medication Tracker - Product Requirements Document (PRD)

> Version: 1.1  
> Personal Web Application (PWA)

# 1. Mục tiêu

Xây dựng website cá nhân để:

- Theo dõi việc uống thuốc 2 lần/ngày.
- Không bỏ sót liều.
- Ghi nhận các lần phát bệnh.
- Theo dõi diễn biến lâu dài.
- Hỗ trợ tái khám bằng báo cáo.

---

# 2. Đối tượng sử dụng

- Một người dùng duy nhất.
- Không cần đăng ký hay đăng nhập.

---

# 3. Quản lý thuốc

Hiện tại:

- 1 loại thuốc
- Giờ uống sáng
- Giờ uống tối
- Liều lượng

Thiết kế DB cho phép mở rộng nhiều thuốc.

---

# 4. Dashboard

Hiển thị:

- Ngày hiện tại
- Trạng thái sáng/tối
- Tiến độ
- Lần uống tiếp theo
- Banner cảnh báo
- Banner phát bệnh hôm nay

Một chạm để xác nhận uống thuốc.

---

# 5. Nhắc uống thuốc

Đúng giờ:

- ✅ Đã uống
- ⏰ Nhắc lại sau 10 phút

23:00 kiểm tra:

Nếu thiếu bất kỳ liều nào:

- Web Push
- Telegram
- Email (tùy chọn)

---

# 6. Lịch sử uống thuốc

Lưu:

- Ngày
- Giờ uống sáng
- Giờ uống tối
- Trạng thái:
  - completed
  - missing_morning
  - missing_evening
  - missing_both

---

# 7. Calendar

Hiển thị:

- 🟢 Đủ thuốc
- 🔴 Thiếu thuốc
- ⚡ Có phát bệnh

---

# 8. Statistics

- Tỷ lệ hoàn thành
- Ngày bỏ thuốc
- Streak
- Tổng số lần phát bệnh
- Khoảng thời gian không phát bệnh

---

# 9. Episode Tracker

Thông tin:

- Thời gian
- Thời lượng
- Mức độ
- Địa điểm
- Ghi chú

Tự động liên kết với trạng thái uống thuốc của ngày đó.

---

# 10. Timeline

Ví dụ:

07:05 ✅ Uống sáng

14:32 ⚡ Phát bệnh

21:03 ✅ Uống tối

Có bộ lọc theo ngày/tuần/tháng.

---

# 11. Lịch sử thay đổi thuốc

Lưu:

- Ngày thay đổi
- Thuốc
- Liều lượng
- Lý do
- Ghi chú bác sĩ

---

# 12. Hồ sơ khám bệnh

Đính kèm:

- Đơn thuốc
- PDF
- Ảnh
- EEG
- MRI
- CT
- Phiếu khám

---

# 13. Export Report

Xuất:

- Excel (.xlsx)
- PDF

Bộ lọc:

- 7 ngày
- 30 ngày
- 3 tháng
- 6 tháng
- 1 năm
- Tùy chọn
- Toàn bộ

Bao gồm:

- Lịch sử uống thuốc
- Nhật ký phát bệnh
- Timeline
- Thống kê
- Biểu đồ
- Thông tin thay đổi thuốc

---

# 14. Database

## medicines

- id
- name
- dosage
- morning_time
- evening_time

## medication_logs

- id
- medicine_id
- date
- morning_taken
- morning_taken_at
- evening_taken
- evening_taken_at
- status

## episodes

- id
- episode_time
- duration
- severity
- location
- notes

## medication_changes

- id
- medicine_name
- dosage
- change_date
- reason
- notes

## medical_documents

- id
- title
- category
- file_url
- visit_date
- notes

---

# 15. API

GET /dashboard/today

POST /logs/morning

POST /logs/evening

GET /logs

GET /calendar

GET /statistics

GET /timeline

CRUD /episodes

CRUD /medication-changes

CRUD /documents

POST /export/pdf

POST /export/excel

---

# 16. Tech Stack

Frontend

- Next.js
- React
- TypeScript
- TailwindCSS
- PWA

Backend

- ASP.NET Core hoặc NestJS

Database

- PostgreSQL

Scheduler

- Cron

Notification

- Web Push
- Telegram
- Email

---

# 17. Non-functional

- Responsive
- Dark Mode
- Offline (PWA)
- Backup
- Nhanh
- Mở rộng dễ

---

# 18. Mục tiêu cuối

Người dùng mở website là biết:

- Đã uống thuốc chưa.
- Có bỏ sót liều không.
- Khi nào phát bệnh.
- Sau đổi thuốc tình trạng có cải thiện không.
- Có thể xuất báo cáo đầy đủ cho bác sĩ.
