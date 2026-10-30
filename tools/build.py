# python3 tools/build.py  → GitHub版（index.html）と Canva版（dist/otasuke-keisan-canva.html）を 1ファイルで つくる
import base64, os, re
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
src = lambda p: open(os.path.join(R, 'src', p), encoding='utf-8').read()
def data(p):
    ext = p.rsplit('.', 1)[1]
    mime = {'png': 'image/png', 'mp3': 'audio/mpeg'}[ext]
    return f'data:{mime};base64,' + base64.b64encode(open(os.path.join(R, 'src', p), 'rb').read()).decode()
def build(page, outs):
    html = src(page)
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + src('style.css') + '</style>')
    for js in ['logic.js', 'app.js']:
        html = html.replace(f'<script src="{js}"></script>', '<script>\n' + src(js) + '</script>')
    html = re.sub(r"assets/[\w/]+\.(?:png|mp3)", lambda m: data(m.group(0)), html)
    for out in outs:
        out = os.path.join(R, out)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        h = html  # 作者名は どちらの版も K.nom
        open(out, 'w', encoding='utf-8').write(h)
        print(os.path.relpath(out, R), f'{os.path.getsize(out)/1024:.0f}KB')

build('index.html', ['index.html', 'dist/otasuke-keisan-canva.html'])
