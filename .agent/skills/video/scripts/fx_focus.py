#!/usr/bin/env python3
"""11SPORT Subject Focus Pack - F1..F5 driven by a focus_plan.json.

focus_plan.json example (times in seconds, cx/cy = subject centre, 0..1 of frame):
[
  {"fx": "punch_in",  "t": 0.6, "dur": 1.2, "cx": 0.5, "cy": 0.45, "zoom": 1.25},
  {"fx": "spotlight", "t": 3.0, "dur": 2.5, "cx": 0.5, "cy": 0.55, "radius": 0.32, "dim": 0.5},
  {"fx": "freeze",    "t": 6.0, "dur": 1.2, "label": "CARBON T700"},
  {"fx": "speed_ramp","t": 8.0, "dur": 1.5, "slow": 0.35}
]
Effects:
  punch_in   F1  ease zoom to subject then release (max zoom 1.30)
  spotlight  F3  dim + blur background outside a soft ellipse around subject
  freeze     F4  freeze-frame with glow ring + label (label text drawn via --font)
  speed_ramp F5  slow-motion window (video+audio re-timed)
  track      F2  use  --auto-track  to build a cx/cy track with OpenCV (see track_subject)

Usage:
  python fx_focus.py in.mp4 --plan focus_plan.json -o out.mp4 [--font path.ttf]
  python fx_focus.py in.mp4 --auto-track --t 0 --dur 5 --print   # prints suggested cx,cy
Effects are applied one after another (each re-encodes at CRF 17, 60fps).
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

MAX_ZOOM = 1.30


def probe_size(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0",
                                   "-show_entries", "stream=width,height,r_frame_rate",
                                   "-of", "json", path])
    s = json.loads(out)["streams"][0]
    num, den = s["r_frame_rate"].split("/")
    return s["width"], s["height"], float(num) / float(den)


def track_subject(path, t0, dur, samples=8):
    """Auto-detect subject centre with OpenCV (HOG people detector, falls back to saliency)."""
    import cv2
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    W = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    H = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    hog = cv2.HOGDescriptor()
    hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
    pts = []
    for k in range(samples):
        cap.set(cv2.CAP_PROP_POS_FRAMES, int((t0 + dur * k / max(samples - 1, 1)) * fps))
        ok, fr = cap.read()
        if not ok:
            continue
        small = cv2.resize(fr, (int(W * 480 / H), 480)) if W < H else cv2.resize(fr, (640, int(H * 640 / W)))
        sx, sy = W / small.shape[1], H / small.shape[0]
        rects, weights = hog.detectMultiScale(small, winStride=(8, 8))
        if len(rects):
            x, y, w, h = max(rects, key=lambda r: r[2] * r[3])
            pts.append(((x + w / 2) * sx / W, (y + h * 0.4) * sy / H))
    cap.release()
    if not pts:
        return 0.5, 0.5
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def filter_for(step, W, H):
    fx, t, d = step["fx"], float(step["t"]), float(step["dur"])
    cx, cy = clamp(step.get("cx", 0.5), 0, 1), clamp(step.get("cy", 0.5), 0, 1)
    if fx == "punch_in":
        z = min(step.get("zoom", 1.25), MAX_ZOOM)
        # smooth in/out: sin envelope over the window
        zexpr = f"(1+({z}-1)*sin(PI*clip((t-{t})/{d},0,1)))"
        return (f"scale=w='iw*{zexpr}':h='ih*{zexpr}':eval=frame,"
                f"crop={W}:{H}:x='clip({cx}*iw-{W}/2,0,iw-{W})':y='clip({cy}*ih-{H}/2,0,ih-{H})'",
                None)
    if fx == "spotlight":
        raise ValueError("spotlight is handled by apply_spotlight")
    raise ValueError(fx)


def apply_spotlight(src, dst, step, W, H, fps, tmpdir):
    """F3: dim + blur background outside a soft ellipse around the subject (mask PNG + maskedmerge)."""
    import numpy as np
    import cv2
    t, d = float(step["t"]), float(step["dur"])
    cx, cy = clamp(step.get("cx", 0.5), 0, 1), clamp(step.get("cy", 0.5), 0, 1)
    r, dim = step.get("radius", 0.32), step.get("dim", 0.5)
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    dist = np.hypot((xs / W - cx) / r, (ys / H - cy) / (r * W / H))
    mask = np.clip(1.6 - dist * 1.2, 0, 1)  # 1 = keep sharp/bright, soft falloff
    mask = cv2.GaussianBlur(mask, (0, 0), W * 0.03)
    mpath = os.path.join(tmpdir, "spot_mask.png")
    cv2.imwrite(mpath, (mask * 255).astype(np.uint8))
    en = f"between(t,{t},{t + d})"
    fc = (f"[0:v]split=3[a][a2][b];[b]gblur=sigma=12,eq=brightness={-0.45 * dim:.3f}[bg];"
          f"[1:v]format=gray[m];[bg][a][m]maskedmerge[sp];"
          f"[a2][sp]overlay=enable='{en}':shortest=1[v]")
    return ["ffmpeg", "-y", "-i", src, "-loop", "1", "-framerate", str(fps), "-i", mpath,
            "-filter_complex", fc, "-map", "[v]", "-map", "0:a?", "-c:v", "libx264", "-crf", "17",
            "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "copy", "-shortest", dst]


def apply_freeze(src, dst, step, font, W, H):
    t, d = float(step["t"]), float(step["dur"])
    label = step.get("label", "")
    cx, cy = step.get("cx", 0.5), step.get("cy", 0.5)
    text = ""
    if label and font:
        f = font.replace("\\", "/").replace(":", "\\:")
        text = (f",drawtext=fontfile='{f}':text='{label}':fontsize={int(H * 0.045)}:fontcolor=white:"
                f"borderw=6:bordercolor=black:x=(w-tw)/2:y=h*{min(cy + 0.25, 0.8)}:enable='between(t,0,{d})'")
    ring = (f",drawbox=x={int(cx * W - W * 0.2)}:y={int(cy * H - W * 0.2)}:w={int(W * 0.4)}:h={int(W * 0.4)}:"
            f"color=white@0.0:t=fill,drawbox=x={int(cx * W - W * 0.2)}:y={int(cy * H - W * 0.2)}:"
            f"w={int(W * 0.4)}:h={int(W * 0.4)}:color=yellow@0.85:t=6")
    fc = (f"[0:v]trim=0:{t},setpts=PTS-STARTPTS[v1];"
          f"[0:v]trim={t}:{t + 0.04},setpts=PTS-STARTPTS,loop=loop=-1:size=1,trim=duration={d},setpts=PTS-STARTPTS{ring}{text}[vf];"
          f"[0:v]trim=start={t},setpts=PTS-STARTPTS[v3];"
          f"[0:a]atrim=0:{t},asetpts=PTS-STARTPTS[a1];anullsrc=r=48000:cl=stereo,atrim=duration={d}[a2];"
          f"[0:a]atrim=start={t},asetpts=PTS-STARTPTS[a3];"
          f"[v1][a1][vf][a2][v3][a3]concat=n=3:v=1:a=1[v][a]")
    return ["ffmpeg", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "320k", dst]


def apply_speed_ramp(src, dst, step):
    t, d, slow = float(step["t"]), float(step["dur"]), float(step.get("slow", 0.35))
    fc = (f"[0:v]trim=0:{t},setpts=PTS-STARTPTS[v1];"
          f"[0:v]trim={t}:{t + d},setpts=(PTS-STARTPTS)/{slow}[v2];"
          f"[0:v]trim=start={t + d},setpts=PTS-STARTPTS[v3];"
          f"[0:a]atrim=0:{t},asetpts=PTS-STARTPTS[a1];"
          f"[0:a]atrim={t}:{t + d},asetpts=PTS-STARTPTS,atempo={slow}[a2];"
          f"[0:a]atrim=start={t + d},asetpts=PTS-STARTPTS[a3];"
          f"[v1][a1][v2][a2][v3][a3]concat=n=3:v=1:a=1[v][a]")
    return ["ffmpeg", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "320k", dst]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--plan")
    ap.add_argument("-o", "--output")
    ap.add_argument("--font")
    ap.add_argument("--auto-track", action="store_true")
    ap.add_argument("--t", type=float, default=0)
    ap.add_argument("--dur", type=float, default=3)
    ap.add_argument("--print", action="store_true")
    a = ap.parse_args()

    if a.auto_track:
        cx, cy = track_subject(a.input, a.t, a.dur)
        print(json.dumps({"cx": round(cx, 3), "cy": round(cy, 3)}))
        return
    if not (a.plan and a.output):
        sys.exit("need --plan and -o")

    W, H, fps = probe_size(a.input)
    fps = round(fps)
    plan = json.load(open(a.plan, encoding="utf-8-sig"))
    cur, tmp = a.input, tempfile.mkdtemp()
    for i, step in enumerate(plan):
        dst = a.output if i == len(plan) - 1 else os.path.join(tmp, f"s{i}.mp4")
        fx = step["fx"]
        if fx == "freeze":
            cmd = apply_freeze(cur, dst, step, a.font, W, H)
        elif fx == "spotlight":
            cmd = apply_spotlight(cur, dst, step, W, H, fps, tmp)
        elif fx == "speed_ramp":
            cmd = apply_speed_ramp(cur, dst, step)
        else:
            vf, _ = filter_for(step, W, H)
            flag = "-filter_complex" if "[" in vf else "-vf"
            cmd = ["ffmpeg", "-y", "-i", cur, flag, vf, "-c:v", "libx264", "-crf", "17", "-preset", "slow",
                   "-pix_fmt", "yuv420p", "-c:a", "copy", dst]
        print(f"[{i + 1}/{len(plan)}] {fx}")
        if subprocess.call(cmd) != 0:
            sys.exit(f"step {fx} failed")
        cur = dst


if __name__ == "__main__":
    main()
