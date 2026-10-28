#!/usr/bin/env python3
"""11SPORT Transition Pack - join 2+ clips with a named preset (T1..T6).

Presets (name -> ffmpeg xfade transition, duration in frames @60fps):
  zoom_punch  T1  zoomin        8f   hook / pha dap bong
  whip_pan    T2  slideleft     10f  doi goc may / doi nguoi choi
  flash_white T3  fadewhite     6f   reveal san pham
  smooth      T4  smoothleft    12f  chuyen y review
  match_cut   T5  (hard cut)    0f   montage theo nhac
  dip_black   T6  fadeblack     18f  vao Outro logo

Usage:
  python fx_transitions.py a.mp4 b.mp4 c.mp4 --presets whip_pan,flash_white -o out.mp4
  (--presets: 1 preset for every joint, or a comma list with len(clips)-1 items)
Requires ffmpeg + ffprobe in PATH. All clips are normalised to --width/--height/--fps.
"""
import argparse
import json
import subprocess
import sys

PRESETS = {
    "zoom_punch": ("zoomin", 8),
    "whip_pan": ("slideleft", 10),
    "flash_white": ("fadewhite", 6),
    "smooth": ("smoothleft", 12),
    "match_cut": (None, 0),
    "dip_black": ("fadeblack", 18),
}


def probe(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type",
         "-of", "json", path])
    info = json.loads(out)
    has_audio = any(s.get("codec_type") == "audio" for s in info.get("streams", []))
    return float(info["format"]["duration"]), has_audio


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("clips", nargs="+")
    ap.add_argument("--presets", default="smooth")
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--crf", type=int, default=17)
    ap.add_argument("-o", "--output", required=True)
    a = ap.parse_args()

    n = len(a.clips)
    if n < 2:
        sys.exit("need >= 2 clips")
    names = a.presets.split(",")
    if len(names) == 1:
        names = names * (n - 1)
    if len(names) != n - 1:
        sys.exit(f"--presets needs 1 or {n - 1} items")
    for nm in names:
        if nm not in PRESETS:
            sys.exit(f"unknown preset {nm}; choose {list(PRESETS)}")

    durs, audio = zip(*[probe(c) for c in a.clips])
    inputs, vf, af = [], [], []
    for i, c in enumerate(a.clips):
        inputs += ["-i", c]
        vf.append(f"[{i}:v]scale={a.width}:{a.height}:force_original_aspect_ratio=increase,"
                  f"crop={a.width}:{a.height},fps={a.fps},format=yuv420p,setsar=1[v{i}]")
        if all(audio):
            af.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo[a{i}]")

    # chain joints; keep running offset
    cur_v, cur_a, total = "v0", "a0", durs[0]
    for i, nm in enumerate(names, start=1):
        xf, frames = PRESETS[nm]
        d = frames / a.fps
        if xf is None:  # hard cut
            vf.append(f"[{cur_v}][v{i}]concat=n=2:v=1:a=0[vx{i}]")
            if all(audio):
                af.append(f"[{cur_a}][a{i}]concat=n=2:v=0:a=1[ax{i}]")
            total += durs[i]
        else:
            off = max(total - d, 0)
            vf.append(f"[{cur_v}][v{i}]xfade=transition={xf}:duration={d:.4f}:offset={off:.4f}[vx{i}]")
            if all(audio):
                af.append(f"[{cur_a}][a{i}]acrossfade=d={d:.4f}[ax{i}]")
            total += durs[i] - d
        cur_v, cur_a = f"vx{i}", f"ax{i}"

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(vf + af), "-map", f"[{cur_v}]"]
    if all(audio):
        cmd += ["-map", f"[{cur_a}]", "-c:a", "aac", "-b:a", "320k", "-ar", "48000"]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", str(a.crf), "-profile:v", "high",
            "-level", "5.1", "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.output]
    print(" ".join(cmd))
    sys.exit(subprocess.call(cmd))


if __name__ == "__main__":
    main()
