"""Decode compact edits, verify duration accounting and build a redacted QA sheet."""
import json
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw
from compact_tutorial_pauses import duration, FF, OUT

reports=json.loads((OUT/'compact-pauses-report-20261005.json').read_text(encoding='utf-8'))
sheet=Image.new('RGB',(4*270,2*615),'#eeeeee')
for i,report in enumerate(reports):
    video=Path(report['output'])
    actual=duration(video)
    expected=report['original_seconds']-report['removed_seconds']
    assert abs(actual-expected)<.12,(video.name,actual,expected)
    subprocess.run([str(FF),'-v','error','-i',str(video),'-f','null','NUL'],check=True)
    frame=OUT/f"qa-fluido-{report['tutorial']}.png"
    subprocess.run([str(FF),'-y','-v','error','-ss','7.5','-i',str(video),'-frames:v','1',str(frame)],check=True)
    picture=Image.open(frame).convert('RGB').resize((270,585),Image.Resampling.LANCZOS)
    x,y=(i%4)*270,(i//4)*615
    sheet.paste(picture,(x,y+30))
    ImageDraw.Draw(sheet).text((x+5,y+8),f"{report['tutorial']} - {actual:.1f}s",fill='black')
    print('PASS',video.name,'removed',round(report['removed_seconds'],2),'seconds',flush=True)
sheet.save(OUT/'qa-fluidos-20261005.jpg')
