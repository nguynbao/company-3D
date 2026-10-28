#!/usr/bin/env python3
"""Key-Moment Subtitles (11SPORT) - Whisper audio -> only the IMPORTANT phrases -> animated ASS.

Pipeline
  1. transcribe  : faster-whisper (word timestamps, Vietnamese) -> transcript.json
  2. select      : keep only key phrases (2-5 words, max 1 per --gap sec)
                   scoring = product/spec terms, numbers/price, benefit words, hook (first 4s), CTA (last 6s)
                   VIDEO-LEAD may override with --keys keys.txt  ("0:03.2-0:05.0 RPM Q2 | KIEM SOAT" one per line)
  3. render      : ASS with pop-in per word, style read from sub_style.json (sub_style_picker.py)

Usage:
  python key_subs.py video.mp4 --style sub_style.json --font "Be Vietnam Pro Black" -o key_subs.ass
  python key_subs.py video.mp4 --transcript-only -o transcript.json
  ffmpeg -i video.mp4 -vf "ass=key_subs.ass:fontsdir=<fonts>" ...

Style families: S1 solid+outline, S2 gradient+outline, S3 colour box, S4 neon glow, S5 two-tone keyword.
Safe zone: centre-X, Y 62-68% H; never inside logo zone (top-right 25%x12%).
"""
import argparse
import json
import re
import sys

BENEFIT = ["mạnh", "kiểm soát", "nảy", "nhẹ", "bền", "êm", "xoáy", "spin", "power", "carbon", "t700", "rpm",
           "ưu đãi", "giảm", "giá", "tặng", "freeship", "mua", "đặt", "inbox", "liên hệ", "hot", "mới", "đáng",
           "tốt", "chất lượng", "review", "trải nghiệm", "sweet spot", "cảm giác",
           "restock", "back", "hottest", "all-round", "easy", "control", "spot", "stability", "spin", "paddle", "best", "price", "sale"]
STOP = {"và", "là", "thì", "mà", "của", "cho", "với", "này", "nè", "nhé", "nha", "ạ", "ừ", "à", "ờ", "à", "ok",
        "xin", "chào", "các", "bạn", "mình", "em", "anh", "chị", "thôi", "rồi"}


def hex2ass(h, alpha=0):
    h = h.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alpha:02X}{b}{g}{r}&".upper()


def lerp_hex(a, b, t):
    a, b = a.lstrip("#"), b.lstrip("#")
    ca = [int(a[i:i + 2], 16) for i in (0, 2, 4)]
    cb = [int(b[i:i + 2], 16) for i in (0, 2, 4)]
    return "#%02X%02X%02X" % tuple(int(x + (y - x) * t) for x, y in zip(ca, cb))


def ts(t):
    t = max(t, 0)
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def parse_time(s):
    parts = s.split(":")
    sec = 0.0
    for p in parts:
        sec = sec * 60 + float(p)
    return sec


def transcribe(video, model_size, lang):
    from faster_whisper import WhisperModel
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    segs, info = model.transcribe(video, language=lang, word_timestamps=True, vad_filter=True)
    out = []
    for s in segs:
        out.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                    "words": [{"w": w.word.strip(), "s": w.start, "e": w.end} for w in (s.words or [])]})
    return out


def score_window(words, t_total):
    text = " ".join(w["w"] for w in words).lower()
    sc = 0.0
    sc += 3 * sum(1 for b in BENEFIT if b in text)
    if re.search(r"\d", text):
        sc += 3
    if re.search(r"\b[A-Z0-9]{2,}\b", " ".join(w["w"] for w in words)):
        sc += 2  # model names / specs
    if words[0]["s"] < 4:
        sc += 4  # hook
    if words[-1]["e"] > t_total - 6:
        sc += 4  # CTA
    sc -= 1.5 * sum(1 for w in words if w["w"].lower().strip(".,!?") in STOP)
    return sc


def select_key_phrases(segments, duration, gap=3.5, min_score=3, max_words=5):
    cues = []
    for seg in segments:
        ws = seg["words"]
        if not ws:
            continue
        best = None
        for n in range(2, max_words + 1):
            for i in range(0, len(ws) - n + 1):
                win = ws[i:i + n]
                sc = score_window(win, duration) - 0.2 * n
                if best is None or sc > best[0]:
                    best = (sc, win)
        if best and best[0] >= min_score:
            win = best[1]
            cues.append({"start": win[0]["s"], "end": win[-1]["e"], "score": best[0],
                         "words": [w["w"] for w in win], "wt": [(w["s"], w["e"]) for w in win]})
    # enforce spacing, keep best
    cues.sort(key=lambda c: c["start"])
    kept = []
    for c in cues:
        if kept and c["start"] - kept[-1]["start"] < gap:
            if c["score"] > kept[-1]["score"]:
                kept[-1] = c
            continue
        kept.append(c)
    return kept


