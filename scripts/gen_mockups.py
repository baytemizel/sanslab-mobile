#!/usr/bin/env python3
"""ŞansLab — "Gece Çekilişi" mağaza mockup'ları (1242x2688, telefon çerçeveli)."""
import cairosvg, os, html, math

OUT = os.path.join(os.path.dirname(__file__), "..", "store", "screenshots")
os.makedirs(OUT, exist_ok=True)

W, H = 1242, 2688
INK_TOP="#161334"; INK_BOT="#0A0918"
GOLD="#F4C04A"; GOLD_HI="#FFD876"; GOLD_DEEP="#E0A02E"
CLOUD="#F4F2FF"; MIST="#A9A3D6"; CARD_HEX="#211D44"; LINE="rgba(255,255,255,0.10)"; STROKE="#322C5A"
GAMES={"sayisal":("Sayısal Loto","#F5333B"),"super":("Süper Loto","#FFA62B"),
       "sans":("Şans Topu","#FF49A3"),"on":("On Numara","#9D62FF"),"hizli":("Hızlı On","#6C8BFF")}
L_TOP="#FBF8F0"; L_BOT="#F2ECDC"; L_CARD="#FFFFFF"; L_TEXT="#1A1633"; L_SUB="#6A6388"; L_LINE="#ECE4D2"; L_GOLD="#B7841F"
F="DejaVu Sans"
def esc(s): return html.escape(str(s))

PX,PY,PW,PH,PR=54,300,1134,2334,92
SX,SY,SW,SH,SR=PX+18,PY+18,PW-36,PH-36,PR-18
CX0=SX+56; CW=SW-112

def star_pts(cx,cy,r,rot=-90,ratio=0.42):
    p=[]
    for i in range(10):
        rad=r if i%2==0 else r*ratio; a=math.radians(rot+i*36)
        p.append(f"{cx+rad*math.cos(a):.1f},{cy+rad*math.sin(a):.1f}")
    return " ".join(p)

def defs(light=False):
    top,bot=(L_TOP,L_BOT) if light else (INK_TOP,INK_BOT)
    return f'''<defs>
      <linearGradient id="screen" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient>
      <radialGradient id="glow" cx="50%" cy="13%" r="60%"><stop offset="0" stop-color="{GOLD}" stop-opacity="{0.28 if light else 0.22}"/><stop offset="0.55" stop-color="{GOLD}" stop-opacity="0.04"/><stop offset="1" stop-color="{GOLD}" stop-opacity="0"/></radialGradient>
      <linearGradient id="goldBtn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{GOLD_HI}"/><stop offset="0.5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_DEEP}"/></linearGradient>
      <radialGradient id="goldOrb" cx="36%" cy="30%" r="80%"><stop offset="0" stop-color="{GOLD_HI}"/><stop offset="0.5" stop-color="{GOLD}"/><stop offset="1" stop-color="{GOLD_DEEP}"/></radialGradient>
      <linearGradient id="pageBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C1746"/><stop offset="1" stop-color="#070617"/></linearGradient>
    </defs>'''

def sparkles(light=False, seed=7, n=34):
    out=[]; s=seed; col="#C8902B" if light else "#FFFFFF"
    def rnd():
        nonlocal s; s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff
    for _ in range(n):
        x=SX+rnd()*SW; y=SY+rnd()*SH; r=0.8+rnd()*2.0; o=(0.1+rnd()*0.4)*(0.5 if light else 1)
        out.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{col}" opacity="{o:.2f}"/>')
    return "".join(out)

def ball(cx,cy,r,color,special=False,num=None,light=False):
    glow_o=(0.5 if special else 0.30)*(0.4 if light else 1)
    face=color if special else (L_CARD if light else "#0E0C24")
    ring="" if special else f'stroke="{color}" stroke-width="{r*0.10}"'
    hi_o=0.55 if special else (0.85 if light else 0.20)
    digit="#fff" if special else color
    g=f'<circle cx="{cx}" cy="{cy}" r="{r*1.34}" fill="{color}" opacity="{glow_o:.2f}"/>'
    g+=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{face}" {ring}/>'
    g+=f'<ellipse cx="{cx-r*0.30}" cy="{cy-r*0.32}" rx="{r*0.42}" ry="{r*0.28}" fill="#FFFFFF" opacity="{hi_o:.2f}"/>'
    if num is not None:
        g+=f'<text x="{cx}" y="{cy+1}" font-family="{F}" font-weight="bold" font-size="{r*0.82}" fill="{digit}" text-anchor="middle" dominant-baseline="central">{str(num).zfill(2)}</text>'
    return g

