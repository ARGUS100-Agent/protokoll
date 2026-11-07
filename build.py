#!/usr/bin/env python3
"""Baut die App nach docs/: eine index.html (alles inline) + PWA-Dateien. Vorher einmal: npm install"""
import base64, hashlib, os, re, shutil, subprocess, sys, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
DIST = os.path.join(ROOT, 'docs')
NM = os.path.join(ROOT, 'node_modules')
ICON_DIR = os.path.join(NM, 'lucide-static/icons')
FONT = os.path.join(NM, '@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2')
JS_ORDER = ['data.js', 'data2.js', 'info.js', 'core.js', 'core2.js', 'charts.js', 'ui.js', 'ui2.js', 'ui3.js', 'ui4.js', 'knee.js', 'actions.js', 'actions2.js', 'main.js']


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def icons_js(js):
    names = set(re.findall(r"icon\('([a-z0-9-]+)'", js))
    names |= set(re.findall(r"\bic: '([a-z0-9-]+)'", js))
    for grp in re.findall(r"/\*icons:([^*]+)\*/", js):
        names |= set(grp.split())
    names |= {'check', 'arrow-down', 'arrow-up', 'triangle-alert', 'minus'}
    out = {}
    for n in sorted(names):
        p = os.path.join(ICON_DIR, n + '.svg')
        if not os.path.exists(p):
            print('FEHLT Icon:', n); sys.exit(1)
        s = read(p)
        inner = s[s.index('>', s.index('<svg')) + 1:s.rindex('</svg>')]
        inner = re.sub(r'\s+', ' ', inner).strip()
        out[n] = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>')
    body = ',\n'.join(f"  '{k}': {repr(v)}" for k, v in out.items())
    return '/* Icons: Lucide (ISC-Lizenz) */\nconst ICONS = {\n' + body + '\n};\n', len(out)


def main():
    js = '\n'.join(f'/* ---- {name} ---- */\n' + read(os.path.join(SRC, name)) for name in JS_ORDER)
    icons, n_icons = icons_js(js)
    js = "'use strict';\n" + icons + js
    css = read(os.path.join(SRC, 'styles.css'))
    with open(FONT, 'rb') as f:
        font_b64 = base64.b64encode(f.read()).decode()
    font_css = ("@font-face { font-family: 'Big Shoulders'; font-style: normal; font-weight: 100 900; font-display: swap; "
                f"src: url(data:font/woff2;base64,{font_b64}) format('woff2'); }}")
    html = read(os.path.join(SRC, 'index.template.html'))
    html = html.replace('/*FONT*/', font_css).replace('/*CSS*/', css).replace('/*JS*/', js)

    os.makedirs(DIST, exist_ok=True)
    tmp_js = os.path.join(ROOT, '.check.js')
    with open(tmp_js, 'w', encoding='utf-8') as f:
        f.write(js)
    r = subprocess.run(['node', '--check', tmp_js], capture_output=True, text=True)
    os.remove(tmp_js)
    if r.returncode != 0:
        print(r.stderr); sys.exit(1)

    with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    version = hashlib.sha1(html.encode()).hexdigest()[:10]
    sw = read(os.path.join(SRC, 'pwa/sw.template.js')).replace('__VERSION__', version)
    with open(os.path.join(DIST, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(sw)
    shutil.copy(os.path.join(SRC, 'pwa/manifest.webmanifest'), os.path.join(DIST, 'manifest.webmanifest'))
    for size in (180, 192, 512):
        subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), os.path.join(SRC, 'pwa/icon.svg'), '-o', os.path.join(DIST, f'icon-{size}.png')], check=True)
    subprocess.run(['rsvg-convert', '-w', '512', '-h', '512', os.path.join(SRC, 'pwa/icon-maskable.svg'), '-o', os.path.join(DIST, 'icon-maskable-512.png')], check=True)

    open(os.path.join(DIST, '.nojekyll'), 'w').close()
    zpath = os.path.join(ROOT, 'protokoll-app.zip')
    with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in sorted(n for n in os.listdir(DIST) if not n.startswith('.')):
            z.write(os.path.join(DIST, name), arcname=name)
    print(f'OK  index.html {len(html)//1024} KB, {n_icons} Icons, Version {version}')


if __name__ == '__main__':
    main()
