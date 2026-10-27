---
name: qa-qc
description: >-
  Phòng Kiểm Soát Chất Lượng (QA-QC) - Kiểm tra quy trình và kết quả đầu ra của tất cả
  các phòng ban theo checklist nghiêm ngặt (kiểm tra chống trùng lặp hình ảnh 1:1,
  độ đa dạng góc chụp, và tính đồng bộ vị trí/kích thước Logo 11 SPORT trên ảnh & video),
  chấm điểm 1-10 (PASS/FAIL) tại Sheet QA_QC_Log.
---

# QA-QC (Phòng Kiểm Soát Chất Lượng)

Đọc và tuân thủ nghiêm ngặt quy định tại [`09-qa-qc.md`](../../agents/09-qa-qc.md) và [`company-workflow.md`](../../rules/company-workflow.md).

## Quy tắc bắt buộc khi chấm QA-QC
1. **Chống trùng lặp mã thiết kế / hình ảnh giữa các bài đăng**: Kiểm tra `Noi_Dung_Bai_Dang`, `Brief_Thiet_Ke` và `Lich_Dang_Bai`. Nếu chiến dịch có N bài đăng nhưng số lượng thiết kế/ảnh ít hơn N, hoặc có 2 bài đăng dùng chung 1 `Ma_Thiet_Ke` -> Phải đánh **FAIL** và bắt buộc tạo đủ N thiết kế riêng biệt.
2. **Chống trùng lặp bố cục & góc chụp trong Prompt tạo ảnh**: Nếu các dòng trong `Brief_Thiet_Ke` có mô tả bố cục hoặc prompt tạo ảnh na ná nhau (cùng góc chính diện, cùng bối cảnh) -> Phải đánh **FAIL** và yêu cầu đổi góc máy (Macro cận cảnh, Góc nghiêng hành động đập bóng, Góc Silhouette ngược sáng, Góc Flatlay phụ kiện...).
3. **Kiểm tra Đồng bộ Logo `11 SPORT` trên Hình ảnh & Video**:
   - Mọi hình ảnh thiết kế (`DES-*`) phải được đóng dấu Logo chính hãng từ `.agent/skills/design/resources/logo/` thông qua `stamp_logo.js` tại **Góc Trên Bên Phải (`top-right`)**, kích thước chiều rộng **`W = 19%`**, cách lề **`3.0% x 1.6%`**, đúng độ tương phản (Trắng trên nền tối, Đen trên nền sáng).
   - Mọi kịch bản Video (`VID-*`, khi được kích hoạt) phải ghi rõ lớp Watermark Logo ngang ở `top-right (W=19%, Margin=3%x1.6%)` và Outro Logo đứng ở `center (W=28%)`.
4. **Không tự ý bịa giá/khuyến mãi**: Bất kỳ con số ưu đãi nào chưa có xác nhận của CEO phải bắt sửa thành `[CẦN CEO XÁC NHẬN]`.
