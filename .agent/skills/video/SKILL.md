---
name: video
description: >-
  Phòng Sản Xuất Video (VIDEO) - Gồm VIDEO-LEAD, VIDEO-EDITOR, VIDEO-MOTION, VIDEO-AUDIO,
  VIDEO-COLOR; tích hợp đồng bộ Bộ Nhận Diện Logo 11 SPORT (Watermark góc cố định +
  Outro Logo đứng) và xuất kịch bản dựng chi tiết theo timecode tại Sheet Kich_Ban_Dung_Video.
---

# VIDEO (Phòng Sản Xuất Video)

Đọc và tuân thủ quy định tại [`06-video.md`](../../agents/06-video.md) và [`company-workflow.md`](../../rules/company-workflow.md).

## 1. Bộ Nhận Diện Logo Thương Hiệu (`11 SPORT - PICKLEBALL & MORE`) Cho Video Editor & Motion
Toàn bộ file Logo gốc đã được chuẩn hóa (cắt sát vùng Alpha trong suốt) và lưu trực tiếp trong Skill tại thư mục [`resources/logo/`](resources/logo/) (đồng bộ tại `assets/brand_logo/`):
- **Logo Trắng Ngang (Watermark xuyên suốt trên nền tối)**: `.agent/skills/video/resources/logo/11sport_logo_white_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Đen Ngang (Watermark xuyên suốt trên nền sáng)**: `.agent/skills/video/resources/logo/11sport_logo_black_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Trắng Đứng (End-screen / Outro khóa thương hiệu nền tối)**: `.agent/skills/video/resources/logo/11sport_logo_white_vertical.png` (`2921x2255px`, Alpha PNG)
- **Logo Đen Đứng (End-screen / Outro khóa thương hiệu nền sáng)**: `.agent/skills/video/resources/logo/11sport_logo_black_vertical.png` (`2921x2255px`, Alpha PNG)
- **File Vector Gốc**: `11sport_logo_vector.ai` & `11sport_logo_vector.pdf`

## 2. Quy Chuẩn Đồng Bộ Logo Trên Video (`VIDEO-EDITOR` & `VIDEO-MOTION` Bắt Buộc Tuân Thủ)
Để đồng bộ 100% về kích thước và vị trí với các ấn phẩm hình ảnh của phòng `DESIGN`, mọi video và thumbnail/frame video xuất ra phải áp dụng **đúng 2 lớp Logo cố định**:
1. **Lớp 1 – Watermark Logo Ngang Xuyên Suốt Video (`00:00` → Phân đoạn trước Outro)**:
   - **File sử dụng**: `11sport_logo_white_horizontal.png` (nền tối) hoặc `11sport_logo_black_horizontal.png` (nền sáng).
   - **Vị trí cố định**: **Góc Trên Bên Phải (`top-right`)** — trùng khớp 100% với vị trí trên ảnh của phòng `DESIGN`.
   - **Khoảng cách cách lề (`Margin`)**: `Margin X = 3.0% * Chiều rộng video`, `Margin Y = 1.6% * Chiều cao video` (VD trên khung `1080x1920`: cách lề phải `32px`, cách lề trên `31px`).
   - **Kích thước cố định (`Width Ratio`)**: Chiều rộng = đúng **`19%` chiều rộng khung hình** (`0.19 * Width`, tức `205px` trên khung `1080px`), độ mờ `Opacity = 95%`.
2. **Lớp 2 – Outro / End-Screen Logo Đứng Khóa Thương Hiệu (Phân đoạn CTA cuối video)**:
   - **File sử dụng**: `11sport_logo_white_vertical.png` (nền tối) hoặc `11sport_logo_black_vertical.png` (nền sáng).
   - **Vị trí cố định**: **Chính Giữa Khung Hình (`Center`, `X = 50%`, `Y = 42%`)**, phía trên dòng chữ CTA cuối video.
   - **Kích thước cố định**: Chiều rộng = đúng **`28%` chiều rộng khung hình** (`0.28 * Width`, tức `302px` trên khung `1080px`), hiệu ứng xuất hiện `Scale Pop-in + Neon Glow (0.3s)`.
3. **Công cụ đóng dấu Logo cho Thumbnail / Keyframe Video**:
   ```bash
   node .agent/skills/video/scripts/stamp_logo.js --file <duong_dan_frame_hoac_thumbnail> --position top-right --mode auto
   ```

## 3. Đầu Ra Bắt Buộc
Xuất dữ liệu TSV cho `### SHEET: Kich_Ban_Dung_Video` với các cột:
`Ma_Video | Phan_Doan | Timecode_Bat_Dau | Timecode_Ket_Thuc | Clip_Nguon | Cat_Tu_Den | Hieu_Ung_Transition | Chu_Phu_De | Nhac_Am_Thanh | Ty_Le | Ten_File_Xuat | Nhan_Vien_Phu_Trach | Trang_Thai`
- Trong cột `Clip_Nguon` và `Hieu_Ung_Transition`, `VIDEO-EDITOR` và `VIDEO-MOTION` **BẮT BUỘC** phải ghi rõ thông số chèn lớp Watermark `11sport_logo_white_horizontal.png (top-right, W=19%, Margin=3%x1.6%)` và Outro `11sport_logo_white_vertical.png (center, W=28%)`.
