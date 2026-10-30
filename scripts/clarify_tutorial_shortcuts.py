"""Clarify the customizable shortcut without changing real actions or timing."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FF = ROOT / '.codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe'
OUT = ROOT / 'outputs/tutorial-previews'
source = OUT / 'tutorial-faturamento-real-fluido-20261005.mp4'
target = OUT / 'tutorial-faturamento-atalhos-20261005.mp4'
font = "C\\:/Windows/Fonts/arialbd.ttf"
filters = ','.join([
    f"drawtext=fontfile='{font}':text='Atalhos podem mudar de posição':x=(w-tw)/2:y=1120:fontsize=32:fontcolor=0x083e31:shadowcolor=white:shadowx=1:shadowy=1:enable='between(t,4,8)'",
    f"drawtext=fontfile='{font}':text='Procure pelo nome Faturar via PDF':x=(w-tw)/2:y=1160:fontsize=30:fontcolor=0x083e31:shadowcolor=white:shadowx=1:shadowy=1:enable='between(t,4,8)'",
])
subprocess.run([str(FF), '-y', '-hide_banner', '-loglevel', 'error', '-i', str(source),
    '-vf', filters, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264',
    '-preset', 'veryfast', '-crf', '20', '-c:a', 'copy', '-movflags', '+faststart', str(target)], check=True)
subprocess.run([str(FF), '-hide_banner', '-loglevel', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
subprocess.run([str(FF), '-y', '-loglevel', 'error', '-ss', '5', '-i', str(target),
    '-frames:v', '1', str(OUT / 'qa-atalhos-corrigidos.png')], check=True)
print(target, flush=True)
