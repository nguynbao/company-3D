#!/usr/bin/env python3
"""11SPORT Thumbnail Template v1 (9:16, locked) - only bg frame + headline change.

Usage:
  python make_thumbnail.py --bg frame.png --line1 "RPM Q2" --line2 "SMASH CỰC MẠNH" -o THUMB_xxx.png
  python make_thumbnail.py --video clip.mp4 --line1 ... --line2 ... -o out.png   # auto-picks sharpest frame
Then:  node .agent/skills/video/scripts/stamp_logo.js --file out.png --position top-right --mode auto
Validation: refuses lines > 12 chars or > 2 lines (rewrite the headline, never shrink the font).
"""
import argparse
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(HERE, "..", "resources")
TPL = json.load(open(os.path.join(RES, "thumbnail_template.json"), encoding="utf-8-sig"))


def sharpest_frame(video, samples=40):
    cap = cv2.VideoCapture(video)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    best, bf = -1, None
    for k in range(samples):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * (0.05 + 0.9 * k / samples)))
        ok, fr = cap.read()
        if not ok:
            continue
        g = cv2.cvtColor(fr, cv2.COLOR_BGR2GRAY)
        s = cv2.Laplacian(g, cv2.CV_64F).var()
        if s > best:
            best, bf = s, fr
    cap.release()
    return Image.fromarray(cv2.cvtColor(bf, cv2.COLOR_BGR2RGB))


def cover(img, W, H):
    r = max(W / img.width, H / img.height)
    img = img.resize((int(img.width * r) + 1, int(img.height * r) + 1), Image.LANCZOS)
    x, y = (img.width - W) // 2, (img.height - H) // 2
    return img.crop((x, y, x + W, y + H))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bg")
    ap.add_argument("--video")
    ap.add_argument("--line1", required=True)
    ap.add_argument("--line2", default="")
    ap.add_argument("-o", "--output", required=True)
    a = ap.parse_args()

    hl, cv_ = TPL["headline"], TPL["canvas"]
    W, H = cv_["width"], cv_["height"]
    lines = [l.upper() for l in (a.line1, a.line2) if l]
    for l in lines:
        if len(l) > hl["max_chars_per_line"]:
            sys.exit(f"'{l}' = {len(l)} chars > {hl['max_chars_per_line']}. Rewrite the headline shorter.")

    img = Image.open(a.bg).convert("RGB") if a.bg else sharpest_frame(a.video)
    img = cover(img, W, H)

    # bottom gradient
    g = TPL["gradient"]
    y0 = int(H * g["start_pct"])
    ramp = np.linspace(0, g["max_opacity"], H - y0)[:, None] ** 1.3
    alpha = np.zeros((H, W), dtype=np.float32)
    alpha[y0:] = ramp
    base = np.asarray(img).astype(np.float32) * (1 - alpha[..., None])
    img = Image.fromarray(base.astype(np.uint8))

    font_path = os.path.join(RES, TPL["font"]["file"])
    size = int(H * hl["size_pct_of_height"])
    font = ImageFont.truetype(font_path, size)
    d = ImageDraw.Draw(img, "RGBA")
    stroke = int(H * hl["stroke_pct_of_height"])
    x = int(W * hl["margin_left_pct"])
    y = int(H * hl["block_top_pct"])
    sh = int(H * hl["shadow"]["offset_pct"])
    for i, line in enumerate(lines):
        col = hl["line_colors"][min(i, 1)]
        yy = y + int(i * size * hl["line_height"] * 1.12)
        d.text((x + sh, yy + sh), line, font=font, fill=(0, 0, 0, int(255 * hl["shadow"]["opacity"])),
               stroke_width=stroke, stroke_fill=(0, 0, 0, int(255 * hl["shadow"]["opacity"])))
        d.text((x, yy), line, font=font, fill=col, stroke_width=stroke, stroke_fill=hl["stroke_color"])
        w = d.textlength(line, font=font)
        if x + w > W * 0.96:
            sys.exit(f"'{line}' overflows the canvas; shorten it.")
    bottom = y + int(len(lines) * size * hl["line_height"] * 1.12)
    if bottom > H * (1 - TPL["safe_bottom_pct"]):
        sys.exit("headline enters the bottom UI safe zone")
    img.save(a.output)
    print(f"{a.output} {W}x{H}  lines={lines}")


if __name__ == "__main__":
    main()
