"""Remove only stationary trailing holds after speech; cut audio/video together."""
import asyncio
import importlib.util
import json
import math
import re
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/tutorial-previews'
FF = ROOT / '.codex-ffmpeg/node_modules/ffmpeg-static/ffmpeg.exe'
LAYOUT_LOCK = threading.Lock()

def duration(path):
    result = subprocess.run([str(FF), '-hide_banner', '-i', str(path)], capture_output=True, text=True)
    match = re.search(r'Duration: (\d+):(\d+):([\d.]+)', result.stderr)
    if not match: raise RuntimeError(f'Invalid media: {path.name}')
    h,m,s = map(float,match.groups())
    return h*3600+m*60+s

def load(script, arguments):
    previous = sys.argv
    sys.argv = [script, *arguments]
    spec = importlib.util.spec_from_file_location('tutorial_edit', ROOT/'scripts'/script)
    module = importlib.util.module_from_spec(spec)
    try: spec.loader.exec_module(module)
    finally: sys.argv = previous
    return module

def layout(kind):
    if kind in ('plano','multiempresas','faturamento','analise-cancelamento','renovacao-gerador'):
        arguments = [] if kind=='plano' else ['--'+kind]
        module = load('edit_real_plano_20260930.py',arguments)
        audio = asyncio.run(module.voices())
        lengths = [max(5,duration(audio[0])+1)] + [
            max((s[2]-s[1])/module.SPEEDS.get(i,1)+module.LEADS.get(i,module.ACTION_LEAD),duration(audio[i+1])+.8)
            for i,s in enumerate(module.SCENES)]
        return audio,lengths,.2,f'tutorial-{kind}-real-final-20261004.mp4'
    if kind=='cancelamento':
        module = load('build_cancelamento_capture_20260930.py',[])
        return asyncio.run(module.voices()),[4.5,*module.DURATIONS],.15,'tutorial-cancelamento-completo-real-final-20261004.mp4'
    if kind=='pix':
        module = load('build_pix_saved_real_tutorial.py',[])
        return asyncio.run(module.voices()),[module.INTRO,*[s[4] for s in module.SCENES]],.18,'tutorial-chave-pix-salva-real-final-20261004.mp4'
    module = load('build_real_contract_revision_tutorial.py',[])
    return asyncio.run(module.voices()),[module.TITLE_DURATION,*[s[3] for s in module.SCENES]],.2,'tutorial-revisao-real-consumidor-final-20261004.mp4'

def compact(kind):
    # The legacy editors choose variants through sys.argv; serialize imports,
    # but allow two independent media encodes to run concurrently.
    with LAYOUT_LOCK:
        audio,lengths,delay,name = layout(kind)
    source = OUT/name
    total = duration(source)
    silence = []
    cursor = 0
    for index,(voice,length) in enumerate(zip(audio,lengths)):
        # Keep title spacing, every spoken word and a breathing gap at transitions.
        start = cursor+duration(voice)+delay+.25
        end = cursor+length-.35
        if index and end-start>1.2: silence.append((start,end))
        cursor += length
    scan = subprocess.run([str(FF),'-hide_banner','-i',str(source),'-vf',
        'scale=270:-2,freezedetect=n=-38dB:d=1.2','-an','-f','null','NUL'],capture_output=True,text=True,check=True)
    freezes=[]
    start=None
    for line in scan.stderr.splitlines():
        match=re.search(r'freeze_start: ([\d.]+)',line)
        if match: start=float(match.group(1))
        match=re.search(r'freeze_end: ([\d.]+)',line)
        if match and start is not None:
            freezes.append((start,float(match.group(1))));start=None
    if start is not None: freezes.append((start,total))
    cuts=[]
    for a,b in silence:
        for c,d in freezes:
            left=math.ceil(max(a,c+.2)*30)/30
            right=math.floor(min(b,d-.2)*30)/30
            if right-left>1.2: cuts.append((left,right))
    cuts.sort()
    merged=[]
    for a,b in cuts:
        if merged and a<=merged[-1][1]: merged[-1]=(merged[-1][0],max(b,merged[-1][1]))
        else: merged.append((a,b))
    target=OUT/name.replace('final-20261004','fluido-20261005')
    intervals=[];cursor=0
    for a,b in merged:
        intervals.append((cursor,a));cursor=b
    intervals.append((cursor,total))
    graph=[]
    for i,(a,b) in enumerate(intervals):
        graph.extend([f'[0:v]trim=start={a}:end={b},setpts=PTS-STARTPTS[v{i}]',
                      f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS[a{i}]'])
    graph.append(''.join(f'[v{i}][a{i}]' for i in range(len(intervals)))+f'concat=n={len(intervals)}:v=1:a=1[v][a]')
    subprocess.run([str(FF),'-y','-loglevel','error','-filter_complex_threads','2','-i',str(source),
        '-filter_complex',';'.join(graph),'-map','[v]','-map','[a]','-c:v','libx264','-threads','2',
        '-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-r','30','-c:a','aac','-b:a','160k',
        '-metadata:s:a:0','language=por','-movflags','+faststart',str(target)],check=True)
    report={'tutorial':kind,'original_seconds':total,'removed_seconds':sum(b-a for a,b in merged),'cuts':merged,'output':str(target)}
    print(json.dumps(report,ensure_ascii=False),flush=True)
    return report

if __name__=='__main__':
    kinds=sys.argv[1:] or ['plano','multiempresas','faturamento','analise-cancelamento','renovacao-gerador','cancelamento','pix','revisao']
    with ThreadPoolExecutor(max_workers=2) as pool:
        reports=list(pool.map(compact,kinds))
    (OUT/'compact-pauses-report-20261005.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2),encoding='utf-8')