def manual_cues(path):
    cues = []
    for line in open(path, encoding="utf-8-sig"):
        line = line.strip()
        m = re.match(r"([\d:.]+)\s*-\s*([\d:.]+)\s+(.*)", line)
        if not m:
            continue
        s, e, txt = parse_time(m[1]), parse_time(m[2]), m[3]
        ws = txt.replace("|", " ").split()
        step = (e - s) / max(len(ws), 1)
        cues.append({"start": s, "end": e, "words": ws,
                     "wt": [(s + i * step, s + (i + 1) * step) for i in range(len(ws))]})
    return cues


def keyword_index(words):
    """index of the word to highlight: longest word / one with digits / ALLCAPS"""
    best, bi = -1, 0
    for i, w in enumerate(words):
        s = len(w) + (5 if re.search(r"\d", w) else 0) + (3 if w.isupper() else 0)
        if s > best:
            best, bi = s, i
    return bi


def build_ass(cues, style, font, W, H, size_pct=0.052, y_pct=0.65):
    fs = int(H * size_pct)
    fam = style.get("style", "S1")[:2]
    text_c, kw_c = style["text"], style["keyword"]
    outline_c = style.get("outline") or "#000000"
    box_c = style.get("box")
    glow_c = style.get("glow")
    grad = style.get("gradient")
    border_style = 3 if box_c else 1
    back = hex2ass(box_c, 0x60) if box_c else hex2ass("#000000", 0x80)
    outline_w = 0 if (box_c or glow_c) else max(4, int(fs * 0.09))
    shadow = 4 if not (box_c or glow_c) else 0
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Key,{font},{fs},{hex2ass(text_c)},{hex2ass(kw_c)},{hex2ass(outline_c)},{back},-1,0,0,0,100,100,1,0,{border_style},{outline_w if not box_c else int(fs*0.35)},{shadow},5,{int(W*0.08)},{int(W*0.08)},0,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
"""
    ev = []
    y = int(H * y_pct)
    for c in cues:
        words = [w.upper() for w in c["words"]]
        ki = keyword_index(words)
        start = c["start"]
        end = max(c["end"] + 0.15, start + 0.8)
        end = min(end, start + 2.5)
        parts = []
        n = len(words)
        for i, w in enumerate(words):
            wt_s = c["wt"][i][0] - start
            col = kw_c if (fam in ("S5", "S3") and i == ki) or (fam in ("S1", "S2", "S4") and i == ki) else text_c
            if fam == "S2" and grad:
                col = lerp_hex(grad[0], grad[1], i / max(n - 1, 1))
            pop = f"\\fscx85\\fscy85\\alpha&HFF&\\t({int(wt_s*1000)},{int(wt_s*1000)+120},\\fscx100\\fscy100\\alpha&H00&)"
            tag = f"{{\\c{hex2ass(col)}{pop}"
            if glow_c:
                tag += f"\\bord6\\3c{hex2ass(glow_c)}\\blur8"
            tag += "}"
            parts.append(tag + w)
        text = "{\\an5\\pos(%d,%d)}" % (W // 2, y) + " ".join(parts)
        ev.append(f"Dialogue: 1,{ts(start)},{ts(end)},Key,,0,0,0,,{text}")
    return header + "\n".join(ev) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--style", default=None, help="sub_style.json from sub_style_picker.py")
    ap.add_argument("--font", default="Be Vietnam Pro Black")
    ap.add_argument("--model", default="small")
    ap.add_argument("--lang", default=None, help="vi/en/...; default = auto-detect")
    ap.add_argument("--keys", help="manual key phrases file (overrides auto selection)")
    ap.add_argument("--transcript", help="reuse transcript.json")
    ap.add_argument("--transcript-only", action="store_true")
    ap.add_argument("--gap", type=float, default=3.5)
    ap.add_argument("--width", type=int, default=1080)
    ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("-o", "--output", default="key_subs.ass")
    a = ap.parse_args()

    if a.keys:
        cues = manual_cues(a.keys)
    else:
        if a.transcript:
            segs = json.load(open(a.transcript, encoding="utf-8-sig"))
        else:
            segs = transcribe(a.video, a.model, a.lang)
            json.dump(segs, open(a.output if a.transcript_only else "transcript.json", "w",
                                 encoding="utf-8"), ensure_ascii=False, indent=1)
        if a.transcript_only:
            print(f"transcript: {len(segs)} segments -> {a.output}")
            return
        dur = segs[-1]["end"] if segs else 0
        cues = select_key_phrases(segs, dur, gap=a.gap)
    if not a.style:
        sys.exit("need --style (run sub_style_picker.py first)")
    style = json.load(open(a.style, encoding="utf-8-sig"))
    open(a.output, "w", encoding="utf-8").write(build_ass(cues, style, a.font, a.width, a.height))
    print(f"{len(cues)} key subs -> {a.output}")
    for c in cues:
        print(f"  {c['start']:6.2f}-{c['end']:6.2f}  {' '.join(c['words'])}")


if __name__ == "__main__":
    main()
