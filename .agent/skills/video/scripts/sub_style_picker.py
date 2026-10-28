#!/usr/bin/env python3
"""Adaptive Sub Style picker (11SPORT) - choose sub style/colours that read well on THIS video.

1. Samples frames of the sub zone (default Y 55-75% H) -> mean luminance + dominant hue.
2. Takes product colours (--product '#E63946,#111111' or auto from --product-image).
3. Scores candidate styles S1..S5 x palette on WCAG contrast (>= 4.5) and hue clash
   with the scene (avoid text hue within +-35 deg of scene dominant hue unless boxed).
4. Writes sub_style.json  {style, text, keyword, outline, box, glow, gradient, contrast, reason}.

Usage:
  python sub_style_picker.py video.mp4 --product "#E63946,#111111" -o sub_style.json
  python sub_style_picker.py video.mp4 --product-image racket.png -o sub_style.json
"""
import argparse
import colorsys
import json
import sys

import cv2
import numpy as np


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb2hex(c):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in c)


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = c
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hue(c):
    return colorsys.rgb_to_hsv(*(v / 255 for v in c))[0] * 360


def hue_dist(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


def sample_scene(path, y0, y1, n=24):
    cap = cv2.VideoCapture(path)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    px = []
    for k in range(n):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(total * (k + 0.5) / n))
        ok, fr = cap.read()
        if not ok:
            continue
        h = fr.shape[0]
        zone = fr[int(h * y0):int(h * y1)]
        zone = cv2.resize(zone, (64, 32))
        px.append(cv2.cvtColor(zone, cv2.COLOR_BGR2RGB).reshape(-1, 3))
    cap.release()
    if not px:
        sys.exit("cannot read video")
    px = np.concatenate(px).astype(np.float32)
    mean = px.mean(axis=0)
    hsv = np.array([colorsys.rgb_to_hsv(*(p / 255)) for p in px[::7]])
    sat_mask = hsv[:, 1] > 0.35
    dom_hue = float(np.median(hsv[sat_mask, 0]) * 360) if sat_mask.sum() > 20 else None
    return tuple(mean), dom_hue


def product_colors(args):
    if args.product:
        return [hex2rgb(x) for x in args.product.split(",")]
    if args.product_image:
        img = cv2.imread(args.product_image)
        img = cv2.resize(img, (96, 96)).reshape(-1, 3).astype(np.float32)
        _, _, centers = cv2.kmeans(img, 3, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0),
                                   3, cv2.KMEANS_PP_CENTERS)
        return [tuple(c[::-1]) for c in centers]
    return []


def candidates(prod):
    white, black, yellow = (255, 255, 255), (0, 0, 0), (255, 214, 10)
    saturated = [c for c in prod if colorsys.rgb_to_hsv(*(v / 255 for v in c))[1] > 0.45]
    acc = saturated[0] if saturated else yellow
    acc2 = saturated[1] if len(saturated) > 1 else white
    out = []
    out.append(dict(style="S1_solid_outline", text=white, keyword=acc, outline=black, box=None))
    out.append(dict(style="S1_solid_outline", text=black, keyword=acc, outline=white, box=None))
    out.append(dict(style="S2_gradient_outline", text=acc, gradient=[acc, acc2], keyword=acc2, outline=black, box=None))
    out.append(dict(style="S3_color_box", text=white, keyword=yellow, outline=None, box=acc))
    out.append(dict(style="S3_color_box", text=black, keyword=black, outline=None, box=yellow))
    out.append(dict(style="S4_neon_glow", text=white, keyword=acc, outline=None, box=None, glow=acc))
    out.append(dict(style="S5_two_tone", text=white, keyword=acc, outline=black, box=None))
    return out


def score(c, scene_rgb, scene_hue, prod_accent=None):
    # effective background behind text: box colour, else dark halo of outline, else scene
    bg = c["box"] or c["outline"] or scene_rgb
    if c.get("glow"):
        bg = scene_rgb
    cr = min(contrast(c["text"], bg), contrast(c["keyword"], bg))
    s = min(cr, 7.0)  # beyond 7:1 extra contrast adds nothing; let brand fit decide
    if cr < 4.5:
        s -= 100  # hard fail
    if prod_accent is not None:
        used = [c.get("box"), c["keyword"], c.get("glow")] + list(c.get("gradient") or [])
        if prod_accent in used:
            s += 2.5  # ties the sub to the product palette
    if scene_hue is not None and not c["box"] and not c["outline"]:
        if hue_dist(hue(c["text"]), scene_hue) < 35:
            s -= 3
    if scene_hue is not None and hue_dist(hue(c["keyword"]), scene_hue) < 35 and not c["box"]:
        s -= 1.5  # keyword colour clashes with scene tone
    return s, cr


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--product")
    ap.add_argument("--product-image")
    ap.add_argument("--zone", default="0.55,0.75")
    ap.add_argument("--prefer", help="force a style family prefix, e.g. S3")
    ap.add_argument("-o", "--output", default="sub_style.json")
    a = ap.parse_args()

    y0, y1 = (float(v) for v in a.zone.split(","))
    scene_rgb, scene_hue = sample_scene(a.video, y0, y1)
    prod = product_colors(a)
    cands = candidates(prod)
    sat = [c for c in prod if colorsys.rgb_to_hsv(*(v / 255 for v in c))[1] > 0.45]
    accent = sat[0] if sat else None
    if a.prefer:
        cands = [c for c in cands if c["style"].startswith(a.prefer)] or cands
    ranked = []
    for c in cands:
        s, cr = score(c, scene_rgb, scene_hue, accent)
        ranked.append((s, cr, c))
    ranked.sort(key=lambda x: -x[0])
    best = ranked[0]
    res = {k: (rgb2hex(v) if isinstance(v, tuple) else v) for k, v in best[2].items()}
    if "gradient" in res:
        res["gradient"] = [rgb2hex(g) for g in best[2]["gradient"]]
    res["contrast"] = round(best[1], 2)
    res["scene_zone_rgb"] = rgb2hex(scene_rgb)
    res["scene_dominant_hue"] = None if scene_hue is None else round(scene_hue)
    res["reason"] = (f"Contrast {best[1]:.1f}:1 (>=4.5). Scene zone mean {rgb2hex(scene_rgb)}"
                     + (f", dominant hue {scene_hue:.0f}deg avoided" if scene_hue is not None else ""))
    res["alternatives"] = [c["style"] + f" ({r:.1f}:1)" for _, r, c in ranked[1:3]]
    json.dump(res, open(a.output, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps(res, ensure_ascii=False, indent=2))
    if best[1] < 4.5:
        sys.exit("WARNING: no candidate reaches 4.5:1 - add a box (S3)")


if __name__ == "__main__":
    main()
