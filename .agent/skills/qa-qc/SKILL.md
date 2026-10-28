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
3. **Kiểm tra Chất lượng Hình ảnh Cao Cấp Ultra-HD (`>= 2048px`, Lossless 100%) cho `DESIGN` & `VIDEO-EDITOR`**:
   - Mọi file ảnh thiết kế (`DES-*`) và ảnh tĩnh/keyframe/thumbnail trong video (`VID-*`) **BẮT BUỘC đạt độ phân giải tối thiểu `>= 2048px` (Chuẩn 2K/4K Ultra-HD)**, sắc nét chuẩn Studio, không bị vỡ hạt, không nhòe mờ chủ thể hoặc suy giảm chất lượng nén. Nếu ảnh có kích thước `< 2048px` hoặc bị mờ/vỡ nét -> Phải đánh **FAIL** và yêu cầu nâng cấp độ phân giải qua `stamp_logo.js` hoặc kết xuất lại ngay.
4. **Kiểm tra Đồng bộ Logo `11 SPORT` & Chống Chìm Nền (`3-Pass Contrast Shield`) trên Hình ảnh & Video**:
   - Mọi hình ảnh thiết kế (`DES-*`) phải được đóng dấu Logo chính hãng từ `.agent/skills/design/resources/logo/` thông qua `stamp_logo.js` tại **Góc Trên Bên Phải (`top-right`)**, kích thước chiều rộng **`W = 19%`**, cách lề **`3.0% x 1.6%`**, có lớp đệm tách nền **`3-Pass Optical Contrast Shield` (`Adaptive Radial Scrim + Contoured Halo + Drop Shadow`)** và vùng góc phải trong Prompt không bị vật thể/tia sáng chói hay chữ đè lên làm mờ Logo. Nếu Logo bị chìm vào nền hoặc bị che khuất -> Phải đánh **FAIL** ngay lập tức.
   - Mọi kịch bản Video (`VID-*`, khi được kích hoạt) phải ghi rõ chuẩn chất lượng `2K/4K Ultra-HD, 60fps High-Bitrate` cùng lớp Watermark Logo ngang ở `top-right (W=19%, Margin=3%x1.6%, + Soft Radial Contrast Scrim & Halo)` và Outro Logo đứng ở `center (W=28%, + Backdrop Blur Dimming)`.
4b. **Kiểm tra Video v2 (khi VIDEO được kích hoạt)** theo checklist tại `.agent/skills/video/references/transitions-focus/REFERENCE.md`: (a) có đủ chuyển cảnh (≥ 1 / 4–6s) và hiệu ứng focus chủ thể (punch-in 3s đầu, spotlight/freeze cho sản phẩm); (b) sub chỉ ý chính (≤ 5 từ/cụm), khớp audio ≤ 3 frame, màu tương phản ≥ 4.5:1 so với nền, đúng 1 kiểu/video; (c) info card hiện 1,5–2,5s có animation, không đứng cứng cả phân cảnh; (d) thumbnail 9:16 đúng template khóa cứng (`thumbnail_template.json`) + logo `top-right`. Thiếu bất kỳ mục nào -> **FAIL**.
5. **Không tự ý bịa giá/khuyến mãi**: Bất kỳ con số ưu đãi nào chưa có xác nhận của CEO phải bắt sửa thành `[CẦN CEO XÁC NHẬN]`.
