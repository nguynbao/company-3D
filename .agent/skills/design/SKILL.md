---
name: design
description: >-
  Phòng Thiết Kế Đồ Họa (DESIGN) - Thiết kế poster, banner, ảnh carousel, thumbnail,
  story; bắt buộc 100% hình ảnh xuất ra luôn đạt chuẩn Chất Lượng Cao Ultra-HD (2K/4K,
  >= 2048px, Lossless 100%, sắc nét chuẩn Studio), đảm bảo tỷ lệ 1:1 (mỗi bài post 1 ảnh
  riêng biệt), đa dạng góc máy/bố cục, và đóng dấu đồng bộ 100% Bộ Nhận Diện Logo 11 SPORT
  (kích thước & vị trí cố định) tại Sheet Brief_Thiet_Ke.
---

# DESIGN (Phòng Thiết Kế Đồ Họa)

Đọc và tuân thủ nghiêm ngặt quy định tại [`05-design.md`](../../agents/05-design.md) và [`company-workflow.md`](../../rules/company-workflow.md).

## 1. Quy Chuẩn Bắt Buộc Về Chất Lượng Hình Ảnh Cao Cấp (`ALWAYS HIGH-RESOLUTION ULTRA-HD 2K/4K`)
Phòng `DESIGN` chịu trách nhiệm đảm bảo **100% ấn phẩm hình ảnh xuất ra luôn luôn là ảnh chất lượng cao nhất (Studio Commercial Master Quality)**, tuyệt đối không chấp nhận ảnh mờ, vỡ hạt, bệt màu hoặc độ phân giải thấp:

1. **Tiêu chuẩn Độ phân giải & Định dạng Đầu ra (`Output Resolution & Fidelity Spec`)**:
   - **Độ phân giải tối thiểu bắt buộc**: Cạnh dài nhất của mọi file ảnh xuất bản phải đạt **tối thiểu `2048px` (Chuẩn 2K/4K Ultra-HD)** trở lên:
     - Ảnh vuông (`1:1` Post/Carousel): Tối thiểu **`2048 x 2048 px`** (hoặc `2160 x 2160 px`).
     - Ảnh dọc (`9:16` Story/Reels/TikTok Cover): Tối thiểu **`1536 x 2730 px`** (hoặc `2160 x 3840 px`).
     - Ảnh chân dung (`3:4` / `4:5` Feed): Tối thiểu **`1536 x 2048 px`** (hoặc `1638 x 2048 px`).
     - Ảnh ngang (`16:9` Banner/YouTube Thumbnail): Tối thiểu **`2048 x 1152 px`** (hoặc `3840 x 2160 px`).
   - **Chất lượng nén (`Lossless / Maximum Quality 1.0`)**: Lưu file ở mức chất lượng tối đa `100% (Compression Factor = 1.0)` trên không gian màu chuẩn `sRGB IEC61966-2.1`, mật độ điểm ảnh chuẩn in ấn/thương mại.
2. **Công thức Prompt Nhiếp Ảnh Thương Mại Độ Nét Cao (`High-Fidelity Studio Prompt Formula`)**:
   - Khi viết `Prompt_Tao_Anh` và gọi công cụ `generate_image`, **BẮT BUỘC** phải đính kèm ảnh sản phẩm gốc của CEO vào `ImagePaths` (nếu có) và tích hợp cụm từ khóa khóa chất lượng quang học ở cuối mỗi prompt:
     > `"8K Ultra-HD commercial sports product photography, shot on Phase One XF IQ4 150MP medium format camera, 85mm f/2.8 macro prime lens, razor-sharp focus on product geometry and carbon fiber weave texture, studio three-point rim lighting, physically accurate ray-traced reflections, high dynamic range (HDR), zero motion blur on hero product, zero compression artifacts, uncompressed RAW studio master quality."`
   - **Cấm tuyệt đối**: Ảnh bị out nét chủ thể chính, bệt chi tiết bề mặt vợt/phụ kiện, biến dạng tỷ lệ sản phẩm, hoặc có chữ rác vô nghĩa do AI tự vẽ.
3. **Tự động Nâng Cấp Độ Phân Giải 2K (`CoreImage Lanczos Super-Resolution + Unsharp Mask`)**:
   - Khi ảnh thô sinh ra từ `generate_image` có kích thước gốc nhỏ hơn `2048px` (ví dụ `1024x1024px`), công cụ `stamp_logo.js` sẽ **tự động nâng cấp độ phân giải lên chuẩn `>= 2048px` (2K Ultra-HD)** bằng thuật toán nội suy quang học `CILanczosScaleTransform` kết hợp làm sắc nét vi mô `CIUnsharpMask` trước khi đóng dấu Logo `4574x1173px`.

