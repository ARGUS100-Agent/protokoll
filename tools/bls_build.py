#!/usr/bin/env python3
"""Baut data/bls40.json aus dem Bundeslebensmittelschlüssel 4.0 (Max Rubner-Institut).

Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.
Nutzungsbedingungen (Dokumentation 9.3): kostenfrei und ohne Lizenzbarrieren, ausdrücklich auch für
App- und Softwareentwicklung; die Quelle wird in der App genannt.

Aufruf: python3 tools/bls_build.py BLS_4_0_Daten_2025_DE.xlsx
Übernimmt nur die rund 30 Nährstoffe der App (Werte pro 100 g) und rechnet die Einheiten um
(Kupfer und Vitamin B6 im BLS in µg, in der App in mg). „-“ = kein Wert, <LOD/<LOQ/TR = 0.
Zusätzlich je Lebensmittel (Feld x): fl = Flüssigkeit in ml/100 g (Getränke), fs = freier Zucker
(Zucker bei Süßwaren, Gebäck und Getränken), upf = ultraverarbeitet (grobe Regel), pl = Pflanze für
die Vielfalt. Diese Zusatzfelder sind Regeln der App, nicht Teil des BLS.
"""
import json, os, re, sys
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data', 'bls40.json')

# App-Schlüssel ← BLS-Nährstoffcode, Faktor
KEYS = [
    ('kcal', 'ENERCC', 1), ('p', 'PROT625', 1), ('f', 'FAT', 1), ('sf', 'FASAT', 1), ('c', 'CHO', 1), ('sug', 'SUGAR', 1),
    ('fib', 'FIBT', 1), ('na', 'NA', 1), ('k', 'K', 1), ('ca', 'CA', 1), ('mg', 'MG', 1), ('fe', 'FE', 1), ('zn', 'ZN', 1),
    ('i', 'ID', 1), ('cu', 'CU', 0.001), ('vc', 'VITC', 1), ('vd', 'VITD', 1), ('va', 'VITAA', 1), ('ret', 'RETOL', 1),
    ('ve', 'VITE', 1), ('vk', 'VITK', 1), ('k2', 'VITK2', 1), ('b12', 'VITB12', 1), ('fol', 'FOL', 1), ('b6', 'VITB6', 0.001),
    ('epa', 'F20:5CN3', 1), ('dha', 'F22:6CN3', 1), ('ala', 'F18:3CN3', 1), ('alk', 'ALC', 1),
]
DRINK = re.compile(r'^(Trinkjoghurt|Kefir|Buttermilch|Molke|Sojadrink|Haferdrink|Mandeldrink|Reisdrink|Dinkeldrink|Kokoswasser|Smoothie|Kakaogetränk|Milchmischgetränk)|drink\b|brühe\b', re.I)
UPF_S = re.compile(r'bonbon|gummi|schokolade|praline|riegel|lakritz|kaugummi|marshmallow|nougat|marzipan|konfekt|karamell|toffee|dragee|brause|speiseeis|\beis\b|aufstrich', re.I)
UPF_N = re.compile(r'limonade|cola|eistee|energy|brause|ginger ale|tonic|bitter lemon|sportgetränk|fruchtsaftgetränk|isotonisch|light', re.I)
UPF_K = re.compile(r'chips|kroketten|pommes', re.I)
# Pflanze für die Wochen-Vielfalt: erstes Wort des Namens, vereinheitlicht wie in der App
PL_EXCL = re.compile(r'saft|nektar|smoothie|mischung|cerealien|flakes|pops|chips|popcorn|pommes|ersatz|vegetari|schokolade|hefe|kleber|'
                     r'cremesuppe|aufstrich|soße|schnitte|riegel|waffel|extrakt|müsli|grütze|pickles|gulasch|pastete|mixed|suppengrün|'
                     r'mehrkorn', re.I)
