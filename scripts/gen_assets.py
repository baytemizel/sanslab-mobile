#!/usr/bin/env python3
"""ŞansLab marka varlıkları — "Gece Çekilişi" kimliği.
Gece-laciverdi zemin, parlayan altın şans topu, küçük renkli uydu toplar."""
import cairosvg, os, math

OUT = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(OUT, exist_ok=True)

INK_TOP="#1B1740"; INK_BOT="#08071A"
GOLD_HI="#FFE08A"; GOLD="#F4C04A"; GOLD_DEEP="#C8902B"
RED="#F5333B"; BLUE="#6C8BFF"; PINK="#FF49A3"

def star(cx, cy, r, fill, rot=-90):
    pts=[]
    for i in range(10):
        rad=r if i%2==0 else r*0.42
        a=math.radians(rot + i*36)
        pts.append(f"{cx+rad*math.cos(a):.1f},{cy+rad*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"/>'

def ball(cx, cy, r, base, hi="#FFFFFF", ring=None, num=None, num_fill="#fff"):
    g=f'''
      <circle cx="{cx}" cy="{cy}" r="{r}" fill="{base}" {f'stroke="{ring}" stroke-width="{r*0.09}"' if ring else ''}/>
      <ellipse cx="{cx-r*0.30}" cy="{cy-r*0.34}" rx="{r*0.40}" ry="{r*0.26}" fill="{hi}" opacity="0.55"/>'''
    if num is not None:
        g+=f'<text x="{cx}" y="{cy}" font-family="Arial, sans-serif" font-weight="900" font-size="{r*0.95}" fill="{num_fill}" text-anchor="middle" dominant-baseline="central">{num}</text>'
    return g

def defs():
    return f'''<defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="{INK_TOP}"/><stop offset="1" stop-color="{INK_BOT}"/>
      </linearGradient>
      <radialGradient id="gold" cx="36%" cy="30%" r="78%">
        <stop offset="0" stop-color="{GOLD_HI}"/><stop offset="0.5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_DEEP}"/>
      </radialGradient>
      <radialGradient id="glow" cx="50%" cy="44%" r="55%">
        <stop offset="0" stop-color="{GOLD}" stop-opacity="0.55"/><stop offset="1" stop-color="{GOLD}" stop-opacity="0"/>
      </radialGradient>
    </defs>'''

def scene(cx=512, cy=470, big=250, satellites=True):
    s=f'<circle cx="{cx}" cy="{cy}" r="{big*1.7}" fill="url(#glow)"/>'
    if satellites:
        s+=ball(cx-big*1.05, cy+big*0.95, big*0.42, RED, ring="#ffffff", num="7")
        s+=ball(cx+big*1.02, cy+big*0.78, big*0.40, BLUE, ring="#ffffff", num="4")
    # hero gold ball
    s+=f'<circle cx="{cx}" cy="{cy}" r="{big}" fill="url(#gold)"/>'
    s+=f'<ellipse cx="{cx-big*0.30}" cy="{cy-big*0.34}" rx="{big*0.40}" ry="{big*0.26}" fill="#FFFFFF" opacity="0.5"/>'
    s+=star(cx, cy, big*0.56, "#FFFFFF")
    s+=star(cx, cy, big*0.56, "#3A2A05")  # outline shadow under
    s+=star(cx, cy, big*0.52, "#FFF3D0")
    return s

# ICON
icon=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  {defs()}
  <rect width="1024" height="1024" rx="232" fill="url(#bg)"/>
  <g fill="#ffffff" opacity="0.05">{''.join(f'<circle cx="{90+(i%6)*170}" cy="{120+(i//6)*175}" r="6"/>' for i in range(24))}</g>
  {scene(512, 470, 250)}
</svg>'''
cairosvg.svg2png(bytestring=icon.encode(), write_to=os.path.join(OUT,"icon.png"), output_width=1024, output_height=1024)

# ADAPTIVE (foreground only, padded ~0.7)
adaptive=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  {defs()}
  <g transform="translate(512,512) scale(0.62) translate(-512,-512)">{scene(512,512,250)}</g>
</svg>'''
cairosvg.svg2png(bytestring=adaptive.encode(), write_to=os.path.join(OUT,"adaptive-icon.png"), output_width=1024, output_height=1024)

# SPLASH (transparent — sits on splash bg #08071A)
splash=f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  {defs()}
  {scene(450, 380, 150, satellites=True)}
  <text x="450" y="660" font-family="Arial, sans-serif" font-weight="900" font-size="78" fill="#F4F2FF" text-anchor="middle">Şans<tspan fill="{GOLD}">Lab</tspan></text>
  <text x="450" y="710" font-family="Arial, sans-serif" font-weight="500" font-size="26" fill="#A9A3D6" text-anchor="middle" letter-spacing="2">GECE ÇEKİLİŞİ</text>
</svg>'''
cairosvg.svg2png(bytestring=splash.encode(), write_to=os.path.join(OUT,"splash.png"), output_width=900, output_height=900)

print("Assets generated:", sorted(os.listdir(OUT)))