def gold_orb(cx,cy,r,star=True):
    g=f'<circle cx="{cx}" cy="{cy}" r="{r*1.5}" fill="{GOLD}" opacity="0.4"/>'
    g+=f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#goldOrb)"/>'
    g+=f'<ellipse cx="{cx-r*0.30}" cy="{cy-r*0.32}" rx="{r*0.40}" ry="{r*0.26}" fill="#FFFFFF" opacity="0.5"/>'
    if star:
        g+=f'<polygon points="{star_pts(cx,cy,r*0.55)}" fill="#3A2A05"/>'
        g+=f'<polygon points="{star_pts(cx,cy,r*0.50)}" fill="#FFF3D0"/>'
    return g

def card(x,y,w,h,light=False,active=False,r=30):
    fill=(L_CARD if light else CARD_HEX); stroke=(GOLD if active else (L_LINE if light else STROKE)); sw=4 if active else 2
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'

def gold_button(x,y,w,h,label,r=30):
    return f'''<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{GOLD}" opacity="0.35"/>
      <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="url(#goldBtn)"/>
      <text x="{x+w/2}" y="{y+h/2+2}" font-family="{F}" font-weight="bold" font-size="42" fill="#241A05" text-anchor="middle" dominant-baseline="central">{esc(label)}</text>'''

def game_button(x,y,w,h,label,color,r=30):
    return f'''<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{color}" opacity="0.30"/>
      <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{color}"/>
      <text x="{x+w/2}" y="{y+h/2+2}" font-family="{F}" font-weight="bold" font-size="42" fill="#fff" text-anchor="middle" dominant-baseline="central">{esc(label)}</text>'''

def check(cx,cy,color):
    return f'<path d="M{cx-9} {cy} l7 8 l13 -16" stroke="{color}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'

def text(x,y,s,size,fill,weight="normal",anchor="start",ls=0):
    extra=f' letter-spacing="{ls}"' if ls else ''
    return f'<text x="{x}" y="{y}" font-family="{F}" font-weight="{weight}" font-size="{size}" fill="{fill}" text-anchor="{anchor}"{extra}>{esc(s)}</text>'

def TXT(l): return L_TEXT if l else CLOUD
def SUB(l): return L_SUB if l else MIST
def GLD(l): return L_GOLD if l else GOLD_HI

