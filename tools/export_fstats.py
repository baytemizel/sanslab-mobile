#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Arşivden src/games/fstats.ts üretir. Kullanım: python3 tools/export_fstats.py <arşiv.xlsx>"""
import importlib.util, json, sys, os
HERE=os.path.dirname(__file__)
spec=importlib.util.spec_from_file_location("sf", os.path.join(HERE,"sans_formulu.py"))
sf=importlib.util.module_from_spec(spec)
if len(sys.argv)>1: sys.argv=[sys.argv[0], sys.argv[1]]
spec.loader.exec_module(sf)
out={}
for key,build in [("sayisal",sf.dataset_sayisal),("super",sf.dataset_super),("sans",sf.dataset_sans)]:
    ds=build(); st=sf.build_stats(ds)
    r2=lambda d:{str(k):round(v,2) for k,v in d.items()}
    lift={f"{a}-{b}":round(v,2) for (a,b),v in st['lift'].items() if abs(v-1.0)>=0.15}
    g={"N":st['N'],"z":r2(st['z']),"rz":r2(st['rz']),"gap":r2(st['gap']),"lift":lift,
       "mu":round(st['mu'],1),"sigma":round(st['sigma'],1),
       "oddMode":st['odd_mode'],"lowMode":st['low_mode'],"mid":st['mid']}
    if st['extra']:
        g["extraScore"]={str(n):round(0.55*st['extra']['z'][n]+0.45*(st['extra']['gap'][n]-1.0),2) for n in st['extra']['z']}
    out[key]=g
ts_path=os.path.join(HERE,"..","src","games","fstats.ts")
old=open(ts_path).read()
import re
new=re.sub(r"export const FSTATS: Record<string, GameStats> = .*? as any;",
           "export const FSTATS: Record<string, GameStats> = "+json.dumps(out,separators=(',',':'))+" as any;",
           old, flags=re.S)
open(ts_path,'w').write(new)
print("fstats.ts güncellendi:", {k:v['N'] for k,v in out.items()})
