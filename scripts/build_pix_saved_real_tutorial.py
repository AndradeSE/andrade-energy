"""Edit the completed Pix-key flow using only captured Preview app screens.

The source recordings contain a password, authenticator code, email, phone
number and payee. Never distribute them. This script masks those regions in
every included scene and writes only to outputs/tutorial-previews for QA.
"""

from __future__ import annotations

import asyncio
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont
from tutorial_annotations import privacy_graph, draw_marker


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "outputs" / "tutorial-previews"
FFMPEG = ROOT / ".codex-ffmpeg" / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
MUSIC = ROOT / "tmp" / "tutorials-por-funcao" / "trilha-instrumental.wav"
RAWS = [
    ROOT / "tmp" / "device-debug" / "pix-home-finance-real-20261002.mp4",
    ROOT / "tmp" / "device-debug" / "pix-authorized-real-20261002.mp4",
    ROOT / "tmp" / "device-debug" / "pix-save-result-real-20261002.mp4",
]
TARGET = OUT / "tutorial-chave-pix-salva-real-blur-arrows-20261004.mp4"
FPS = 30
INTRO = 4.4
OUTRO = 2.8
SCENES = [
    # narration, input, start, end, duration, redactions in source pixels
    ("Na Home do Gerador, toque em Financeiro.", 0, 7, 17, 10, []),
    ("Em Proteção das transferências, confirme sua senha e o código do autenticador no próprio aplicativo.", 0, 51, 60, 8, []),
    ("Informe a chave Pix. O tipo aparece automaticamente. Confira a chave e toque em Validar titular e salvar.", 1, 16, 25, 9, [(150, 840, 790, 150)]),
    ("O aplicativo mostra o titular encontrado. Confirme apenas se ele for o destinatário correto.", 2, 0, 5, 7, [(150, 850, 790, 95, "0x5A625E"), (100, 1080, 850, 105, "0x424242")]),
    ("Depois de confirmar, aguarde a mensagem de chave salva com segurança.", 2, 16, 27, 7, [(150, 850, 790, 95, "0x5A625E")]),
    ("A chave aparece na carteira, ainda sem ativar transferências automáticas. Nenhuma transferência foi feita neste tutorial.", 2, 69, 79, 10, [(150, 850, 790, 160), (245, 1305, 700, 115)]),
]


def run(args: list[str]) -> None:
    subprocess.run(args, check=True)


def cards() -> tuple[Path, Path]:
    home = Image.open(ROOT / "tmp" / "device-debug" / "gerador-home2.png").convert("RGBA")
    home = home.resize((1080, 2340)).filter(ImageFilter.GaussianBlur(25))
    home = Image.alpha_composite(home, Image.new("RGBA", home.size, (0, 70, 52, 145)))
    intro = OUT / "pix-salva-abertura.png"
    draw = ImageDraw.Draw(home)
    bold = "C:/Windows/Fonts/arialbd.ttf"
    draw.text((540, 1020), "Como cadastrar uma", fill="white", font=ImageFont.truetype(bold, 61), anchor="mm")
    draw.text((540, 1110), "chave Pix?", fill="white", font=ImageFont.truetype(bold, 68), anchor="mm")
    home.convert("RGB").save(intro)

    outro = OUT / "pix-salva-encerramento.png"
    image = Image.new("RGB", (1080, 2340), "#083e31")
    draw = ImageDraw.Draw(image)
    draw.ellipse((440, 760, 640, 960), fill="#0bbf79")
    draw.line(((480, 855), (525, 895), (602, 805)), fill="white", width=18, joint="curve")
    draw.text((540, 1030), "Tutorial concluído", fill="white", font=ImageFont.truetype(bold, 72), anchor="mm")
    draw.text((540, 1145), "Confirme sempre o titular antes de salvar.", fill="#d9f5e8", font=ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 36), anchor="mm")
    draw.text((540, 2100), "ANDRADE ENERGY  ·  GERADOR", fill="#8bd9b4", font=ImageFont.truetype(bold, 34), anchor="mm")
    image.save(outro)
    return intro, outro