## 2. Bộ Nhận Diện Logo Thương Hiệu (`11 SPORT - PICKLEBALL & MORE`) – CỐT LÕI BẮT BUỘC
Toàn bộ file Logo gốc độ phân giải siêu cao đã được chuẩn hóa (cắt sát vùng Alpha trong suốt) và lưu trực tiếp trong Skill tại thư mục [`resources/logo/`](resources/logo/) (đồng bộ tại `assets/brand_logo/`):
- **Logo Trắng Ngang (Mặc định cho nền tối & trung tính)**: `.agent/skills/design/resources/logo/11sport_logo_white_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Đen Ngang (Chỉ dùng cho nền rất sáng `Luminance >= 0.62`)**: `.agent/skills/design/resources/logo/11sport_logo_black_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Trắng Đứng (Dùng cho Badge trung tâm / Intro-Outro)**: `.agent/skills/design/resources/logo/11sport_logo_white_vertical.png` (`2921x2255px`, Alpha PNG)
- **Logo Đen Đứng (Dùng cho Badge trung tâm nền sáng)**: `.agent/skills/design/resources/logo/11sport_logo_black_vertical.png` (`2921x2255px`, Alpha PNG)
- **File Vector Gốc**: `11sport_logo_vector.ai` & `11sport_logo_vector.pdf`

## 3. Quy Chuẩn Đồng Bộ Logo & Cơ Chế Chống Chìm Nền Tuyệt Đối (`3-Pass Smart Contrast Shield`)
Để đảm bảo **mọi ấn phẩm hình ảnh xuất ra đều có Logo đồng bộ 100% về kích thước/vị trí VÀ các chi tiết bên dưới KHÔNG BAO GIỜ làm che mờ hay chìm mất Logo**, phòng `DESIGN` bắt buộc thực thi **Cơ chế Bảo vệ Logo 2 Tầng**:

### Tầng 1 – Quy hoạch Vùng Đệm Sạch Trong Thiết Kế & Prompt (`Prompt-Level Clean Corner Safe-Zone`)
- Khi viết `Prompt_Tao_Anh` và thiết kế bố cục (`Bo_Cuc`), **BẮT BUỘC khóa vùng Góc Trên Bên Phải (`Top-Right 25% Width x 12% Height`)** làm vùng đệm sạch (`Logo Safe Zone`):
  - Luôn chèn chỉ dẫn vào mọi Prompt: `"clean dark ambient vignette in the top-right 25%x12% corner zone for brand logo placement; strictly no bright lens flares, no flying sparks, no rackets, no text, and no cluttered background details in the top-right corner"`.
  - Không bao giờ đặt chữ tiêu đề, đầu vợt, quả bóng hay nguồn đèn pha chiếu thẳng vào góc trên bên phải.

### Tầng 2 – Lá Chắn Quang Học 3 Lớp Tự Động Tách Nền Trong `stamp_logo.js` (`3-Pass Optical Contrast Shield`)
Ngay cả khi bức ảnh bên dưới có chi tiết phức tạp hoặc tia sáng đi ngang qua góc phải, công cụ `stamp_logo.js` đã được lập trình sẵn **3 lớp bảo vệ quang học tự động** để Logo luôn nổi bật 100%:
1. **Thông số Kích thước & Vị trí cố định (`Locked Spec`)**:
   - **Vị trí chuẩn**: `top-right` (Góc trên bên phải).
   - **Khoảng cách cách lề (`Margin X` & `Margin Y`)**: Cách lề phải **`Margin X = 3.0% * Chiều rộng ảnh`**, cách lề trên **`Margin Y = 1.6% * Chiều cao ảnh`**.
   - **Kích thước chiều rộng Logo (`Width Ratio`)**: Đúng **`19%` chiều rộng khung hình** (`0.19 * Width`), giữ nguyên tỷ lệ gốc `3.90:1`.
