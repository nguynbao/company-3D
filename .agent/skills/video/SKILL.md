---
name: video
description: >-
  Phòng Sản Xuất Video (VIDEO) - Gồm VIDEO-LEAD, VIDEO-EDITOR, VIDEO-MOTION, VIDEO-AUDIO,
  VIDEO-COLOR; bắt buộc 100% hình ảnh tĩnh/keyframe/thumbnail/overlay đưa vào video và
  frame xuất ra luôn đạt chuẩn Chất Lượng Cao Ultra-HD (2K/4K, >= 2048px, Lossless,
  High-Bitrate 60fps), tích hợp đồng bộ Bộ Nhận Diện Logo 11 SPORT (Watermark góc cố định +
  Outro Logo đứng) và xuất kịch bản dựng chi tiết theo timecode tại Sheet Kich_Ban_Dung_Video.
---

# VIDEO (Phòng Sản Xuất Video)

Đọc và tuân thủ quy định tại [`06-video.md`](../../agents/06-video.md) và [`company-workflow.md`](../../rules/company-workflow.md).

## 1. Quy Chuẩn Bắt Buộc Về Chất Lượng Hình Ảnh & Kết Xuất Của `VIDEO-EDITOR` (`ALWAYS HIGH-QUALITY ULTRA-HD ASSETS & MASTERING`)
Đội ngũ `VIDEO-EDITOR`, `VIDEO-MOTION` và `VIDEO-COLOR` **BẮT BUỘC** đảm bảo mọi tư liệu hình ảnh đưa vào bàn dựng cũng như chất lượng khung hình video xuất ra luôn đạt chuẩn **Studio Ultra-HD sắc nét tuyệt đối**:

1. **Chất lượng Hình ảnh Tĩnh, Keyframe, B-Roll & Thumbnail (`Ultra-HD Still Image Input Standard`)**:
   - **100% ảnh tĩnh dùng trong Video** (ảnh sản phẩm chèn B-Roll, ảnh nền, frame đầu khởi tạo Image-to-Video, màn hình End-screen/Outro, và ảnh Thumbnail bìa video) **LUÔN LUÔN phải là ảnh chất lượng cao đạt độ phân giải tối thiểu `>= 2048px` (Chuẩn 2K/4K Ultra-HD, Lossless 100%)**.
   - **Đủ dư địa điểm ảnh cho chuyển động Camera (`Pan & Zoom / Ken Burns Headroom`)**: Khi `VIDEO-EDITOR` hoặc `VIDEO-MOTION` áp dụng hiệu ứng phóng cận cảnh (`Zoom-in 120% - 150%`, `Dynamic Push-in`, `3D Parallax`) trên khung hình video `1080p`, ảnh nguồn bắt buộc phải ở chuẩn **2K–4K (`>= 2048px` đến `3840px`)** để sau khi phóng đại vẫn giữ nguyên độ sắc nét từng sợi Carbon trên mặt vợt, tuyệt đối không bị vỡ hạt hay nhòe mờ.
   - **Tự động nâng cấp chất lượng ảnh/keyframe bằng `stamp_logo.js`**: Mọi frame ảnh tĩnh hoặc thumbnail video trước khi xuất bản đều phải chạy qua script `.agent/skills/video/scripts/stamp_logo.js` để tự động nâng nét `CoreImage Lanczos 2K + Unsharp Mask` và đóng dấu Logo `4574x1173px`.