def frame(caption,sub,inner,light=False):
    bg=f'<rect width="{W}" height="{H}" fill="url(#pageBg)"/><rect width="{W}" height="{H}" fill="url(#glow)"/>'
    cap=text(W/2,132,caption,68,"#fff","bold","middle")+text(W/2,200,sub,38,"#C9C3EA","normal","middle")
    body=f'''<rect x="{PX}" y="{PY}" width="{PW}" height="{PH}" rx="{PR}" fill="#050410"/>
      <rect x="{PX+6}" y="{PY+6}" width="{PW-12}" height="{PH-12}" rx="{PR-6}" fill="#0c0a1c"/>
      <rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" rx="{SR}" fill="url(#screen)"/>'''
    clip=f'<clipPath id="scr"><rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" rx="{SR}"/></clipPath>'
    glowrect=f'<rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" fill="url(#glow)"/>'
    notch=f'<rect x="{W/2-95}" y="{SY+34}" width="190" height="38" rx="19" fill="#050410"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
      {defs(light)}{clip}{bg}{cap}{body}
      <g clip-path="url(#scr)">{glowrect}{sparkles(light)}{inner}{notch}</g></svg>'''

def s_home(light=False):
    tx,sb,gd=TXT(light),SUB(light),GLD(light); y=SY+150
    s=text(CX0,y,"Şans",60,tx,"bold")+text(CX0+168,y,"Lab",60,gd,"bold")
    s+=f'<rect x="{SX+SW-112}" y="{y-46}" width="64" height="64" rx="20" fill="{L_CARD if light else CARD_HEX}" stroke="{L_LINE if light else STROKE}" stroke-width="2"/>'
    s+=f'<g transform="translate({SX+SW-80},{y-14})"><circle r="3.5" cx="-9" fill="{tx}"/><circle r="3.5" cx="0" fill="{tx}"/><circle r="3.5" cx="9" fill="{tx}"/></g>'
    y+=120
    s+=text(CX0,y,"Şansını dene,",64,tx,"bold")+text(CX0,y+78,"kuponunu üret",64,tx,"bold"); y+=140
    s+=text(CX0,y,"5 oyun · saniyeler içinde · reklamsız Premium",29,sb); y+=78
    bx=CX0+44
    for n,c in [("07",GAMES["sayisal"][1]),("23",GAMES["super"][1]),("34",GAMES["sans"][1]),("11",GAMES["on"][1]),("49",GAMES["hizli"][1])]:
        s+=ball(bx,y,42,c,num=n,light=light); bx+=104
    y+=92
    s+=f'<rect x="{CX0}" y="{y}" width="{CW}" height="118" rx="26" fill="{GOLD}" opacity="0.12"/>'
    s+=f'<rect x="{CX0}" y="{y}" width="{CW}" height="118" rx="26" fill="none" stroke="{GOLD}" stroke-opacity="0.5" stroke-width="2"/>'
    s+=f'<rect x="{CX0+26}" y="{y+30}" width="58" height="58" rx="17" fill="url(#goldBtn)"/>'
    s+=f'<polygon points="{star_pts(CX0+55,y+59,20)}" fill="#241A05"/>'
    s+=text(CX0+112,y+52,"ŞansLab Premium",36,tx,"bold")+text(CX0+112,y+90,"Reklamsız · tüm modlar · geçmiş",26,sb)
    y+=168
    s+=text(CX0,y,"BİR OYUN SEÇ",26,sb,"bold",ls=3); y+=44
    for gid,(name,color) in GAMES.items():
        ch=148; s+=card(CX0,y,CW,ch,light,r=30)
        s+=f'<circle cx="{CX0+62}" cy="{y+ch/2}" r="40" fill="{color}" opacity="0.32"/>'
        s+=f'<circle cx="{CX0+62}" cy="{y+ch/2}" r="30" fill="{color}"/>'
        s+=f'<ellipse cx="{CX0+52}" cy="{y+ch/2-10}" rx="13" ry="8" fill="#fff" opacity="0.5"/>'
        s+=text(CX0+128,y+ch/2-6,name,38,tx,"bold")
        rule={"sayisal":"6 sayı (1–90) + Joker","super":"6 sayı (1–60)","sans":"5 sayı (1–34) + 1 (1–14)","on":"10 sayı (1–80)","hizli":"1–10 sayı seç (1–80)"}[gid]
        s+=text(CX0+128,y+ch/2+36,rule,27,sb)
        s+=f'<circle cx="{CX0+CW-54}" cy="{y+ch/2}" r="26" fill="none" stroke="{L_LINE if light else STROKE}" stroke-width="2"/>'
        s+=f'<path d="M{CX0+CW-64} {y+ch/2+9} l18 -18 M{CX0+CW-58} {y+ch/2-9} l12 0 0 12" stroke="{gd}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
        y+=ch+22
    return s

def s_game(gid,balls_main,joker=None,joker_label="JOKER",mode_idx=0,rows_idx=0,light=False,caption_rule=""):
    tx,sb,gd=TXT(light),SUB(light),GLD(light); name,color=GAMES[gid]; y=SY+150
    s=card(CX0,y,CW,150,light,r=28)
    s+=f'<rect x="{CX0+30}" y="{y+38}" width="18" height="74" rx="9" fill="{color}"/>'
    s+=text(CX0+74,y+72,name,44,tx,"bold")+text(CX0+74,y+116,caption_rule,28,sb); y+=186
    s+=text(CX0,y,"ÜRETİM MODU",26,sb,"bold",ls=2); y+=34
    seg=["Rastgele","Dengeli","Frekans"]; segw=CW/3; s+=card(CX0,y,CW,82,light,r=22)
    for i,t in enumerate(seg):
        sx=CX0+i*segw
        if i==mode_idx: s+=f'<rect x="{sx+8}" y="{y+8}" width="{segw-16}" height="66" rx="16" fill="{"#fff" if light else "rgba(255,255,255,0.10)"}" stroke="{color}" stroke-width="2"/>'
        s+=text(sx+segw/2,y+52,t,29,color if i==mode_idx else sb,"bold","middle")
    y+=118
    s+=text(CX0,y,"KUPON SAYISI",26,sb,"bold",ls=2); y+=34
    rseg=["Tek Kupon","10 Kupon"]; rsw=CW/2; s+=card(CX0,y,CW,82,light,r=22)
    for i,t in enumerate(rseg):
        sx=CX0+i*rsw
        if i==rows_idx: s+=f'<rect x="{sx+8}" y="{y+8}" width="{rsw-16}" height="66" rx="16" fill="{"#fff" if light else "rgba(255,255,255,0.10)"}" stroke="{color}" stroke-width="2"/>'
        s+=text(sx+rsw/2,y+52,t,30,color if i==rows_idx else sb,"bold","middle")
    y+=120
    s+=text(CX0,y,"KUPONUN",26,sb,"bold",ls=2); y+=30
    ch=384 if joker else 200; s+=card(CX0,y,CW,ch,light,r=28)
    s+=text(CX0+36,y+56,"ANA SAYILAR",24,sb,"bold",ls=1)
    many=len(balls_main)>8
    rr=34 if many else 46; step=86 if many else 104
    bx=CX0+(58 if many else 72); by=y+130
    for n in balls_main: s+=ball(bx,by,rr,color,num=n,light=light); bx+=step
    if joker:
        s+=f'<line x1="{CX0+36}" y1="{by+70}" x2="{CX0+CW-36}" y2="{by+70}" stroke="{L_LINE if light else LINE}" stroke-width="2"/>'
        s+=text(CX0+36,by+112,joker_label,24,color,"bold",ls=1)
        s+=ball(CX0+72,by+170,46,color,special=True,num=joker,light=light)
    y+=ch+28
    s+=text(CX0,y,"Her çekiliş bağımsızdır; geçmiş sonuç geleceği tahmin etmez.",24,sb)
    s+=game_button(CX0,SY+SH-150,CW,104,"Tekrar Üret",color)
    return s

def s_on_batch(light=False):
    tx,sb=TXT(light),SUB(light); name,color=GAMES["on"]; y=SY+150
    s=card(CX0,y,CW,150,light,r=28)
    s+=f'<rect x="{CX0+30}" y="{y+38}" width="18" height="74" rx="9" fill="{color}"/>'
    s+=text(CX0+74,y+72,name,44,tx,"bold")+text(CX0+74,y+116,"Tekli veya 10'lu — senin seçimin",28,sb); y+=186
    s+=text(CX0,y,"KUPON SAYISI",26,sb,"bold",ls=2); y+=34
    rseg=["Tek Kupon","10 Kupon"]; rsw=CW/2; s+=card(CX0,y,CW,82,light,r=22)
    for i,t in enumerate(rseg):
        sx=CX0+i*rsw
        if i==1: s+=f'<rect x="{sx+8}" y="{y+8}" width="{rsw-16}" height="66" rx="16" fill="{"#fff" if light else "rgba(255,255,255,0.10)"}" stroke="{color}" stroke-width="2"/>'
        s+=text(sx+rsw/2,y+52,t,30,color if i==1 else sb,"bold","middle")
    y+=118
    s+=text(CX0,y,"10 KUPON",26,sb,"bold",ls=2); y+=30
    rows=[[2,9,18,23,31,40,52,61,74,80],[5,11,27,33,38,45,59,66,71,78],[1,14,22,29,37,44,50,63,69,77],[3,16,25,30,42,48,55,60,72,79]]
    for i,r in enumerate(rows):
        ch=148; s+=card(CX0,y,CW,ch,light,r=24)
        s+=f'<circle cx="{CX0+34}" cy="{y+40}" r="7" fill="{color}"/>'+text(CX0+56,y+48,f"Kupon {i+1}",26,sb,"bold")
        bx=CX0+58; by=y+106
        for n in r: s+=ball(bx,by,33,color,num=n,light=light); bx+=98
        y+=ch+16
    s+=text(CX0,y+18,"… ve 6 kupon daha (toplam 10)",27,sb)
    s+=game_button(CX0,SY+SH-150,CW,104,"Tekrar Üret",color)
    return s

def s_hizli(light=False):
    tx,sb=TXT(light),SUB(light); name,color=GAMES["hizli"]; y=SY+150
    s=card(CX0,y,CW,150,light,r=28)
    s+=f'<rect x="{CX0+30}" y="{y+38}" width="18" height="74" rx="9" fill="{color}"/>'
    s+=text(CX0+74,y+72,name,44,tx,"bold")+text(CX0+74,y+116,"Önce kaç sayı, sonra üret",28,sb); y+=190
    s+=text(CX0,y,"KAÇ SAYI?   ·   7",26,sb,"bold",ls=2); y+=42
    gap=(CW-10*92)/9
    for i in range(10):
        n=i+1; active=(n==7); cx=CX0+i*(92+gap)
        fill=color if active else (L_CARD if light else CARD_HEX); stroke=color if active else (L_LINE if light else STROKE)
        s+=f'<rect x="{cx}" y="{y}" width="92" height="92" rx="22" fill="{fill}" stroke="{stroke}" stroke-width="2"/>'
        s+=f'<text x="{cx+46}" y="{y+46}" font-family="{F}" font-weight="bold" font-size="36" fill="{"#fff" if active else tx}" text-anchor="middle" dominant-baseline="central">{n}</text>'
    y+=158
    s+=text(CX0,y,"KUPONUN",26,sb,"bold",ls=2); y+=30; s+=card(CX0,y,CW,200,light,r=28)
    s+=text(CX0+36,y+56,"7 SAYI (1–80)",24,sb,"bold",ls=1)
    bx=CX0+72; by=y+135
    for n in [4,17,29,38,55,66,73]: s+=ball(bx,by,46,color,num=n,light=light); bx+=104
    y+=240; s+=text(CX0,y,"Hızlı On: 1–10 arası dilediğin kadar sayı oyna.",24,sb)
    s+=game_button(CX0,SY+SH-150,CW,104,"Tekrar Üret",color)
    return s

def s_premium(light=False):
    tx,sb=TXT(light),SUB(light); y=SY+130
    s=f'<rect x="{SX+SW-100}" y="{SY+50}" width="56" height="56" rx="28" fill="{L_CARD if light else CARD_HEX}" stroke="{L_LINE if light else STROKE}" stroke-width="2"/>'
    s+=f'<path d="M{SX+SW-86} {SY+64} l28 28 M{SX+SW-58} {SY+64} l-28 28" stroke="{tx}" stroke-width="4" stroke-linecap="round"/>'
    s+=gold_orb(W/2,y+60,80); y+=200
    s+=text(W/2,y,"ŞansLab Premium",56,tx,"bold","middle")+text(W/2,y+56,"Reklamsız ve sınırsız",32,sb,"normal","middle"); y+=116
    bens=["Reklamları tamamen kaldır","Dengeli & frekans modları","Kupon geçmişi ve favoriler","Sınırsız, kesintisiz üretim","Yeni özelliklere erken erişim"]
    bh=len(bens)*82+40; s+=card(CX0,y,CW,bh,light,r=28); yy=y+66
    for b in bens:
        s+=f'<circle cx="{CX0+50}" cy="{yy-8}" r="20" fill="{GOLD}"/>'+check(CX0+50,yy-8,"#241A05")+text(CX0+92,yy,b,32,tx,"bold"); yy+=82
    y+=bh+30
    for nm,pr,act in [("Aylık","49,99 TL",False),("Yıllık","299,99 TL",True),("Ömür Boyu","599,99 TL",False)]:
        s+=card(CX0,y,CW,116,light,active=act,r=24)
        s+=f'<circle cx="{CX0+44}" cy="{y+58}" r="20" fill="none" stroke="{GOLD if act else (L_LINE if light else STROKE)}" stroke-width="3"/>'
        if act: s+=f'<circle cx="{CX0+44}" cy="{y+58}" r="10" fill="{GOLD}"/>'
        s+=text(CX0+88,y+50,nm,36,tx,"bold")
        if act: s+=text(CX0+88,y+88,"En popüler",24,L_GOLD if light else GOLD)
        s+=text(CX0+CW-40,y+72,pr,42,GLD(light),"bold","end"); y+=132
    s+=gold_button(CX0,SY+SH-150,CW,104,"Premium'a Geç")
    return s

def s_settings(light=False):
    tx,sb=TXT(light),SUB(light); y=SY+150
    s=text(CX0,y,"Ayarlar",56,tx,"bold"); y+=84
    def segrow(label,opts,active,yy):
        s2=text(CX0,yy,label,26,sb,"bold",ls=2); yy+=40; sw=CW/len(opts); s2+=card(CX0,yy,CW,86,light,r=22)
        for i,o in enumerate(opts):
            sx=CX0+i*sw
            if i==active: s2+=f'<rect x="{sx+8}" y="{yy+8}" width="{sw-16}" height="70" rx="16" fill="{"#fff" if light else "rgba(255,255,255,0.10)"}" stroke="{GOLD}" stroke-width="2"/>'
            s2+=text(sx+sw/2,yy+54,o,28,GLD(light) if i==active else sb,"bold","middle")
        return s2,yy+120
    blk,y=segrow("DİL",["Türkçe","English"],0,y); s+=blk
    blk,y=segrow("TEMA",["Sistem","Açık","Koyu"],2,y); s+=blk
    s+=text(CX0,y,"HAKKINDA",26,sb,"bold",ls=2); y+=44
    for label,ic in [("Sorumlu Oyun","shield"),("Gizlilik Politikası","lock"),("Kullanım Koşulları","doc"),("Sürüm  ·  1.0.0","info")]:
        ch=96; s+=card(CX0,y,CW,ch,light,r=22)
        s+=f'<rect x="{CX0+24}" y="{y+ch/2-22}" width="44" height="44" rx="13" fill="{GOLD}" opacity="0.16"/>'
        cx,cy=CX0+46,y+ch/2; G=GLD(light)
        if ic=="shield": s+=f'<path d="M{cx} {cy-13} l13 5 v8 q0 9 -13 14 q-13 -5 -13 -14 v-8 z" fill="none" stroke="{G}" stroke-width="3"/>'
        elif ic=="lock": s+=f'<rect x="{cx-10}" y="{cy-4}" width="20" height="16" rx="3" fill="none" stroke="{G}" stroke-width="3"/><path d="M{cx-6} {cy-4} v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="{G}" stroke-width="3"/>'
        elif ic=="doc": s+=f'<rect x="{cx-9}" y="{cy-13}" width="18" height="26" rx="3" fill="none" stroke="{G}" stroke-width="3"/><line x1="{cx-4}" y1="{cy-5}" x2="{cx+4}" y2="{cy-5}" stroke="{G}" stroke-width="3"/><line x1="{cx-4}" y1="{cy+2}" x2="{cx+4}" y2="{cy+2}" stroke="{G}" stroke-width="3"/>'
        else: s+=f'<circle cx="{cx}" cy="{cy}" r="13" fill="none" stroke="{G}" stroke-width="3"/><line x1="{cx}" y1="{cy-2}" x2="{cx}" y2="{cy+7}" stroke="{G}" stroke-width="3"/><circle cx="{cx}" cy="{cy-8}" r="2.5" fill="{G}"/>'
        s+=text(CX0+92,y+ch/2+8,label,32,tx,"bold")+text(CX0+CW-40,y+ch/2+12,"›",46,sb,"bold","end"); y+=ch+18
    return s

def s_disclaimer(light=False):
    s=f'<rect x="{SX}" y="{SY}" width="{SW}" height="{SH}" fill="#05040F" opacity="0.55"/>'
    cw=CW; cx=CX0; cardh=830; cy=SY+SH/2-cardh/2
    s+=f'<rect x="{cx}" y="{cy}" width="{cw}" height="{cardh}" rx="40" fill="{CARD_HEX}" stroke="{STROKE}" stroke-width="2"/>'
    s+=f'<rect x="{cx+cw/2-44}" y="{cy+70}" width="88" height="88" rx="26" fill="url(#goldBtn)"/>'
    s+=f'<circle cx="{cx+cw/2}" cy="{cy+138}" r="6" fill="#241A05"/><rect x="{cx+cw/2-4}" y="{cy+90}" width="8" height="34" rx="4" fill="#241A05"/>'
    s+=text(cx+cw/2,cy+250,"Dürüst Bir Not",48,CLOUD,"bold","middle")
    lines=["Şans oyunlarında her çekiliş","bağımsızdır. Geçmiş sonuçlar","geleceği tahmin etmez ve hiçbir","yöntem kazanma olasılığını artırmaz.","","ŞansLab yalnızca kupon doldurmayı","kolaylaştıran bir eğlence aracıdır."]
    yy=cy+330
    for ln in lines: s+=text(cx+cw/2,yy,ln,32,MIST,"normal","middle"); yy+=48
    s+=gold_button(cx+50,cy+cardh-130,cw-100,100,"Anladım, devam et")
    return s

def s_hero():
    s=text(SX+SW/2,SY+250,"Tüm şans oyunları",76,CLOUD,"bold","middle")
    s+=text(SX+SW/2,SY+346,"tek yerde",76,GOLD_HI,"bold","middle")
    s+=text(SX+SW/2,SY+428,"Sayısal · Süper · Şans Topu · On Numara · Hızlı On",29,MIST,"normal","middle")
    cx,cy=SX+SW/2,SY+SH/2+50; R=370
    s+=gold_orb(cx,cy,150)
    for n,c,deg in [("07",GAMES["sayisal"][1],-90),("23",GAMES["super"][1],-30),("34",GAMES["sans"][1],30),("11",GAMES["on"][1],90),("49",GAMES["hizli"][1],150),("05",GAMES["sans"][1],210)]:
        a=math.radians(deg); s+=ball(cx+R*math.cos(a),cy+R*math.sin(a),52,c,num=n)
    s+=text(SX+SW/2,SY+SH-200,"Saniyeler içinde kupon üret",36,CLOUD,"bold","middle")
    s+=text(SX+SW/2,SY+SH-150,"Kriptografik rastgelelik · reklamsız Premium",28,MIST,"normal","middle")
    return s

SCREENS=[
 ("01_hero","Tüm şans oyunları tek yerde","Şansını dene, kuponunu üret", lambda: s_hero(), False),
 ("02_home","Sade ve hızlı başlangıç","Bir oyun seç, dokun, üret", lambda: s_home(), False),
 ("03_sayisal","Sayısal Loto + Joker","6 sayı (1–90) + 1 Joker", lambda: s_game("sayisal",[4,17,29,43,61,88],joker=12,caption_rule="6 sayı (1–90) + 1 Joker"), False),
 ("04_super","Süper Loto","6 sayı (1–60)", lambda: s_game("super",[3,15,28,37,49,58],caption_rule="6 sayı (1–60)"), False),
 ("05_sans","Şans Topu","5 sayı (1–34) + 1 (1–14)", lambda: s_game("sans",[6,14,21,28,33],joker=9,joker_label="ŞANS TOPU",mode_idx=1,caption_rule="5 sayı (1–34) + 1 (1–14)"), False),
 ("06_on_batch","Tek mi, 10'lu mu? Sen seç","Tek kupon ve 10 kupon — ücretsiz", lambda: s_on_batch(), False),
 ("07_hizli","Kaç sayı? Senin seçimin","1–10 arası seç, sonra üret", lambda: s_hizli(), False),
 ("08_modes","Akıllı üretim modları","Rastgele · Dengeli · Frekans", lambda: s_game("sayisal",[5,11,24,33,52,67],joker=8,mode_idx=1,caption_rule="Dengeli dağılım modu"), False),
 ("09_premium","Reklamsız ve sınırsız","ŞansLab Premium", lambda: s_premium(), False),
 ("10_settings","Türkçe & İngilizce · açık/koyu","Senin tercihlerin", lambda: s_settings(), False),
 ("11_light","Gündüz teması","Aynı oyun, aydınlık görünüm", lambda: s_game("on",[2,9,18,23,31,40,52,61,74,80],light=True,caption_rule="10 sayı (1–80)"), True),
 ("12_disclaimer","Şeffaf ve dürüst","Kazanma vaadi yok — sadece eğlence", lambda: s_disclaimer(), False),
]

for fid,cap,sub,builder,light in SCREENS:
    svg=frame(cap,sub,builder(),light=light)
    cairosvg.svg2png(bytestring=svg.encode("utf-8"), write_to=os.path.join(OUT,f"{fid}.png"), output_width=W, output_height=H)
    print("wrote",fid)
print("done ->", len(SCREENS), "screens")