PL_TWO = {'Dicke', 'Rote', 'Weiße', 'Pak', 'Römischer', 'Japanische', 'Neuseeländer'}
PL_SUFFIX = ['kompott', 'nussmus', 'mus', 'drink', 'sprossen', 'mehl', 'milch', 'wasser', 'blatt', 'gemüse']
PL_MAP = {
    'Broccoli': 'Brokkoli', 'Porree': 'Lauch', 'Batate': 'Süßkartoffel', 'Weichweizen': 'Weizen', 'Hartweizen': 'Weizen', 'Bulgur': 'Weizen',
    'Couscous': 'Weizen', 'Grünkern': 'Dinkel', 'Polenta': 'Mais', 'Zuckermais': 'Mais', 'Braunhirse': 'Hirse', 'Reisnudeln': 'Reis',
    'Tapioka': 'Maniok', 'Zuckererbse': 'Erbse', 'Erbsen': 'Erbse', 'Wurzelpetersilie': 'Petersilie', 'Petersilien': 'Petersilie',
    'Knollensellerie': 'Sellerie', 'Bleichsellerie': 'Sellerie', 'Pfefferschote': 'Chili', 'Gartenbohne': 'Bohne', 'Wachsbohne': 'Bohne',
    'Salzgurke': 'Gurke', 'Senfgurke': 'Gurke', 'Honiggurke': 'Gurke', 'Cornichons': 'Gurke', 'Perlzwiebel': 'Zwiebel',
    'Silberzwiebel': 'Zwiebel', 'Röstzwiebeln': 'Zwiebel', 'Speisezwiebel': 'Zwiebel', 'Sauerkraut': 'Weißkohl', 'Weinsauerkraut': 'Weißkohl',
    'Ajvar': 'Paprika', 'Gemüsepaprika': 'Paprika', 'Gemüsefenchel': 'Fenchel', 'Gemüseartischocke': 'Artischocke',
    'Gemüseamaranth': 'Amaranth', 'Cashewkern': 'Cashew', 'Cashew': 'Cashew', 'Sojabohne': 'Soja', 'Sojabohnen': 'Soja', 'Sojaschnetzel': 'Soja',
    'Möhre': 'Karotte', 'Edelkastanie': 'Marone', 'Kastanien': 'Marone', 'Kürbiskern': 'Kürbis', 'Sonnenblumenkern': 'Sonnenblume',
    'Chia-Samen': 'Chia', 'Leinsamen': 'Lein', 'Oliven': 'Olive', 'Linsen': 'Linse', 'Mungbohnen': 'Mungbohne', 'Lupinen': 'Lupine',
    'Rote Rübe': 'Rote Bete', 'Weiße Rübe': 'Rübe', 'Römischer Salat': 'Salat', 'Kopfsalat': 'Salat', 'Eisbergsalat': 'Salat',
    'Schnittsalat': 'Salat', 'Japanische Wollmispel': 'Wollmispel', 'Macadamianuss': 'Macadamia', 'Cranberries': 'Cranberry',
    'Rotkohl': 'Rotkohl', 'Fenchel': 'Fenchel', 'Stielmus': 'Rübstiel', 'Nori-Blatt': 'Nori', 'Cashewnuss': 'Cashew',
}


def plant(code, name):
    L, sub = code[0], code[:2]
    if L not in 'FGKCH' or sub in ('H0', 'H8', 'H9', 'K2', 'K3', 'K8'):
        return None
    head = re.split(r'[,(]', name, maxsplit=1)[0].strip()
    words = head.split(' ')
    tok = ' '.join(words[:2]) if words[0] in PL_TWO and len(words) > 1 else words[0]
    tok = tok.split('/')[0].strip()
    if PL_EXCL.search(head):
        return None
    if tok in PL_MAP:
        return PL_MAP[tok]
    if '-' in tok:
        tok = tok.split('-')[-1]
        tok = tok[:1].upper() + tok[1:]
    for suf in PL_SUFFIX:
        if tok.lower().endswith(suf) and len(tok) > len(suf) + 2:
            tok = tok[:-len(suf)]
            if suf == 'nussmus':
                tok += 'nuss'
            break
    if tok.startswith('Gemüse') and len(tok) > 8:
        tok = tok[6:]
    tok = PL_MAP.get(tok, tok)
    if tok.endswith('n') and tok[:-1] in ('Erbse', 'Linse', 'Mungbohne', 'Lupine', 'Kichererbse', 'Petersilie'):
        tok = tok[:-1]
    return tok if len(tok) >= 3 else None


def num(v):
    if v is None:
        return None
    if isinstance(v, str):
        s = v.strip()
        if s in ('', '-'):
            return None
        if s.startswith('<') or s == 'TR':
            return 0.0
        try:
            return float(s.replace(',', '.'))
        except ValueError:
            return None
    return float(v)


def rnd(x):
    if x is None:
        return None
    if x == 0:
        return 0
    r = float(f'{x:.3g}')
    if abs(r) >= 100:
        r = round(r)
    return int(r) if r == int(r) else r


def main(path):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    hdr = next(rows)
    col = {}
    for i, h in enumerate(hdr):
        if h and '[' in str(h):
            col[str(h).split(' ')[0]] = i
    for _, code, _ in KEYS + [('w', 'WATER', 1)]:
        if code not in col:
            sys.exit('Spalte fehlt: ' + code)
    out = []
    for r in rows:
        code, name = r[0], r[1]
        if not code or not name:
            continue
        name = re.sub(r'\s+', ' ', str(name)).strip()
        vals = []
        for key, bc, fac in KEYS:
            x = num(r[col[bc]])
            vals.append(rnd(x * fac) if x is not None else None)
        water = num(r[col['WATER']]) or 0
        L = code[0]
        x = {}
        if L in 'NP' or (water >= 80 and (code.startswith('M1') or DRINK.search(name))):
            x['fl'] = rnd(water)
        sug = vals[[k for k, _, _ in KEYS].index('sug')]
        if L in 'NPSD' and sug:
            x['fs'] = sug
        if L in 'WD' or (L == 'S' and UPF_S.search(name)) or (L == 'N' and UPF_N.search(name)) or (L == 'K' and UPF_K.search(name)):
            x['upf'] = 1
        pl = plant(code, name)
        if pl:
            x['pl'] = pl
        row = [code, name] + vals
        if x:
            row.append(x)
        out.append(row)
    data = {
        'v': 'BLS 4.0',
        'src': 'Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0. Karlsruhe.',
        'k': [k for k, _, _ in KEYS],
        'd': out,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    print(f'OK {len(out)} Lebensmittel, {os.path.getsize(OUT) // 1024} KB → {OUT}')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