2. **3 Lớp Tách Nền Tự Động (`3-Pass Isolation Stack`)**:
   - **Lớp 1 – `Adaptive Soft Radial Scrim` (Đệm Tương Phản Vignette Mềm)**: Hệ thống tự động đo độ nhiễu (`stdDev`) và các điểm chói (`maxLum` / `minLum`) ngay dưới vùng đặt Logo, từ đó phủ một lớp đệm Gradient hình elip phai mượt như hiệu ứng ống kính máy ảnh (`alpha 32% -> 68%` tự động tăng khi nền bên dưới có tia sáng hoặc chi tiết rối). Lớp đệm này làm dịu tức thì các chi tiết chói/nhiễu bên dưới mà không tạo khung hộp thô cứng.
   - **Lớp 2 – `Tight Contoured Edge Halo` (Viền Hào Quang Bám Sát Từng Nét Chữ)**: Tạo lớp viền bảo vệ ngược pha màu (`blur = 2.2px, alpha = 90%`, `offset = 0`) ôm khít từng nét mảnh của dòng chữ `"PICKLEBALL & MORE"` và biểu tượng `"11"`.
   - **Lớp 3 – `Directional Studio Elevation Shadow` (Bóng Đổ Chiều Sâu Studio)**: Tạo độ nổi 3D (`offset Y = -2px, blur = 6.5px`) tách hẳn Logo lên tầng trên cùng của thiết kế.
3. **Lệnh thực thi bắt buộc sau khi sinh ảnh**:
   ```bash
   node .agent/skills/design/scripts/stamp_logo.js --file <duong_dan_anh> --position top-right --mode auto
   # Hoặc chạy đồng loạt cho toàn bộ ấn phẩm chiến dịch:
   node .agent/skills/design/scripts/stamp_logo.js --all-campaign-assets
   ```

## 4. Bộ Module Kỹ Năng Chuyên Sâu Đã Tích Hợp Nội Bộ Trong Phòng `DESIGN`
Toàn bộ các bộ kỹ năng thiết kế & nâng cấp chất lượng hình ảnh hàng đầu từ GitHub đã được tích hợp trực tiếp làm module nội bộ của phòng `DESIGN` (không tách phòng ban ngoài):
1. **Module Siêu Phân Giải 2K/4K (`image-upscaling`)**: Xem [`references/image-upscaling/REFERENCE.md`](references/image-upscaling/REFERENCE.md) — Nội suy quang học `CoreImage Lanczos 2K` và pipeline nâng cấp 4K/8K không vỡ hạt.
2. **Module Tinh Chỉnh Quang Học & Chống Chìm Logo (`image-enhancer`)**: Xem [`references/image-enhancer/REFERENCE.md`](references/image-enhancer/REFERENCE.md) — Làm nét vi mô `CIUnsharpMask`, kiểm soát tương phản cục bộ và bảo vệ vùng đặt Logo.
3. **Module Triết Lý Mỹ Thuật & Bố Cục Poster (`canvas-design` - Anthropic)**: Xem [`references/canvas-design/REFERENCE.md`](references/canvas-design/REFERENCE.md) — Xây dựng phân cấp thị giác (90% Visual Impact, 10% Essential Typography), khoảng thở âm (Negative Space) và độ hoàn thiện thủ công chuẩn Studio.
4. **Module Nhiếp Ảnh AI Đa Phương Thức & Hệ Thống Nhận Diện (`ai-artist-multimodal`)**: Xem [`references/ai-artist-multimodal/REFERENCE.md`](references/ai-artist-multimodal/REFERENCE.md), [`references/brand-guidelines/REFERENCE.md`](references/brand-guidelines/REFERENCE.md), [`references/frontend-design/REFERENCE.md`](references/frontend-design/REFERENCE.md) — Hơn 55 phong cách thiết kế, 22 style Banner đa nền tảng ([`banner-design`](../../../.agents/skills/banner-design/SKILL.md)), hệ thống Design Tokens ([`design-system`](../../../.agents/skills/design-system/SKILL.md)) và [`ui-ux-pro-max`](../../../.agents/skills/ui-ux-pro-max/SKILL.md).

## 5. Quy Tắc Bắt Buộc Khi Làm Việc
1. **Đủ số lượng 1:1 theo bài post**: Có bao nhiêu bài đăng (`Ma_Bai`) thì phải tạo bấy nhiêu mã thiết kế (`Ma_Thiet_Ke`) và hình ảnh riêng biệt. Không được gán trùng 1 `Ma_Thiet_Ke` cho nhiều bài đăng.
2. **Đa dạng hóa Prompt & Góc chụp (Visual Diversity Matrix)**: Mỗi thiết kế phải khác biệt hoàn toàn về góc chụp (Silhouette Teaser, Hero 3/4 Launch, Macro Tech Infographic, High-Speed Ball Impact Action, 60:40 Gamified Podium, Lifestyle Courtside Flatlay).
3. **Tuân thủ thông tin**: Không tự ý đưa mức giảm giá/quà tặng chưa được CEO xác nhận lên ảnh (ghi `[CẦN CEO XÁC NHẬN]`).
