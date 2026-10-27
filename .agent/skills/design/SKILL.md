---
name: design
description: >-
  Phòng Thiết Kế Đồ Họa (DESIGN) - Thiết kế poster, banner, ảnh carousel, thumbnail,
  story; đảm bảo tỷ lệ 1:1 (mỗi bài post 1 ảnh riêng biệt), đa dạng góc máy/bố cục,
  và đóng dấu đồng bộ 100% Bộ Nhận Diện Logo 11 SPORT (kích thước & vị trí cố định)
  tại Sheet Brief_Thiet_Ke.
---

# DESIGN (Phòng Thiết Kế Đồ Họa)

Đọc và tuân thủ nghiêm ngặt quy định tại [`05-design.md`](../../agents/05-design.md) và [`company-workflow.md`](../../rules/company-workflow.md).

## 1. Bộ Nhận Diện Logo Thương Hiệu (`11 SPORT - PICKLEBALL & MORE`)
Toàn bộ file Logo gốc đã được chuẩn hóa (cắt sát vùng Alpha trong suốt) và lưu trực tiếp trong Skill tại thư mục [`resources/logo/`](resources/logo/) (đồng bộ tại `assets/brand_logo/`):
- **Logo Trắng Ngang (Mặc định cho nền tối)**: `.agent/skills/design/resources/logo/11sport_logo_white_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Đen Ngang (Mặc định cho nền sáng)**: `.agent/skills/design/resources/logo/11sport_logo_black_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Trắng Đứng (Dùng cho Badge trung tâm / Intro-Outro)**: `.agent/skills/design/resources/logo/11sport_logo_white_vertical.png` (`2921x2255px`, Alpha PNG)
- **Logo Đen Đứng (Dùng cho Badge trung tâm nền sáng)**: `.agent/skills/design/resources/logo/11sport_logo_black_vertical.png` (`2921x2255px`, Alpha PNG)
- **File Vector Gốc**: `11sport_logo_vector.ai` & `11sport_logo_vector.pdf`

## 2. Quy Chuẩn Đồng Bộ Logo Trên Mọi Hình Ảnh (Kích Thước & Vị Trí Cố Định 100%)
Để đảm bảo **mọi ấn phẩm hình ảnh xuất ra đều có Logo đồng bộ tuyệt đối về kích thước, tỷ lệ và vị trí**, phòng `DESIGN` phải tuân thủ 3 bước bắt buộc:
1. **Quy hoạch vùng trống an toàn (Logo Safe Zone) trong Prompt tạo ảnh**:
   - Luôn chừa vùng trống sạch sẽ, không đặt chữ/tiêu đề đè lên **Góc Trên Bên Phải (`Top-Right Corner`)** của bức ảnh.
2. **Thông số Kích thước & Vị trí cố định (`Locked Spec`)**:
   - **Vị trí chuẩn**: `top-right` (Góc trên bên phải).
   - **Khoảng cách cách lề (`Margin X` & `Margin Y`)**: Đúng **`4.5%` chiều rộng khung hình** (`0.045 * Width` — ví dụ cách lề phải `46px` và cách lề trên `46px` trên ảnh `1024px`).
   - **Kích thước chiều rộng Logo (`Width Ratio`)**: Đúng **`22%` chiều rộng khung hình** (`0.22 * Width`) đối với Logo ngang (`11sport_logo_white_horizontal.png` / `11sport_logo_black_horizontal.png`), giữ nguyên tỷ lệ gốc `3.90:1`.
   - **Tương phản tự động (`Auto-Contrast`)**: Nền tối (`Luminance < 0.58`) dùng **Logo Trắng**; nền sáng (`Luminance >= 0.58`) dùng **Logo Đen**, kèm bóng đổ bảo vệ (`Drop Shadow blur 10px`).
3. **BẮT BUỘC Chạy Script Đóng Dấu Logo Tự Động Sau Khi Sinh Ảnh**:
   - Ngay sau khi dùng `generate_image` lưu ảnh vào `assets/`, **BẮT BUỘC** chạy công cụ đóng dấu của Skill:
     ```bash
     node .agent/skills/design/scripts/stamp_logo.js --file <duong_dan_anh> --position top-right --mode auto
     # Hoặc chạy đồng loạt cho toàn bộ ấn phẩm chiến dịch:
     node .agent/skills/design/scripts/stamp_logo.js --all-campaign-assets
     ```
   - Không dựa vào AI tự vẽ chữ logo bằng tay vì AI có thể làm sai lệch font chữ hoặc lệch vị trí giữa các ảnh. Luôn dùng `stamp_logo.js` để ghép đúng file PNG chính hãng của `11 SPORT`.

## 3. Quy Tắc Bắt Buộc Khi Làm Việc
1. **Đủ số lượng 1:1 theo bài post**: Có bao nhiêu bài đăng (`Ma_Bai`) thì phải tạo bấy nhiêu mã thiết kế (`Ma_Thiet_Ke`) và hình ảnh riêng biệt. Không được gán trùng 1 `Ma_Thiet_Ke` cho nhiều bài đăng.
2. **Đa dạng hóa Prompt & Góc chụp (Visual Diversity Matrix)**: Mỗi thiết kế phải khác biệt hoàn toàn về góc chụp (Silhouette Teaser, Hero 3/4 Launch, Macro Tech Infographic, High-Speed Ball Impact Action, 60:40 Gamified Podium, Lifestyle Courtside Flatlay).
3. **Tuân thủ thông tin**: Không tự ý đưa mức giảm giá/quà tặng chưa được CEO xác nhận lên ảnh (ghi `[CẦN CEO XÁC NHẬN]`).
