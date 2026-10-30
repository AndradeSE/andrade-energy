"""Edit a contract-revision tutorial from the captured Consumer app only.

This deliberately stops before contractual acceptance. No UI is simulated.
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
RAW = ROOT / "tmp" / "device-debug" / "consumer-navigation-long-20261002.mp4"
RAW_NEW = RAW
FFMPEG = ROOT / ".codex-ffmpeg" / "node_modules" / "ffmpeg-static" / "ffmpeg.exe"
MUSIC = ROOT / "tmp" / "tutorials-por-funcao" / "trilha-instrumental.wav"
TARGET = OUT / "tutorial-revisao-real-consumidor-blur-arrows-20261004.mp4"
FPS = 30
TITLE_DURATION = 4.5
OUTRO_DURATION = 2.6
SCENES = [
    ("Na Home, abra Contrato.", 10.0, 15.0, 5.0, "app", 0),
    # Stop before the PDF viewer opens in the raw capture (52.672 s). The
    # following scene applies full-frame blur before any document is shown.
    ("A revisão está pendente. Antes de concordar, abra a nova minuta.", 46.0, 52.5, 8.0, "app", 1),
    ("O documento abre no leitor do celular. Leia todas as cláusulas e valores. Só concorde depois de ler. Nenhum aceite é enviado neste vídeo.", 54.0, 66.0, 12.0, "pdf", 1),
]


def run(arguments: list[str]) -> None:
    subprocess.run(arguments, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def title_card() -> Path:
    frame = OUT / "revisao-real-abertura.png"
    home = ROOT / "tmp" / "device-debug" / "consumer-home2.png"
    picture = Image.open(home).convert("RGBA").resize((1080, 2340)).filter(ImageFilter.GaussianBlur(24))
    picture = Image.alpha_composite(picture, Image.new("RGBA", picture.size, (0, 71, 51, 150)))
    draw = ImageDraw.Draw(picture)
    font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 62)
    draw.text((540, 1015), "Como conferir uma revisão", font=font, fill="white", anchor="mm")
    draw.text((540, 1105), "do contrato?", font=font, fill="white", anchor="mm")
    picture.convert("RGB").save(frame)
    return frame


def outro_card() -> Path:
    frame = OUT / "revisao-real-encerramento.png"
    picture = Image.new("RGB", (1080, 2340), "#083e31")
    draw = ImageDraw.Draw(picture)
    bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 71)
    regular = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 42)
    draw.ellipse((440, 750, 640, 950), fill="#0bbf79")
    draw.line(((482, 848), (526, 890), (602, 800)), fill="white", width=18, joint="curve")
    draw.text((540, 1025), "Tutorial concluído", font=bold, fill="white", anchor="mm")
    draw.text((540, 1140), "Leia a minuta antes de aceitar.", font=regular, fill="#d9f5e8", anchor="mm")
    draw.text((540, 2120), "ANDRADE ENERGY  ·  CONSUMIDOR", font=ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 34), fill="#8bd9b4", anchor="mm")
    picture.save(frame)
    return frame


async def voices() -> list[Path]:
    sys.path.insert(0, str(ROOT / "tmp" / "tts-tools"))

    scripts = ["Como conferir uma revisão do contrato?"] + [scene[0] for scene in SCENES]
    result = []
    for index, script in enumerate(scripts):
        file = OUT / f"revisao-real-v2-voz-{index}.mp3"
        if not file.exists():
            import edge_tts
            await edge_tts.Communicate(script, "pt-BR-FranciscaNeural", rate="+2%").save(str(file))
        result.append(file)
    return result


def marker_frames(length: float) -> Path:
    folder = OUT / "frames-revisao-real-marcacoes"
    folder.mkdir(parents=True, exist_ok=True)
    marks = [
        ((695, 2140, 870, 2300), 7.0, 8.5),
        ((80, 1230, 1010, 1380), 10.0, 14.0),
    ]
    for number in range(math.ceil(length * FPS)):
        time = number / FPS
        frame = Image.new("RGBA", (1080, 2340), (0, 0, 0, 0))
        draw = ImageDraw.Draw(frame, "RGBA")
        for (x1, y1, x2, y2), start, stop in marks:
            if not start <= time <= stop:
                continue
            progress = min(1.0, (time - start) / 0.9)
            fade = min(1.0, (stop - time) / 0.5)
            points = []
            for step in range(max(3, int(progress * 100)) + 1):
                angle = math.radians(-120 + 350 * step / 100)
                x = (x1 + x2) / 2 + (x2 - x1) / 2 * math.cos(angle)
                y = (y1 + y2) / 2 + (y2 - y1) / 2 * math.sin(angle)
                points.append((round(x), round(y)))
            opacity = round(235 * fade)
            draw_marker(draw, (x1,y1,x2,y2), progress, opacity)
        frame.save(folder / f"frame-{number:04d}.png")
    return folder


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    audio = asyncio.run(voices())
    intro = title_card()
    outro = outro_card()
    length = TITLE_DURATION + sum(scene[3] for scene in SCENES) + OUTRO_DURATION
    markers = marker_frames(length)
    command = [str(FFMPEG), "-y", "-i", str(RAW), "-i", str(RAW_NEW)]
    for file in audio:
        command += ["-i", str(file)]
    command += ["-stream_loop", "-1", "-i", str(MUSIC)]
    command += ["-loop", "1", "-t", str(OUTRO_DURATION), "-i", str(outro)]
    command += ["-framerate", str(FPS), "-i", str(markers / "frame-%04d.png")]
    command += ["-loop", "1", "-t", str(TITLE_DURATION), "-i", str(intro)]
    filters = []
    for index, (_, start, stop, seconds, kind, source) in enumerate(SCENES):
        privacy = ""
        if kind == "app":
            # Fixed header contains the account holder, UC and the private unit name.
            privacy = (
                ",drawbox=x=185:y=115:w=495:h=125:color=0x064637:t=fill"
                ",drawbox=x=215:y=300:w=475:h=125:color=0x326b5b:t=fill"
            )
        elif kind == "pdf":
            # The PDF itself can reveal identifiers at any scroll position.
            privacy = ",gblur=sigma=24"
        filters.append(
            # Android records unchanged screens sparsely. Normalize before trim
            # so silent intervals cannot shorten a scene and shift every marker.
            f"[{source}:v]fps={FPS},trim=start={start}:end={stop},setpts=PTS-STARTPTS[raw{index}]"
        )
        filters.append(privacy_graph(f'raw{index}', privacy.lstrip(',') or 'null', f'private{index}', f'privacy{index}'))
        filters.append(
            f"[private{index}]"
            f"tpad=stop_mode=clone:stop_duration={seconds},trim=duration={seconds},setpts=PTS-STARTPTS[v{index}]"
        )
        filters.append(
            f"[{index + 3}:a]highpass=f=70,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,adelay=200,apad,atrim=duration={seconds},"
            f"asetpts=PTS-STARTPTS[a{index}]"
        )
    intro_input = len(SCENES) + 6
    outro_input = len(SCENES) + 4
    music_input = len(SCENES) + 3
    marker_input = len(SCENES) + 5
    filters += [
        f"[{intro_input}:v]trim=duration={TITLE_DURATION},setpts=PTS-STARTPTS,fps={FPS}[intro]",
        f"[{outro_input}:v]trim=duration={OUTRO_DURATION},setpts=PTS-STARTPTS,fps={FPS}[outro]",
        "[intro]" + "".join(f"[v{i}]" for i in range(len(SCENES))) + f"[outro]concat=n={len(SCENES)+2}:v=1:a=0[base]",
        f"[2:a]highpass=f=70,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,apad,atrim=duration={TITLE_DURATION},asetpts=PTS-STARTPTS[atitle]",
        "[atitle]" + "".join(f"[a{i}]" for i in range(len(SCENES))) + f"concat=n={len(SCENES)+1}:v=0:a=1[voice]",
        f"[voice]apad=pad_dur={OUTRO_DURATION},atrim=duration={length}[voicefull]",
        f"[{music_input}:a]volume=1.9,atrim=duration={length}[music]",
        "[voicefull][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.92[audio]",
        f"[base][{marker_input}:v]overlay=shortest=1:format=auto[video]",
    ]
    run(command + ["-filter_complex", ";".join(filters), "-map", "[video]", "-map", "[audio]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(TARGET), "-loglevel", "error"])
    print(TARGET)


if __name__ == "__main__":
    build()