2. **Chuẩn Kỹ Thuật Dựng & Xuất File Video (`High-Bitrate Mastering Spec`)**:
   - **Độ phân giải & Tốc độ khung hình (`Resolution & FPS`)**:
     - Video dọc (`9:16` TikTok / Reels / Shorts): Chuẩn **`1080x1920p` (Full HD) hoặc `2160x3840p` (4K UHD) @ `60fps`** (đảm bảo các pha đập bóng Pickleball tốc độ cao mượt mà, sắc nét từng khung hình).
     - Video vuông (`1:1` Feed): Chuẩn **`2048x2048p` hoặc `1080x1080p` @ `60fps`**.
     - Video ngang (`16:9` YouTube / Màn hình LED): Chuẩn **`1920x1080p` hoặc `3840x2160p` (4K UHD) @ `60fps`**.
   - **Chuẩn nén & Bitrate (`Visually Lossless Encoding`)**:
     - Codec: `H.264 (High Profile, Level 5.1)` hoặc `H.265 / HEVC 10-bit`, `CRF 16–18` (Visually Lossless).
     - Bitrate mục tiêu: **`25–45 Mbps`** cho `1080p60` và **`60–80 Mbps`** cho `4K60`.
     - Không gian màu (`VIDEO-COLOR`): `Rec.709` chuẩn thương mại, kiểm soát vùng sáng (`Highlight Roll-off`) không cháy sáng trên bề mặt vợt và giữ độ tương phản sắc nét cho Logo `11 SPORT`.
   - **Quy tắc `Probe-First & Zero Generation Loss`**: Luôn kiểm tra độ phân giải/FPS của clip nguồn trước khi cắt ghép; sử dụng luồng cắt `Lossless Stream Copy` hoặc `ProRes / High-Bitrate Intermediate` khi chuyển giao giữa `VIDEO-EDITOR` → `VIDEO-MOTION` → `VIDEO-COLOR` để không bị suy giảm chất lượng qua nhiều lần render.

