# Hướng dẫn cấu hình Zalo (Tính năng đang phát triển)

## ⚠️ Trạng thái hiện tại

**Tính năng Zalo chưa được triển khai hoàn toàn.** UI đã có sẵn để chuẩn bị, nhưng backend chưa kết nối với Zalo API.

Để gửi thông báo qua Zalo, cần tích hợp một trong các dịch vụ sau:

## 🎯 Các phương án tích hợp Zalo

### Phương án 1: Zalo Official Account (ZOA) + Zalo Notification Service (ZNS)

**Phù hợp với:** Ứng dụng chính thức, doanh nghiệp

#### Yêu cầu:
1. Đăng ký [Zalo Official Account](https://oa.zalo.me/)
2. Xác thực doanh nghiệp (cần giấy phép kinh doanh)
3. Đăng ký sử dụng [ZNS](https://zns.zalo.me/) (Zalo Notification Service)
4. Tạo template thông báo và chờ duyệt

#### Chi phí:
- **Miễn phí**: 500 tin/tháng (ZNS)
- **Trả phí**: Từ 290đ/tin nhắn (tùy loại template)

#### Các bước triển khai:

**1. Đăng ký ZOA:**
   - Truy cập https://oa.zalo.me/
   - Đăng nhập bằng tài khoản Zalo
   - Tạo Official Account mới
   - Xác thực (cá nhân hoặc doanh nghiệp)

**2. Tích hợp API:**
   ```bash
   npm install axios
   ```

**3. Lấy thông tin cấu hình:**
   - **OA ID**: Từ dashboard ZOA
   - **App ID** và **Secret Key**: Tạo tại ZOA → Cài đặt → Ứng dụng
   - **Access Token**: Lấy qua API OAuth

**4. Code mẫu (cần thêm vào `lib/notify.ts`):**
   ```typescript
   // lib/zalo.ts
   import axios from 'axios';

   export async function sendZaloZNS(phone: string, message: string): Promise<boolean> {
     const accessToken = process.env.ZALO_ACCESS_TOKEN;
     const templateId = process.env.ZALO_TEMPLATE_ID;
     
     if (!accessToken || !templateId) return false;

     try {
       const response = await axios.post(
         'https://business.openapi.zalo.me/message/template',
         {
           phone: phone,
           template_id: templateId,
           template_data: {
             message: message,
           },
         },
         {
           headers: {
             'access_token': accessToken,
             'Content-Type': 'application/json',
           },
         }
       );
       return response.data.error === 0;
     } catch (error) {
       console.error('Zalo ZNS error:', error);
       return false;
     }
   }
   ```

**5. Biến môi trường (.env):**
   ```env
   ZALO_APP_ID="your_app_id"
   ZALO_APP_SECRET="your_app_secret"
   ZALO_ACCESS_TOKEN="your_access_token"
   ZALO_TEMPLATE_ID="your_template_id"
   ZALO_OA_ID="your_oa_id"
   ```

**6. Tạo template thông báo:**
   - Vào ZNS Dashboard → Quản lý template
   - Tạo template mới cho "Nhắc uống thuốc"
   - Chờ duyệt (1-3 ngày làm việc)
   - Ví dụ template:
     ```
     [Nhắc uống thuốc]
     Xin chào {name},
     Bạn còn thiếu liều thuốc hôm nay:
     {missing_doses}
     
     Vui lòng uống thuốc đúng giờ để đảm bảo sức khỏe!
     ```

---

### Phương án 2: Zalo Mini App (Cho người dùng cá nhân)

**Phù hợp với:** Ứng dụng cá nhân, không có doanh nghiệp

#### Yêu cầu:
- Chuyển ứng dụng sang Zalo Mini App
- Người dùng phải cài đặt Mini App trong Zalo

#### Ưu điểm:
- ✅ Miễn phí hoàn toàn
- ✅ Không cần xác thực doanh nghiệp
- ✅ Gửi thông báo trực tiếp trong Zalo

#### Nhược điểm:
- ❌ Người dùng phải cài Mini App
- ❌ Phải viết lại UI cho Mini App
- ❌ Chỉ hoạt động trong Zalo, không phải web độc lập

---

### Phương án 3: SMS Gateway (Thay thế Zalo)

**Phù hợp với:** Nếu không muốn phức tạp với ZOA

Sử dụng dịch vụ SMS thay vì Zalo:
- [Twilio](https://www.twilio.com/) (quốc tế)
- [SMSAPI.vn](https://smsapi.vn/) (Việt Nam)
- [Vietguys](https://vietguys.biz/) (Việt Nam)

Chi phí: ~500-800đ/SMS

---

## 🚀 Roadmap triển khai Zalo cho app này

Để thêm hỗ trợ Zalo vào ứng dụng, cần:

### Phase 1: Chuẩn bị (Đã xong ✅)
- [x] UI cấu hình Zalo trong Settings
- [x] Database schema lưu `zaloPhone`, `zaloOaId`

### Phase 2: Backend (Cần làm)
- [ ] Đăng ký Zalo Official Account
- [ ] Tạo và duyệt template ZNS
- [ ] Implement `sendZaloZNS()` trong `lib/notify.ts`
- [ ] Thêm logic refresh Zalo access token
- [ ] Test gửi thông báo

### Phase 3: Production (Cần làm)
- [ ] Thêm biến môi trường Zalo vào Vercel
- [ ] Deploy và test
- [ ] Cập nhật docs

---

## 💡 Khuyến nghị hiện tại

**Cho ứng dụng cá nhân:**
- ✅ Dùng **Telegram** (đơn giản, miễn phí, đã hoạt động)
- ✅ Dùng **Email** (phổ biến, đã hoạt động)
- ⏳ Chờ Zalo được triển khai hoặc tự implement theo hướng dẫn trên

**Nếu cần Zalo ngay:**
1. Đăng ký ZOA theo Phương án 1
2. Implement code theo mẫu trên
3. Hoặc thuê developer tích hợp (ước tính 2-3 ngày)

---

## 📚 Tài liệu tham khảo

- [Zalo Official Account](https://oa.zalo.me/)
- [ZNS Documentation](https://developers.zalo.me/docs/api/zalo-notification-service-api)
- [Zalo API Documentation](https://developers.zalo.me/)
- [ZNS Pricing](https://zns.zalo.me/pricing)

---

## ❓ FAQ

**Q: Tại sao không dùng Zalo personal message?**  
A: Zalo không cho phép bot/app gửi tin nhắn cá nhân tự động. Chỉ có thể qua ZOA/ZNS chính thức.

**Q: Chi phí ZNS bao nhiêu?**  
A: 500 tin/tháng miễn phí, sau đó 290đ-600đ/tin tùy template.

**Q: Có thể test ZNS không?**  
A: Có, ZNS có sandbox environment để test miễn phí.

**Q: Cần bao lâu để duyệt template?**  
A: Thường 1-3 ngày làm việc, có thể nhanh hơn nếu template đơn giản.

---

🔥 **Nếu bạn cần hỗ trợ tích hợp Zalo, hãy cung cấp:**
1. Mục đích sử dụng (cá nhân hay doanh nghiệp)
2. Số lượng thông báo dự kiến/tháng
3. Có sẵn Zalo Official Account chưa

Tôi sẽ hướng dẫn cụ thể hơn! 🚀
