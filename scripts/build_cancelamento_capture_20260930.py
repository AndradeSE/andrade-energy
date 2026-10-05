"""Private edit: only redacted real Android footage; title/end cards are editorial."""
import asyncio
import math
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from tutorial_annotations import privacy_graph, draw_marker

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/tutorial-previews'
FF = ROOT / '.codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe'
SOURCE = OUT / 'cancelamento-envio-corte-blur-20261004.mp4'
RAW = OUT / 'cancelamento-normalizado-20260930.mp4'
MUSIC = ROOT / 'tmp/tutorials-por-funcao/trilha-instrumental.wav'
FPS = 30
TARGET = OUT / 'tutorial-cancelamento-completo-real-blur-arrows-20261004.mp4'
TEXTS = [
    'Como solicitar o cancelamento do contrato?',
    'Na Home, abra Contrato. No contrato vigente, encontre Cancelar contrato. Esse botão abre o aviso, mas ainda não envia o pedido.',
    'Leia o aviso com atenção. O contrato continua vigente até a decisão do gerador.',
    'Para continuar, toque em Enviar solicitação. O aplicativo confirma o envio, e o botão passa a indicar Aguardando resposta do gerador. Este exemplo foi realizado somente no ambiente de teste.',
]
DURATIONS = [11, 8, 15]

def run(args):
    subprocess.run([str(FF), '-y', *args], check=True)

def card(path, lines, end=False):
    im = Image.new('RGB', (1080, 2340), '#083e31')
    d = ImageDraw.Draw(im)
    font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 66)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 39)
    if end:
        d.ellipse((440, 747, 640, 947), fill='#0bbf79')
        d.line(((482, 847), (524, 887), (602, 800)), fill='white', width=18, joint='curve')
    for i, line in enumerate(lines):
        d.text((540, 1030 + i * 95), line, fill='white', font=font, anchor='mm')
    if end:
        d.text((540, 1280), 'Acompanhe a resposta no aplicativo.', fill='#d9f5e8', font=small, anchor='mm')
    d.text((540, 2100), 'ANDRADE ENERGY · CONSUMIDOR', fill='#8bd9b4', font=small, anchor='mm')
    im.save(path)

async def voices():
    sys.path.insert(0, str(ROOT / 'tmp/tts-tools'))
    result = []
    for i, text in enumerate(TEXTS):
        path = OUT / f'cancelamento-real-20261001-francisca-voz-{i}.mp3'
        if not path.exists():
            import edge_tts
            await edge_tts.Communicate(text, 'pt-BR-FranciscaNeural', rate='+2%').save(str(path))
        result.append(path)
    return result

def build():
    # Recreate privacy from original footage, never blur the old opaque blocks.
    filters = []
    for index, (start, stop) in enumerate([(12,18), (30,38), (52,67)]):
        padding = ',tpad=stop_mode=clone:stop_duration=5' if index == 0 else ''
        filters.append(f'[0:v]fps={FPS},trim=start={start}:end={stop},setpts=PTS-STARTPTS{padding}[raw{index}]')
        filters.append(privacy_graph(f'raw{index}', 'drawbox=x=185:y=115:w=495:h=125:color=0x064637:t=fill,drawbox=x=215:y=300:w=475:h=125:color=0x326b5b:t=fill', f'private{index}', f'privacy{index}'))
    filters.append('[private0][private1][private2]concat=n=3:v=1:a=0[redacted]')
    run(['-i', str(RAW), '-filter_complex', ';'.join(filters), '-map', '[redacted]', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '21', str(SOURCE), '-loglevel', 'error'])
    audio = asyncio.run(voices())
    intro, outro = OUT / 'cancelamento-real-20260930-titulo.png', OUT / 'cancelamento-real-20260930-final.png'
    card(intro, ['Como solicitar o', 'cancelamento do contrato?'])
    card(outro, ['Tutorial concluído'], True)
    frames = OUT / 'frames-cancelamento-real-20260930'
    frames.mkdir(exist_ok=True)
    # Source times below were checked against the real cut, not invented UI.
    for n in range(34 * FPS):
        t = n / FPS
        im = Image.new('RGBA', (1080, 2340), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        # The source begins after the 4.5 s title. Mark an action only while
        # its actual control is visible in the captured app, never on Home.
        for bounds, start, stop in [
            ((710, 2140, 875, 2290), 0.4, 2.2),   # Home > Contrato
            ((95, 1520, 1010, 1700), 3.6, 6.8),   # Cancelar contrato
            ((570, 1310, 1000, 1435), 21.0, 22.6), # Apenas enquanto o botão está visível
        ]:
            if not start <= t <= stop:
                continue
            x1,y1,x2,y2 = bounds
            progress = min(1, (t-start)/.8)
            count = max(2, int(progress*90))
            pts = []
            for j in range(count+1):
                a = math.radians(-120 + 350*progress*j/count)
                pts.append(((x1+x2)/2+(x2-x1)/2*math.cos(a), (y1+y2)/2+(y2-y1)/2*math.sin(a)))
            alpha = int(235*min(1,(stop-t)/.4))
            draw_marker(d, bounds, progress, alpha)
        im.save(frames / f'{n:04d}.png')
    args = ['-i',str(SOURCE)]
    for path in audio: args += ['-i',str(path)]
    args += ['-stream_loop','-1','-i',str(MUSIC),'-loop','1','-i',str(intro),'-loop','1','-i',str(outro),'-framerate',str(FPS),'-i',str(frames/'%04d.png')]
    filters = [f'[0:v]fps={FPS}[source];[source][8:v]overlay=shortest=1:format=auto[real]', f'[6:v]fps={FPS},trim=duration=4.5,setpts=PTS-STARTPTS[title]', f'[7:v]fps={FPS},trim=duration=3,setpts=PTS-STARTPTS[end]', '[title][real][end]concat=n=3:v=1:a=0[v]']
    for i, duration in enumerate([4.5,*DURATIONS]):
        filters.append(f'[{i+1}:a]highpass=f=70,loudnorm=I=-18:TP=-2:LRA=7,aresample=48000,adelay=150,apad,atrim=duration={duration},asetpts=PTS-STARTPTS[a{i}]')
    filters += ['[a0][a1][a2][a3]concat=n=4:v=0:a=1,apad,atrim=duration=41.5[voice]', '[5:a]volume=1.9,atrim=duration=41.5,afade=t=out:st=39:d=2.5[music]', '[voice][music]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.92[a]']
    run([*args,'-filter_complex',';'.join(filters),'-map','[v]','-map','[a]','-t','41.5','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',str(TARGET),'-loglevel','error'])
    print(TARGET)

if __name__ == '__main__':
    build()