## 2. Bộ Nhận Diện Logo Thương Hiệu (`11 SPORT - PICKLEBALL & MORE`) Cho Video Editor & Motion
Toàn bộ file Logo gốc độ phân giải siêu cao đã được chuẩn hóa (cắt sát vùng Alpha trong suốt) và lưu trực tiếp trong Skill tại thư mục [`resources/logo/`](resources/logo/) (đồng bộ tại `assets/brand_logo/`):
- **Logo Trắng Ngang (Watermark xuyên suốt trên nền tối)**: `.agent/skills/video/resources/logo/11sport_logo_white_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Đen Ngang (Watermark xuyên suốt trên nền sáng)**: `.agent/skills/video/resources/logo/11sport_logo_black_horizontal.png` (`4574x1173px`, Alpha PNG)
- **Logo Trắng Đứng (End-screen / Outro khóa thương hiệu nền tối)**: `.agent/skills/video/resources/logo/11sport_logo_white_vertical.png` (`2921x2255px`, Alpha PNG)
- **Logo Đen Đứng (End-screen / Outro khóa thương hiệu nền sáng)**: `.agent/skills/video/resources/logo/11sport_logo_black_vertical.png` (`2921x2255px`, Alpha PNG)
- **File Vector Gốc**: `11sport_logo_vector.ai` & `11sport_logo_vector.pdf`

## 3. Quy Chuẩn Đồng Bộ Logo & Chống Chìm Watermark Trên Video (`VIDEO-EDITOR` & `VIDEO-MOTION` Bắt Buộc Tuân Thủ)
Để đồng bộ 100% về kích thước/vị trí với ấn phẩm của phòng `DESIGN` **và đảm bảo cảnh quay chuyển động bên dưới KHÔNG BAO GIỜ làm mờ hay chìm mất Logo `11 SPORT`**, mọi video và thumbnail/frame xuất ra phải áp dụng **đúng 2 lớp Logo cố định kèm Lá Chắn Tương Phản (`Smart Contrast Shield`)**:

1. **Lớp 1 – Watermark Logo Ngang Xuyên Suốt Video (`00:00` → Phân đoạn trước Outro) + Đệm Chống Chìm (`Adaptive Corner Scrim`)**:
   - **File sử dụng**: `11sport_logo_white_horizontal.png` (mặc định cho cảnh quay sân đấu/studio) hoặc `11sport_logo_black_horizontal.png` (chỉ khi toàn bộ góc phải là phông trắng sáng).
   - **Vị trí & Kích thước cố định**: **Góc Trên Bên Phải (`top-right`)**, chiều rộng **`W = 19%` chiều rộng khung hình** (`205px` trên khung `1080px`), cách lề phải `Margin X = 3.0% W` (`32px`), cách lề trên `Margin Y = 1.6% H` (`31px`), `Opacity = 95%`.
   - **Cơ chế Chống Chìm Logo Khi Cảnh Video Thay Đổi Sáng/Tối (`Anti-Obscuration Video Shield`)**:
     - Do cảnh quay video bên dưới liên tục chuyển động (có thể lướt qua đèn sân đấu, vệt bóng sáng hoặc khán đài nhiều chi tiết), `VIDEO-EDITOR` và `VIDEO-MOTION` **BẮT BUỘC phải lót 1 lớp `Soft Radial Corner Scrim` (Gradient Vignette đen mờ `Opacity 35%–50%` ở góc `top-right` dưới tầng Logo) + `Contoured Drop Shadow / Outer Stroke Halo (blur 3px, Black 85%)`** gắn liền với lớp Watermark Logo.
     - Tuyệt đối không đặt chữ phụ đề, sticker hay hiệu ứng tia lửa đè lên vùng `top-right 25%x12%` của khung hình video.
2. **Lớp 2 – Outro / End-Screen Logo Đứng Khóa Thương Hiệu (Phân đoạn CTA cuối video)**:
   - **File sử dụng**: `11sport_logo_white_vertical.png` (nền tối) hoặc `11sport_logo_black_vertical.png` (nền sáng).
   - **Vị trí & Kích thước cố định**: **Chính Giữa Khung Hình (`Center`, `X = 50%`, `Y = 42%`)**, phía trên dòng chữ CTA cuối video, chiều rộng **`W = 28%` chiều rộng khung hình** (`302px` trên khung `1080px`), hiệu ứng `Spring Scale Pop-in + Radial Backdrop Dimming (70% Darken Blur)` để làm mờ hẳn cảnh nền phía sau trước khi Logo Outro bật lên.
3. **Công cụ Nâng Cấp Độ Phân Giải 2K & Đóng Dấu Logo (Kèm `3-Pass Contrast Shield`) cho Thumbnail / Keyframe Video**:
   ```bash
   node .agent/skills/video/scripts/stamp_logo.js --file <duong_dan_frame_hoac_thumbnail> --position top-right --mode auto
   ```

## 4. Bộ Module Kỹ Năng Dựng Phim & Motion Graphics Đã Tích Hợp Nội Bộ Trong Phòng `VIDEO`
Toàn bộ 3 bộ kỹ năng dựng phim & đồ họa chuyển động hàng đầu từ GitHub đã được tích hợp trực tiếp vào nội bộ phòng `VIDEO` (phục vụ cho `VIDEO-LEAD`, `VIDEO-EDITOR`, `VIDEO-MOTION`, `VIDEO-AUDIO`, `VIDEO-COLOR`):
1. **Module Dựng Phim Chuẩn Xác Bằng FFmpeg (`ffmpeg-skill` – 42 Công cụ)**:
   - Tài liệu & Script: [`references/ffmpeg-skill/REFERENCE.md`](references/ffmpeg-skill/REFERENCE.md) và thư mục [`references/ffmpeg-skill/scripts/`](references/ffmpeg-skill/scripts/).
   - Quy tắc cốt lõi cho `VIDEO-EDITOR` & `VIDEO-AUDIO`:
     - **`Probe-First`**: Luôn chạy `probe.py` kiểm tra độ phân giải, FPS, hệ màu (HDR/SDR) và kênh âm thanh trước khi dựng.
     - **`Lossless Stream-Copy`**: Ưu tiên cắt ghép không re-encode (`cut.py`), chuẩn hóa âm lượng `-14 LUFS` (`loudness.py`), chèn phụ đề karaoke/pop (`caption.py`), chèn lớp phủ Logo (`overlay.py`), và kiểm tra frame thực tế bằng Contact Sheet (`look.py --tiles 3x2`).
2. **Module Đồ Họa Chuyển Động Điện Ảnh (`remotion-motion-graphics`)**:
   - Tài liệu & Mẫu: [`references/remotion-motion-graphics/REFERENCE.md`](references/remotion-motion-graphics/REFERENCE.md) và [`references/remotion-motion-graphics/references/motion-patterns.md`](references/remotion-motion-graphics/references/motion-patterns.md).
   - Quy tắc cốt lõi cho `VIDEO-MOTION` & `VIDEO-COLOR`:
     - **Kiến trúc 5 Lớp Khung Hình (`5-Layer Scene Stack`)**: (1) Background Mesh → (2) 2K/4K Assets (`Ken Burns slow scale 1.0 -> 1.08`) → (3) Graphics/Typography → (4) Color Grade + Vignette → (5) Top-Right Contrast Scrim + `11 SPORT` Logo.
     - **Chuyển động Vật lý (`Spring Physics & Non-Linear Easing`)**: Cấm dùng chuyển động tuyến tính (`linear`); mọi chuyển động vào/ra phải kết hợp `opacity + translateY + scale` với độ trễ `Stagger 3–6 frames`.
3. **Module Hệ Sinh Thái Remotion Chính Thức (`remotion-skills`)**:
   - Tài liệu: [`references/remotion-skills/remotion-best-practices/REFERENCE.md`](references/remotion-skills/remotion-best-practices/REFERENCE.md), [`references/remotion-skills/remotion-captions/REFERENCE.md`](references/remotion-skills/remotion-captions/REFERENCE.md), [`references/remotion-skills/remotion-render/REFERENCE.md`](references/remotion-skills/remotion-render/REFERENCE.md).

## 5. Bộ Kỹ Năng Nâng Cao (v2): Chuyển Cảnh · Focus Chủ Thể · Sub Ý Chính · Info Card · Thumbnail Cố Định
Chi tiết lệnh & thông số: [`references/transitions-focus/REFERENCE.md`](references/transitions-focus/REFERENCE.md). Công cụ cần: `ffmpeg`, `python` (Pillow, OpenCV, faster-whisper), `node`.

### 5.1 Transition Pack (`scripts/fx_transitions.py`) — BẮT BUỘC
`zoom_punch` (hook/đập bóng) · `whip_pan` (đổi góc/người) · `flash_white` (reveal sản phẩm) · `smooth` (chuyển ý review) · `match_cut` (montage theo beat) · `dip_black` (vào Outro).
- Tối thiểu 1 chuyển cảnh / 4–6 giây; không dùng cùng 1 loại quá 2 lần liên tiếp; cắt khớp beat (≤ 2 frame); không che vùng logo `top-right 25%x12%`.

### 5.2 Subject Focus Pack (`scripts/fx_focus.py`) — BẮT BUỘC
`punch_in` (F1) · `track` (F2, `--auto-track` OpenCV) · `spotlight` (F3) · `freeze` + nhãn (F4) · `speed_ramp` (F5).
- Mỗi video ≥ 1 `punch_in` trong 3s đầu; mỗi lần sản phẩm xuất hiện có ≥ 1 `spotlight` hoặc `freeze`; zoom tối đa **130%** với nguồn 1080p.
- Ghi kế hoạch vào `focus_plan.json` (thời điểm, hiệu ứng, tọa độ chủ thể).

### 5.3 Sub Ý Chính Theo Audio (`scripts/key_subs.py` + `scripts/sub_style_picker.py`)
- Whisper bóc lời → chỉ giữ cụm **2–5 từ quan trọng** (tên sản phẩm, thông số, lợi ích, giá/ưu đãi, hook đầu, CTA cuối); tối đa 1 sub / 3–5s; hiện 0,8–2,5s, bật pop-in đúng lúc nói, tắt ngay khi hết câu. `VIDEO-LEAD` có thể ghi đè bằng `--keys`.
- **Màu/kiểu sub LINH HOẠT theo video & sản phẩm** (không cố định trắng/vàng): 5 kiểu S1 đơn sắc+viền · S2 gradient+viền · S3 hộp nền màu · S4 neon glow · S5 hai tông từ khóa. `sub_style_picker.py` đo màu nền vùng sub + màu sản phẩm → chọn bộ màu có **tương phản ≥ 4.5:1** và không trùng tông cảnh. Mỗi video: 1 kiểu, ≤ 2 màu chữ, 1 màu viền/nền; lưu `sub_style.json`.
- Vị trí: giữa ngang, Y 62–68% H; tránh mặt/sản phẩm và vùng logo.

### 5.4 Smart Info Card (`scripts/fx_overlays.py`)
Thông tin phân cảnh **KHÔNG để đứng yên cả cảnh**: hiện sau cảnh mới 0,3s, giữ **1,5–2,5s**, slide-in/fade-out; chỉ khi đổi phân đoạn; tiêu đề ≤ 20 ký tự; vị trí trái, Y 12–20% H; không trùng lúc với sub ý chính.

### 5.5 Thumbnail Template v1 — KHÓA CỨNG 9:16 (`scripts/make_thumbnail.py`, `resources/thumbnail_template.json`)
- Canvas `2160x3840`; font `Be Vietnam Pro Black` IN HOA, cỡ `6% H`; dòng 1 trắng `#FFFFFF`, dòng 2 vàng `#FFD60A`, viền đen `1.2% H` + bóng; căn trái lề `7% W`, khối chữ Y `60–74% H`, chừa `20%` đáy cho UI; gradient đen phủ nửa dưới; **không dùng tag**.
- Chỉ thay: ảnh nền (frame nét nhất của video) + headline **≤ 2 dòng, ≤ 10 ký tự/dòng, 2–5 từ**, rút từ nội dung chính của video nguồn (transcript + brief). Script từ chối headline quá dài (không co chữ).
- Sau đó chạy `stamp_logo.js` đóng logo.

