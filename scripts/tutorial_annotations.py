"""Localized privacy filters and compact annotations for real recordings."""
import math
import re
from PIL import Image, ImageDraw


def privacy_graph(source, privacy, output, prefix):
    """Replace opaque masks with blurred copies of the original pixels."""
    graph = []
    previous = source
    boxes = re.findall(r"drawbox=x=(\d+):y=(\d+):w=(\d+):h=(\d+):color=[^,:]+:t=fill(?::enable='([^']+)')?", privacy)
    for index, (x, y, width, height, enable) in enumerate(boxes):
        base, region, blurred, result = [f"{prefix}{index}{suffix}" for suffix in ('base', 'region', 'blur', 'out')]
        graph.append(f"[{previous}]split=2[{base}][{region}]")
        graph.append(f"[{region}]crop={width}:{height}:{x}:{y},gblur=sigma=24:steps=3[{blurred}]")
        timing = f":enable='{enable}'" if enable else ''
        graph.append(f"[{base}][{blurred}]overlay=x={x}:y={y}{timing}[{result}]")
        previous = result
    residual = re.sub(r"drawbox=x=\d+:y=\d+:w=\d+:h=\d+:color=[^,:]+:t=fill(?::enable='[^']+')?", 'null', privacy)
    graph.append(f"[{previous}]{residual}[{output}]")
    return ';'.join(graph)


def draw_marker(draw, bounds, progress, alpha):
    x1, y1, x2, y2 = bounds
    color = (222, 35, 43, alpha)
    if x2 - x1 <= 300 and y2 - y1 <= 300:
        points = [((x1+x2)/2+(x2-x1)/2*math.cos(math.radians(-120+345*j/100)),
                   (y1+y2)/2+(y2-y1)/2*math.sin(math.radians(-120+345*j/100)))
                  for j in range(max(2, round(100*progress))+1)]
        draw.line(points, fill=color, width=9, joint='curve')
        return
    # Filled tapered curved pointer, matching the user's visual reference.
    # Fade the complete silhouette in; its point never moves off the target.
    tip = ((x1+x2)/2, y1+8)
    ease = 1 - (1 - max(0, min(1, progress))) ** 3
    opacity = round(alpha * ease)
    tail = (max(35, tip[0]-160), max(35, tip[1]-145))
    control = (tip[0]+15, tail[1]-20)
    angle = math.atan2(tip[1]-control[1], tip[0]-control[0])
    base = (tip[0]-42*math.cos(angle),tip[1]-42*math.sin(angle))
    left, right = [], []
    for step in range(49):
        t = step / 48
        x = (1-t)**2*tail[0]+2*(1-t)*t*control[0]+t*t*base[0]
        y = (1-t)**2*tail[1]+2*(1-t)*t*control[1]+t*t*base[1]
        dx = 2*(1-t)*(control[0]-tail[0])+2*t*(base[0]-control[0])
        dy = 2*(1-t)*(control[1]-tail[1])+2*t*(base[1]-control[1])
        length = max(1, math.hypot(dx,dy))
        half_width = 1 + 9 * math.sin(t*math.pi/2)
        left.append((x-dy/length*half_width,y+dx/length*half_width))
        right.append((x+dy/length*half_width,y-dx/length*half_width))
    wing_left = (base[0]-23*math.sin(angle),base[1]+23*math.cos(angle))
    wing_right = (base[0]+23*math.sin(angle),base[1]-23*math.cos(angle))
    shape = [*left,wing_left,tip,wing_right,*reversed(right)]
    # Supersample the silhouette, including a sharp triangular head (no rounded
    # stroke joint at the tip). Keep the target fixed throughout the fade.
    image = draw._image
    scale = 3
    x0, y0 = math.floor(min(p[0] for p in shape))-3, math.floor(min(p[1] for p in shape))-3
    width = math.ceil(max(p[0] for p in shape))-x0+4
    height = math.ceil(max(p[1] for p in shape))-y0+4
    layer = Image.new('RGBA', (width*scale,height*scale))
    painter = ImageDraw.Draw(layer)
    polygon = [((x-x0)*scale,(y-y0)*scale) for x,y in shape]
    painter.polygon(polygon, fill=(230,30,40,opacity))
    painter.line([*polygon,polygon[0]], fill=(35,39,45,round(opacity*.8)), width=scale)
    image.alpha_composite(layer.resize((width,height),Image.Resampling.LANCZOS),(x0,y0))
