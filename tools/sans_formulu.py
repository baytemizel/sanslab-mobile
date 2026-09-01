#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ŞANSLAB ŞANS FORMÜLÜ v1.0  —  kişisel kullanım
================================================
Girdi : Milli_Piyango_Arsiv.xlsx (+ sayisalloto.csv referans)
Çıktı : Oyun başına skorlanmış en iyi kuponlar

FORMÜL
------
Her aday kupon K için bileşik skor:

  SKOR(K) = 0.15·F + 0.10·R + 0.10·G + 0.10·P + 0.15·S + 0.10·B + 0.30·A

  F  Frekans     : temiz-dönem tüm-zaman frekans z-skorlarının ortalaması
  R  Form        : son 50 çekilişteki frekans z-ortalaması (sıcak seri)
  G  Gecikme     : normalize gap ortalaması (beklenen gap'e oranla, 3x tavan)
  P  İkili sinerji: kupon içi tüm ikililerin tarihsel lift ortalaması
  S  Toplam bandı: kupon toplamının tarihsel dağılıma Gauss uyumu
  B  Desen uyumu : tek/çift ve alt/üst dağılımının modal desene uyumu
  A  Anti-popülerlik: kalabalık seçimlerden (doğum günü, şanslı sayı,
     ardışık/desen) uzaklık — kazançta paylaşım azaltıcı bileşen

Aday üretimi: kriptografik rastgele 30.000 kombinasyon → skorla → en iyiler.
Dönem temizliği: 6/90 era ≥ 2020-08-03, 6/60 era ≥ 2020-08-09,
Şans Topu'nda 2 bozuk satır (>34) atılır.
"""
import pandas as pd, numpy as np, itertools, math, secrets, sys, os
from collections import Counter

XL = sys.argv[1] if len(sys.argv) > 1 else '/mnt/user-data/uploads/Milli_Piyango_Arsiv.xlsx'
CANDIDATES = 30000
TOP = 10
RECENT = 50

W = dict(F=0.15, R=0.10, G=0.10, P=0.10, S=0.15, B=0.10, A=0.30)

# ------------------------------------------------------------------ veri
def load(sheet, cols):
    df = pd.read_excel(XL, sheet_name=sheet, skiprows=2, header=None).iloc[:, :len(cols)]
    df.columns = cols
    return df

def prep(df, numcols, datefmt='%d/%m/%Y'):
    for c in numcols: df[c] = pd.to_numeric(df[c], errors='coerce')
    df['dt'] = pd.to_datetime(df['Tarih'], format=datefmt, errors='coerce')
    df = df.dropna(subset=numcols + ['dt']).sort_values('dt').reset_index(drop=True)
    for c in numcols: df[c] = df[c].astype(int)
    return df

def dataset_sayisal():
    df = load('Sayisal_Loto_Modern', ['Tarih','Hafta','T1','T2','T3','T4','T5','T6','Joker','SuperStar'])
    df = prep(df, ['T1','T2','T3','T4','T5','T6'])
    df['Joker'] = pd.to_numeric(df['Joker'], errors='coerce')
    df['mx'] = df[['T1','T2','T3','T4','T5','T6']].max(axis=1)
    era_start = df[df['mx'] > 49]['dt'].min()          # 6/90 era
    df = df[df['dt'] >= era_start]
    draws = [sorted(r) for r in df[['T1','T2','T3','T4','T5','T6']].values.tolist()]
    joker = [int(j) for j in df['Joker'] if not pd.isna(j) and 1 <= j <= 90]
    return dict(name='Çılgın Sayısal Loto', draws=draws, nmin=1, nmax=90, k=6,
                extra=joker, emin=1, emax=90, elabel='Joker')

def dataset_super():
    df = load('Super_Loto', ['Tarih','Hafta','T1','T2','T3','T4','T5','T6'])
    df = prep(df, ['T1','T2','T3','T4','T5','T6'])
    df['mx'] = df[['T1','T2','T3','T4','T5','T6']].max(axis=1)
    era_start = df[df['mx'] > 54]['dt'].min()          # 6/60 era
    df = df[df['dt'] >= era_start]
    draws = [sorted(r) for r in df[['T1','T2','T3','T4','T5','T6']].values.tolist()]
    return dict(name='Süper Loto', draws=draws, nmin=1, nmax=60, k=6,
                extra=None, emin=None, emax=None, elabel=None)

def dataset_sans():
    df = load('Sans_Topu_Modern', ['Tarih','Hafta','T1','T2','T3','T4','T5','SansTopu'])
    df = prep(df, ['T1','T2','T3','T4','T5'])
    df['SansTopu'] = pd.to_numeric(df['SansTopu'], errors='coerce')
    df['mx'] = df[['T1','T2','T3','T4','T5']].max(axis=1)
    df = df[df['mx'] <= 34]                            # 2 bozuk satırı at
    draws = [sorted(r) for r in df[['T1','T2','T3','T4','T5']].values.tolist()]
    extra = [int(x) for x in df['SansTopu'] if not pd.isna(x) and 1 <= x <= 14]
    return dict(name='Şans Topu', draws=draws, nmin=1, nmax=34, k=5,
                extra=extra, emin=1, emax=14, elabel='Şans Topu')

# ------------------------------------------------------------------ istatistik
def build_stats(ds):
    draws, nmin, nmax, k = ds['draws'], ds['nmin'], ds['nmax'], ds['k']
    N, size = len(draws), nmax - nmin + 1
    cnt = Counter();  [cnt.update(d) for d in draws]
    exp = N * k / size
    sd = math.sqrt(N * (k/size) * (1 - k/size)) or 1
    z = {n: (cnt.get(n,0) - exp) / sd for n in range(nmin, nmax+1)}

    rec = draws[-RECENT:]
    rc = Counter(); [rc.update(d) for d in rec]
    rexp = len(rec) * k / size
    rsd = math.sqrt(len(rec) * (k/size) * (1 - k/size)) or 1
    rz = {n: (rc.get(n,0) - rexp) / rsd for n in range(nmin, nmax+1)}

    last = {n: -1 for n in range(nmin, nmax+1)}
    for i, d in enumerate(draws):
        for n in d: last[n] = i
    egap = size / k
    gap = {n: min(((N-1-last[n]) if last[n] >= 0 else N) / egap, 3.0) for n in last}

    pair = Counter()
    for d in draws:
        for a, b in itertools.combinations(d, 2): pair[(a, b)] += 1
    exp_pair = N * (k*(k-1)/2) / (size*(size-1)/2)
    lift = {ab: c/exp_pair for ab, c in pair.items()}

    sums = [sum(d) for d in draws]
    mu, sigma = float(np.mean(sums)), float(np.std(sums)) or 1.0

    mid = (nmin + nmax) / 2
    odd_mode = Counter(sum(1 for n in d if n % 2) for d in draws).most_common(2)
    low_mode = Counter(sum(1 for n in d if n <= mid) for d in draws).most_common(2)

    ex = None
    if ds['extra']:
        ec = Counter(ds['extra'])
        eN = len(ds['extra']); esize = ds['emax'] - ds['emin'] + 1
        eexp = eN / esize
        esd = math.sqrt(eN * (1/esize) * (1 - 1/esize)) or 1
        elast = {n: -1 for n in range(ds['emin'], ds['emax']+1)}
        for i, v in enumerate(ds['extra']): elast[v] = i
        eg = {n: min(((eN-1-elast[n]) if elast[n] >= 0 else eN) / esize, 3.0) for n in elast}
        ex = dict(z={n: (ec.get(n,0)-eexp)/esd for n in elast}, gap=eg)

    return dict(N=N, z=z, rz=rz, gap=gap, lift=lift, mu=mu, sigma=sigma,
                odd_mode=[m for m,_ in odd_mode], low_mode=[m for m,_ in low_mode],
                mid=mid, extra=ex)

# ------------------------------------------------------------------ anti-popülerlik
LUCKY = {1,3,7,9,11,13,17,21,23,33}
def popularity(nums, nmax):
    """Yalnızca KOMBINASYON deseni cezalanır; tek tek sayı kimliği cezalanmaz.
    Böylece 1-31 bandındaki sıcak sayılar kuponlara girebilir; sadece
    'tam doğum günü kuponu' / 'desen kuponu' gibi kalabalık şablonlar kaçınılır."""
    so = sorted(nums); k = len(so)
    s = 0.0
    # doğum günü YOĞUNLUĞU: yarıdan fazlası <=31 ise kademeli ceza (havuz genişse)
    if nmax > 40:
        bd = sum(1 for n in nums if n <= 31)
        allowed = k // 2                      # 6'lıda 3, 5'lide 2 serbest
        if bd > allowed: s += (bd - allowed) * 1.2
    # ardışık zincir
    run = mx = 1
    for a, b in zip(so, so[1:]):
        run = run + 1 if b == a + 1 else 1
        mx = max(mx, run)
    if mx >= 2: s += (mx - 1) * 0.8
    # aritmetik dizi (5-10-15-20...)
    if k >= 3:
        d = so[1] - so[0]
        if d > 0 and all(so[i+1]-so[i] == d for i in range(k-1)): s += 2.5
    # tek onluk/iki onluk dilime sıkışma (dar bant cezası — yayılımı zorlar)
    dec = {(n-1)//10 for n in so}
    span = so[-1] - so[0]
    if k >= 5 and len(dec) <= 2: s += 1.2
    if nmax > 40 and span < (nmax - 1) * 0.45: s += 1.0   # dar banda toplanma
    # şanslı sayı kümesi
    lc = sum(1 for n in nums if n in LUCKY)
    if lc >= 3: s += (lc - 2) * 0.6
    # 7'li kombo klasiği (7,17,27...) hafif ceza
    sevens = sum(1 for n in nums if n % 10 == 7)
    if sevens >= 3: s += 0.5
    return s

# ------------------------------------------------------------------ skor
def score(nums, st, nmax):
    k = len(nums)
    F = np.mean([st['z'][n] for n in nums])
    R = np.mean([st['rz'][n] for n in nums])
    G = np.mean([st['gap'][n] for n in nums]) - 1.0        # 0 = beklenen
    pairs = list(itertools.combinations(sorted(nums), 2))
    P = np.mean([st['lift'].get(ab, 0.0) for ab in pairs]) - 1.0
    S = math.exp(-((sum(nums)-st['mu'])/st['sigma'])**2 / 2)
    odd = sum(1 for n in nums if n % 2)
    low = sum(1 for n in nums if n <= st['mid'])
    B = (0.5 if odd in st['odd_mode'] else 0.0) + (0.5 if low in st['low_mode'] else 0.0)
    A = 1.0 - popularity(nums, nmax) / 3.0   # 0 ceza -> +1.0 ; ağır desen -> negatif
    comp = dict(F=F, R=R, G=G, P=P, S=S, B=B, A=A)
    total = sum(W[c]*comp[c] for c in W)
    return total, comp

def crypto_pick(nmin, nmax, k):
    pool = list(range(nmin, nmax+1))
    out = []
    for i in range(k):
        j = i + secrets.randbelow(len(pool)-i)
        pool[i], pool[j] = pool[j], pool[i]
        out.append(pool[i])
    return sorted(out)

def guided_pick(nmin, nmax, k, st, alpha=0.9, beta=0.5):
    """Sıcaklık (0.6·z + 0.4·form) ve gecikmeyle ağırlıklı, tekrarsız çekiliş.
    exp() ağırlık => sıcak sayılar belirgin şekilde daha sık aday olur."""
    nums = list(range(nmin, nmax+1))
    w = [math.exp(alpha*(0.6*st['z'][n] + 0.4*st['rz'][n]) + beta*(st['gap'][n]-1.0)) for n in nums]
    out = []
    for _ in range(k):
        tot = sum(w)
        r = (secrets.randbelow(10**9) / 10**9) * tot
        acc = 0.0; idx = 0
        for i, x in enumerate(w):
            acc += x
            if r < acc: idx = i; break
        out.append(nums[idx]); del nums[idx]; del w[idx]
    return sorted(out)

def best_extra(st_extra, top=3):
    if not st_extra: return None
    sc = {n: 0.55*st_extra['z'][n] + 0.45*(st_extra['gap'][n]-1.0) for n in st_extra['z']}
    return sorted(sc.items(), key=lambda x: -x[1])[:top]

def run_game(ds):
    st = build_stats(ds)
    seen = set(); results = []
    for i in range(CANDIDATES):
        # %70 güdümlü (sıcak/form/gecikme ağırlıklı), %30 saf rastgele (keşif)
        if i % 10 < 7:
            c = tuple(guided_pick(ds['nmin'], ds['nmax'], ds['k'], st))
        else:
            c = tuple(crypto_pick(ds['nmin'], ds['nmax'], ds['k']))
        if c in seen: continue
        seen.add(c)
        t, comp = score(list(c), st, ds['nmax'])
        results.append((t, c, comp))
    results.sort(key=lambda x: -x[0])
    # Çeşitlilik: seçilen kuponlar arasında en fazla k-4 ortak sayı (6'lıda 2, 5'lide 1)
    max_overlap = max(1, ds['k'] - 4)
    picked = []
    for t, c, comp in results:
        if all(len(set(c) & set(p[1])) <= max_overlap for p in picked):
            picked.append((t, c, comp))
        if len(picked) == TOP: break
    return st, picked

if __name__ == '__main__':
    print(f"ŞANSLAB ŞANS FORMÜLÜ v1.0  ·  ağırlıklar {W}\n")
    for build in (dataset_sayisal, dataset_super, dataset_sans):
        ds = build()
        st, top = run_game(ds)
        print("="*66)
        print(f"{ds['name']}  ·  temiz dönem: {st['N']} çekiliş  ·  havuz {ds['k']}/{ds['nmin']}-{ds['nmax']}")
        print("="*66)
        for rank, (t, c, comp) in enumerate(top, 1):
            nums = " ".join(f"{n:02d}" for n in c)
            det = "  ".join(f"{k}={v:+.2f}" for k, v in comp.items())
            print(f"  #{rank:>2}  [{nums}]   SKOR {t:+.3f}   ({det})")
        if ds['extra']:
            be = best_extra(st['extra'])
            print(f"  {ds['elabel']} önerisi (skor sırasıyla): " +
                  ", ".join(f"{n:02d} ({s:+.2f})" for n, s in be))
        print()
