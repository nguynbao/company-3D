# Transitions · Focus · Key Subs · Info Cards · Thumbnail — Reference (VIDEO v2)

Môi trường (Windows): mở shell mới để nhận PATH (`ffmpeg`, `node`, `python`). Gói Python: `pillow opencv-python faster-whisper numpy`.
Script nằm tại `.agent/skills/video/scripts/`.

## Quy trình dựng chuẩn (1 video)
```bash
S=.agent/skills/video/scripts
# 1) Chuyển cảnh (nhiều clip)
python $S/fx_transitions.py c1.mp4 c2.mp4 c3.mp4 --presets whip_pan,flash_white -o joined.mp4
# 2) Focus chủ thể (kế hoạch focus_plan.json)
python $S/fx_focus.py joined.mp4 --auto-track --t 0 --dur 4           # gợi ý cx,cy
python $S/fx_focus.py joined.mp4 --plan focus_plan.json --font .agent/skills/video/resources/fonts/BeVietnamPro-Black.ttf -o focused.mp4
# 3) Chọn style sub theo video/sản phẩm
python $S/sub_style_picker.py focused.mp4 --product "#E63946,#111111" -o sub_style.json
# 4) Sub ý chính theo audio (Whisper)
python $S/key_subs.py focused.mp4 --style sub_style.json -o key_subs.ass
# 5) Info card phân cảnh
python $S/fx_overlays.py cards.json --accent "#E63946" -o cards.ass
# 6) Burn (+ watermark logo theo SKILL.md mục 3)
ffmpeg -i focused.mp4 -vf "ass=cards.ass:fontsdir=.agent/skills/video/resources/fonts,ass=key_subs.ass:fontsdir=.agent/skills/video/resources/fonts" -c:v libx264 -crf 17 -c:a copy final.mp4
# 7) Thumbnail 9:16 cố định
python $S/make_thumbnail.py --video final.mp4 --line1 "RPM Q2" --line2 "SMASH MẠNH" -o THUMB.png
node $S/stamp_logo.js --file THUMB.png --position top-right --mode auto
```

## Transition presets
| Preset | xfade | Frames @60 | Khi dùng |
|---|---|---|---|
| zoom_punch | zoomin | 8 | hook, pha đập bóng |
| whip_pan | slideleft | 10 | đổi góc/người chơi |
| flash_white | fadewhite | 6 | reveal sản phẩm |
| smooth | smoothleft | 12 | chuyển ý review |
| match_cut | hard cut | 0 | montage theo beat |
| dip_black | fadeblack | 18 | vào Outro logo |

## focus_plan.json
`fx`: `punch_in` (zoom ≤ 1.30) · `spotlight` (radius, dim) · `freeze` (label) · `speed_ramp` (slow 0.25–0.4). Tọa độ `cx,cy` ∈ [0,1].

## Sub style families
S1 solid+outline · S2 gradient+outline · S3 color box · S4 neon glow · S5 two-tone keyword. Chọn tự động theo tương phản WCAG ≥ 4.5:1 và hue không trùng cảnh; 1 kiểu/video, ≤ 2 màu chữ.

## Thumbnail Template v1 (khóa cứng)
Xem `resources/thumbnail_template.json` — chỉ đổi ảnh nền và headline (≤ 2 dòng, ≤ 10 ký tự/dòng).

## Checklist QA-QC cho video v2
- [ ] ≥ 1 chuyển cảnh / 4–6s, đúng preset theo ngữ cảnh, không che logo
- [ ] ≥ 1 punch_in trong 3s đầu; sản phẩm có spotlight/freeze; zoom ≤ 130%
- [ ] Sub chỉ ý chính (≤ 5 từ/cụm, ≤ 1 cụm/3–5s), lệch audio ≤ 3 frame, không che mặt/sản phẩm/logo
- [ ] Màu sub tương phản ≥ 4.5:1 với nền, 1 kiểu/video (có `sub_style.json`)
- [ ] Info card 1.5–2.5s, có animation, không đứng cứng
- [ ] Thumbnail đúng template (2160x3840, Be Vietnam Pro Black, 2 dòng ≤ 10 ký tự, logo top-right)