def brush_frames(index: int, box: tuple[int, int, int, int]) -> Path:
    """Draw a smooth, progressively traced brush circle around a real control."""
    folder = OUT / f"pix-salva-pincel-{index}"
    folder.mkdir(exist_ok=True)
    x1, y1, x2, y2 = box
    path = []
    for step in range(240):
        angle = math.radians(-115 + 345 * step / 239)
        # Gentle, repeatable hand movement; no sharp corners or jitter.
        radius = 1 + 0.003 * math.sin(angle * 3 + index)
        path.append(((x1+x2)/2 + (x2-x1)/2 * math.cos(angle) * radius,
                     (y1+y2)/2 + (y2-y1)/2 * math.sin(angle) * radius))
    for frame in range(91):
        seconds = frame / FPS
        progress = min(1.0, seconds / 1.1)
        opacity = 225 if seconds < 2.5 else max(0, int(225 * (3.0 - seconds) / 0.5))
        image = Image.new("RGBA", (1080, 2340), (0, 0, 0, 0))
        if progress > 0 and opacity:
            draw = ImageDraw.Draw(image)
            count = max(2, round(progress * len(path)))
            draw_marker(draw, box, progress, opacity)
        image.save(folder / f"frame-{frame:03d}.png")
    return folder


async def voices() -> list[Path]:
    sys.path.insert(0, str(ROOT / "tmp" / "tts-tools"))

    scripts = ["Como cadastrar uma chave Pix?"] + [scene[0] for scene in SCENES]
    files = []
    for n, words in enumerate(scripts):
        file = OUT / (f"pix-salva-voz-{n}-sync2.mp3" if n == 3 else f"pix-salva-voz-{n}.mp3")
        if not file.exists():
            import edge_tts
            await edge_tts.Communicate(words, "pt-BR-FranciscaNeural", rate="+0%").save(str(file))
        files.append(file)
    return files


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    intro, outro = cards()
    voice_files = asyncio.run(voices())
    # Speech references these controls at these exact positions in the edit.
    marker_starts = [7.0, 27.0, 34.7, 46.5]
    markers = [brush_frames(n, box) for n, box in enumerate([
        (785, 2145, 945, 2310),
        (125, 1010, 960, 1165),
        (515, 1315, 980, 1460),
        (145, 1180, 970, 1470),
    ])]

    args = [str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error"]
    for file in RAWS + voice_files:
        args += ["-i", str(file)]
    args += ["-stream_loop", "-1", "-i", str(MUSIC)]
    for file in (intro, outro):
        args += ["-loop", "1", "-i", str(file)]
    for folder in markers:
        args += ["-framerate", str(FPS), "-i", str(folder / "frame-%03d.png")]

    filters = []
    for n, (_, source, start, stop, duration, redactions) in enumerate(SCENES):
        masks = "".join(f",drawbox=x={box[0]}:y={box[1]}:w={box[2]}:h={box[3]}:color={box[4] if len(box)>4 else '0xDDE9E5'}:t=fill" for box in redactions)
        filters.append(f"[{source}:v]fps={FPS},trim=start={start}:end={stop},setpts=PTS-STARTPTS[raw{n}]")
        filters.append(privacy_graph(f'raw{n}', masks.lstrip(',') or 'null', f'private{n}', f'privacy{n}'))
        filters.append(f"[private{n}]tpad=stop_mode=clone:stop_duration={duration},trim=duration={duration},setpts=PTS-STARTPTS[v{n}]")
        filters.append(f"[{3+n+1}:a]highpass=f=75,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,adelay=180,apad,atrim=duration={duration},asetpts=PTS-STARTPTS[a{n}]")
    filters += [
        f"[11:v]fps={FPS},trim=duration={INTRO},setpts=PTS-STARTPTS[opening]",
        f"[12:v]fps={FPS},trim=duration={OUTRO},setpts=PTS-STARTPTS[ending]",
        "[opening]"+"".join(f"[v{n}]" for n in range(len(SCENES)))+"[ending]concat=n=8:v=1:a=0[base]",
        f"[3:a]highpass=f=75,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,apad,atrim=duration={INTRO},asetpts=PTS-STARTPTS[atitle]",
        "[atitle]"+"".join(f"[a{n}]" for n in range(len(SCENES)))+"concat=n=7:v=0:a=1[spoken]",
        f"[spoken]apad=pad_dur={OUTRO},atrim=duration={INTRO+sum(s[4] for s in SCENES)+OUTRO}[voice]",
        f"[10:a]volume=1.9,atrim=duration={INTRO+sum(s[4] for s in SCENES)+OUTRO}[music]",
        "[voice][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.92[audio]",
    ]
    # Markers follow the exact controls in the retained real source scenes.
    previous = "base"
    for n, begin in enumerate(marker_starts):
        output = "video" if n == len(marker_starts)-1 else f"overlay{n}"
        filters.append(f"[{13+n}:v]setpts=PTS+{begin}/TB[brush{n}]")
        filters.append(f"[{previous}][brush{n}]overlay=eof_action=pass:format=auto[{output}]")
        previous = output

    run(args + ["-filter_complex", ";".join(filters), "-map", "[video]", "-map", "[audio]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(TARGET)])
    print(TARGET)


if __name__ == "__main__":
    build()
