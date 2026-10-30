"""Add pencil guides to reviewed footage, preserving the original narration.

Coordinates are fractions of the complete frame. Timing is specific to the
approved Francisca +10% edits, not to raw recordings. Originals are preserved.
"""
from pathlib import Path
import math
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tmp/tutorials-por-funcao"
OUTPUT = ROOT / "tmp/tutorials-lapis"
FFMPEG = ROOT / ".codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe"
# start, end, center-x, center-y, radius-x, radius-y; no fabricated taps.
TAPS = {
    "consumidor-pdf": [(0.8, 2.4, .215, .59, .13, .060), (5.4, 6.8, .718, .695, .18, .033)],
    "gerador-selecionar-usina": [(0.7, 2.5, .50, .735, .43, .089), (4.0, 5.8, .76, .756, .16, .035)],
    "gerador-clientes-unidades": [(0.7, 2.3, .14, .964, .065, .032), (4.4, 5.9, .44, .804, .37, .054)],
    "gerador-uc-faturas": [(7.0, 8.5, .43, .87, .35, .052), (12.1, 13.6, .47, .716, .43, .045)],
    "gerador-filtrar-faturas": [(0.6, 2.0, .647, .965, .055, .03), (4.1, 5.1, .61, .474, .09, .027), (8.0, 8.8, .83, .474, .075, .027)],
    "gerador-endereco-email": [(0.5, 2.0, .50, .59, .44, .042), (6.0, 7.4, .50, .575, .44, .045)],
    # These two clips demonstrate consultation/scrolling, not button taps.
    "consumidor-total": [],
    "gerador-geracao-carteira": [],
}


def stamp(seconds):
    cs = round(seconds * 100)
    return f"{cs // 360000}:{cs // 6000 % 60:02}:{cs // 100 % 60:02}.{cs % 100:02}"


def polygon(points):
    return "m " + " l ".join(f"{round(x)} {round(y)}" for x, y in points)


def guide(cx, cy, rx, ry, progress):
    # A hand-drawn ellipse, progressively traced. Dark outline remains visible
    # on white backgrounds; the red stroke contrasts with the green controls.
    angles = [-math.pi / 2 + i * 2 * math.pi * progress / 70 for i in range(71)]
    def point(a, pad):
        wobble = 1.4 * math.sin(a * 5)
        return (cx + (rx + pad + wobble) * math.cos(a), cy + (ry + pad + wobble) * math.sin(a))
    path = polygon([point(a, 2.2) for a in angles] + [point(a, -2.2) for a in reversed(angles)])
    x, y = point(angles[-1], 0)
    # Pencil rests with its graphite tip on the line being drawn.
    pencil = polygon([(x, y), (x + 7, y - 18), (x + 28, y - 39), (x + 39, y - 28), (x + 18, y - 7)])
    return path, pencil


def render(name, taps):
    source = SOURCE / f"{name}-francisca10.mp4"
    target = OUTPUT / source.name
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1000
PlayResY: 1000
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Guide,Arial,20,&H003535EF,&H003535EF,&H00FFFFFF,&H00000000,0,0,0,0,100,100,0,0,1,1,0,7,0,0,0,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for start, end, x, y, rx, ry in taps:
        frames = 16
        draw_time = min(.55, (end - start) / 2)
        for i in range(frames):
            a = start + i * draw_time / frames
            b = start + (i + 1) * draw_time / frames if i < frames - 1 else end
            path, pencil = guide(x * 1000, y * 1000, rx * 1000, ry * 1000, (i + 1) / frames)
            for layer, shape in enumerate([path, pencil]):
                events.append(f"Dialogue: {layer},{stamp(a)},{stamp(b)},Guide,,0,0,0,,{{\\an7\\pos(0,0)\\p1}}{shape}{{\\p0}}")
    ass = OUTPUT / f"{name}.ass"
    ass.write_text(header + "\n".join(events), encoding="utf-8")
    args = [str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error", "-i", str(source)]
    if taps:
        args += ["-vf", f"ass=tmp/tutorials-lapis/{name}.ass", "-c:v", "libx264", "-preset", "fast", "-crf", "20", "-pix_fmt", "yuv420p"]
    else:
        args += ["-c:v", "copy"]
    args += ["-map", "0:v:0", "-map", "0:a:0", "-c:a", "copy", "-movflags", "+faststart", str(target)]
    subprocess.run(args, cwd=ROOT, check=True)
    subprocess.run([str(FFMPEG), "-v", "error", "-i", str(target), "-f", "null", "-"], check=True)
    print(f"OK {name}: {len(taps)} guides; audio preserved", flush=True)


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, taps in TAPS.items():
        render(name, taps)
