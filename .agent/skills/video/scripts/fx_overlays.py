#!/usr/bin/env python3
"""Smart Info Cards (11SPORT) - short, animated lower-third for scene info (not hard-coded for the whole scene).

cards.json:
[
  {"scene_start": 0.0,  "title": "01 · ĐỘ NẢY",       "sub": "Carbon T700"},
  {"scene_start": 7.4,  "title": "02 · KIỂM SOÁT"}
]
Rules enforced here:
  - appears 0.3s after scene start, visible 1.5-2.5s (default 2.0s) then leaves
  - slide-in from left + fade (9 frames), fade/slide-out (7 frames)
  - title <= 20 chars, sub optional (<= 28 chars)
  - position left, Y 12-20% H (clear of logo top-right 25%x12% and of subs at Y 62-68%)
Usage:
  python fx_overlays.py cards.json --accent "#FFD60A" --font "Be Vietnam Pro Black" -o cards.ass
  ffmpeg -i in.mp4 -vf "ass=cards.ass,ass=key_subs.ass" out.mp4
"""
import argparse
import json
import sys

FPS = 60


def hex2ass(h, alpha=0):
    h = h.lstrip("#")
    return f"&H{alpha:02X}{h[4:6]}{h[2:4]}{h[0:2]}&".upper()


def ts(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cards")
    ap.add_argument("--accent", default="#FFD60A")
    ap.add_argument("--text", default="#FFFFFF")
    ap.add_argument("--font", default="Be Vietnam Pro Black")
    ap.add_argument("--hold", type=float, default=2.0)
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("-o", "--output", default="cards.ass")
    a = ap.parse_args()

    W, H = a.width, a.height
    cards = json.load(open(a.cards, encoding="utf-8-sig"))
    hold = min(max(a.hold, 1.5), 2.5)
    fs = int(H * 0.036)
    fs2 = int(H * 0.024)
    x, y = int(W * 0.06), int(H * 0.15)
    in_ms, out_ms = int(9 / FPS * 1000), int(7 / FPS * 1000)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: CardT,{a.font},{fs},{hex2ass(a.text)},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,{max(3,int(fs*0.08))},3,7,0,0,0,1
Style: CardS,{a.font},{fs2},{hex2ass(a.accent)},&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,{max(2,int(fs2*0.08))},2,7,0,0,0,1
Style: Bar,{a.font},10,{hex2ass(a.accent)},&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
    ev = []
    for c in cards:
        title = c["title"].upper()[:20]
        if len(c["title"]) > 20:
            print(f"WARN title cut to 20 chars: {c['title']}", file=sys.stderr)
        t0 = float(c["scene_start"]) + 0.3
        t1 = t0 + hold
        bar_h = int(fs * 1.25 + (fs2 * 1.3 if c.get("sub") else 0))
        slide = int(W * 0.05)
        fad = f"\\fad({in_ms},{out_ms})"
        move = (f"\\move({x - slide},{y},{x},{y},0,{in_ms})")
        # accent bar (drawing), then text offset by bar width
        ev.append(f"Dialogue: 1,{ts(t0)},{ts(t1)},Bar,,0,0,0,,"
                  f"{{\\an7{fad}\\move({x - slide},{y},{x},{y},0,{in_ms})\\p1}}m 0 0 l 10 0 l 10 {bar_h} l 0 {bar_h}{{\\p0}}")
        tx = x + 28
        ev.append(f"Dialogue: 2,{ts(t0)},{ts(t1)},CardT,,0,0,0,,"
                  f"{{\\an7{fad}\\move({tx - slide},{y},{tx},{y},0,{in_ms})}}{title}")
        if c.get("sub"):
            ev.append(f"Dialogue: 2,{ts(t0)},{ts(t1)},CardS,,0,0,0,,"
                      f"{{\\an7{fad}\\move({tx - slide},{y + int(fs * 1.2)},{tx},{y + int(fs * 1.2)},0,{in_ms})}}"
                      f"{c['sub'].upper()[:28]}")
    open(a.output, "w", encoding="utf-8").write(head + "\n".join(ev) + "\n")
    print(f"{len(cards)} cards x {hold}s -> {a.output}")


if __name__ == "__main__":
    main()
