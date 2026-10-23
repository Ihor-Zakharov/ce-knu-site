#!/usr/bin/env python3
"""Знімок вихідних текстів чинного сайту ce.knu.ua (Nikola публікує index.rst поруч зі сторінками).
Збирає структуру, як у репозиторії керівника: posts/*.rst, pages/*.rst, pages/personas/*.rst, images/**, files/**.
Запуск: python3 scripts/fetch-live.py <каталог-призначення> [--base https://ce.knu.ua]
Далі: npm run migrate -- <каталог>/ce   (тоді переклад нових файлів en/)."""
import os, re, sys, time, urllib.request, urllib.parse, shutil

DEST = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'live-site')
BASE = sys.argv[sys.argv.index('--base') + 1] if '--base' in sys.argv else 'https://ce.knu.ua'
CE = os.path.join(DEST, 'ce')
UA = {'User-Agent': 'ce-knu-site-migration/1.0 (student practice project)'}

def get(path, binary=False):
    url = urllib.parse.urljoin(BASE + '/', path.lstrip('/'))
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                data = r.read(); time.sleep(0.25)
                return data if binary else data.decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(2)
        except Exception:
            time.sleep(2)
    return None

def save(rel, data):
    p = os.path.join(CE, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as f: f.write(data if isinstance(data, bytes) else data.encode('utf-8'))

# 1. новини: усі сторінки списку /news/, /news/index-N.html
slugs, pages_seen, queue = [], set(), ['news/']
while queue:
    p = queue.pop(0)
    if p in pages_seen: continue
    pages_seen.add(p)
    html = get(p) or ''
    for s in re.findall(r'href="(?:\.\./)?(?:/)?posts/([^"/]+)/"', html):
        if s not in slugs: slugs.append(s)
    for n in re.findall(r'href="(?:/news/)?(index-\d+\.html)"', html):
        queue.append('news/' + n)
print(f'новин: {len(slugs)} (сторінок списку: {len(pages_seen)})')
for s in slugs:
    rst = get(f'posts/{s}/index.rst')
    if rst: save(f'posts/{s}.rst', rst)
    else: print('  немає джерела:', s)

# 2. сторінки: з меню й посилань головної + відомі; 3. персоналії — зі списку
home = get('') or ''
pages = set(re.findall(r'href="/([a-z0-9-]+)/"', home)) | {'research', 'medu-guide', 'entrant', 'documents', 'graduates', 'personas', 'stateholders', 'studying'}
pages -= {'news', 'posts', 'categories', 'assets', 'images', 'files', 'en'}
src = get('index.rst')
if src: save('pages/index.rst', src)
for p in sorted(pages):
    src = get(f'{p}/index.rst')
    if src: save(f'pages/{p}.rst', src)
people = set()
for f in os.listdir(os.path.join(CE, 'pages')):
    people |= set(re.findall(r'</personas/([\w-]+)/?>', open(os.path.join(CE, 'pages', f), encoding='utf-8').read()))
for p in sorted(people):
    src = get(f'personas/{p}/index.rst')
    if src: save(f'pages/personas/{p}.rst', src)
print(f'сторінок: {len(os.listdir(os.path.join(CE, "pages"))) - 1}, персоналій: {len(people)}')

# 4. зображення й документи, згадані у вихідних текстах
refs = set()
for root, _, files in os.walk(CE):
    for f in files:
        if f.endswith('.rst'):
            refs |= set(re.findall(r'(/(?:images|files)/[\w./%-]+\.\w+)', open(os.path.join(root, f), encoding='utf-8').read()))
ok = 0
for r in sorted(refs):
    data = get(r, binary=True)
    if data: save(r.lstrip('/'), data); ok += 1
    else: print('  немає файла:', r)
print(f'файлів і зображень: {ok}/{len(refs)}')