## 6. Đầu Ra Bắt Buộc
Xuất dữ liệu TSV cho `### SHEET: Kich_Ban_Dung_Video` với các cột:
`Ma_Video | Phan_Doan | Timecode_Bat_Dau | Timecode_Ket_Thuc | Clip_Nguon | Cat_Tu_Den | Hieu_Ung_Transition | Hieu_Ung_Focus | Chu_Phu_De | Sub_Y_Chinh | Info_Card | Nhac_Am_Thanh | Ty_Le | Ten_File_Xuat | Thumbnail_Headline | Nhan_Vien_Phu_Trach | Trang_Thai`
- `Hieu_Ung_Focus`: hiệu ứng F1–F5 + tọa độ/giây. `Sub_Y_Chinh`: cụm sub + kiểu/màu (`S2 #E63946→#111111`). `Info_Card`: text + giây hiện. `Thumbnail_Headline`: 2 dòng.
- Trong cột `Clip_Nguon` và `Hieu_Ung_Transition`, `VIDEO-EDITOR` và `VIDEO-MOTION` **BẮT BUỘC** phải ghi rõ:
  1. Chuẩn chất lượng hình ảnh/clip nguồn (`2K/4K Ultra-HD >=2048px, 60fps High-Bitrate, CRF 16-18 Lossless`).
  2. Thông số chèn lớp Watermark kèm đệm chống chìm `11sport_logo_white_horizontal.png (top-right, W=19%, Margin=3%x1.6%, + Soft Radial Contrast Scrim & Halo)` và Outro `11sport_logo_white_vertical.png (center, W=28%, + Backdrop Blur Dimming)`.
