"""Stamp every local asset URL in index.html with a hash of that file's contents.
Run after changing any asset:  python3 tools/stamp.py
(tests/ui_test.py fails if a stamp is stale, so phones never keep an old cached file.)"""
import hashlib, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAT = re.compile(r"""((?:src|href|url\()\s*=?\s*["']?|['"])((?:[\w-]+/)*[\w.-]+\.(?:js|css|png|webp|ttf|json))\?v=[\w.]+""")

def digest(rel):
    with open(os.path.join(ROOT, rel), 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()[:10]

def stamp(text):
    def sub(m):
        rel = m.group(2)
        if not os.path.exists(os.path.join(ROOT, rel)):
            return m.group(0)
        return m.group(1) + rel + '?v=' + digest(rel)
    return PAT.sub(sub, text)

if __name__ == '__main__':
    path = os.path.join(ROOT, 'index.html')
    src = open(path, encoding='utf-8').read()
    out = stamp(src)
    if '--check' in sys.argv:
        sys.exit(0 if out == src else 1)
    open(path, 'w', encoding='utf-8').write(out)
    print('\n'.join(sorted(set(re.findall(r'[\w/.-]+\?v=\w+', out)))))
