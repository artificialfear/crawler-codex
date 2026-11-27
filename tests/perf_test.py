"""Speed check with the real imported data (needs the gitignored import/batches/*.json; skips otherwise).
Run: python3 tests/perf_test.py  -> prints timings on a phone-sized page with 4x CPU throttling."""
import os, sys, json, glob, base64, subprocess, time, urllib.request
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8799; BASE = f'http://localhost:{PORT}'
batches = sorted(glob.glob(os.path.join(ROOT, 'import', 'batches', 'b*.json')))
batches = [b for b in batches if not b.endswith('.spec.json')]
if not batches: print('skip: no batches'); sys.exit(0)
srv = subprocess.Popen(['node', os.path.join(ROOT, 'tests', 'fake-server.js'), str(PORT)], stdout=subprocess.PIPE)
srv.stdout.readline()
ops = [dict(json.load(open(f)), opId='p' + str(i)) for i, f in enumerate(batches)]
body = json.dumps({'key': 'test-pass', 'ops': ops}).encode()
out = json.loads(urllib.request.urlopen(urllib.request.Request(f'{BASE}/exec', body, {'Content-Type': 'text/plain'})).read())
print('loaded', len(out['entries']), 'entries', len(out['notes']), 'notes', 'payload', len(json.dumps(out)) // 1024, 'KB')
setup = base64.b64encode(json.dumps({'u': f'{BASE}/exec', 'k': 'test-pass'}).encode()).decode()
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chromium')
        ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        cdp = ctx.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        pg.goto(f'{BASE}/#setup={setup}'); pg.wait_for_selector('[data-me="Mat"]'); pg.click('[data-me="Mat"]')
        pg.wait_for_function('document.getElementById("sync").className === "sync"', timeout=30000)
        def timed(label, js):
            ms = pg.evaluate('async () => { const t = performance.now(); ' + js + '; await new Promise(r => requestAnimationFrame(() => setTimeout(r))); return performance.now() - t; }')
            print(f'{label:28s} {ms:7.0f} ms'); return ms
        timed('render Now', "document.querySelector('#tabs [data-tab=now]').click()")
        pg.evaluate("document.querySelector('details.chgroup[data-chtype=place]') && (document.querySelector('details.chgroup[data-chtype=place]').open = true)")
        pg.screenshot(path=os.path.join(ROOT, 'tests', 'shots', 'v19-now.png'))
        timed('render Browse', "document.querySelector('#tabs [data-tab=browse]').click()")
        timed('search keystroke "mon"', "const q=document.getElementById('q'); q.value='mon'; q.dispatchEvent(new Event('input',{bubbles:true}))")
        timed('clear search', "const q=document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true}))")
        timed('open Carl', "document.querySelector('#tabs [data-tab=now]').click(); [...document.querySelectorAll('[data-entry]')].find(e=>e.textContent.includes('Carl')).click()")
        shot = lambda n: pg.screenshot(path=os.path.join(ROOT, 'tests', 'shots', n))
        shot('perf-carl.png')
        timed('open Mongo', "document.getElementById('closeSheet').click(); const q=document.getElementById('q'); q.value='Mongo'; q.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('[data-entry]').click()")
        shot('v17-entry-mongo.png'); pg.evaluate("document.getElementById('sheet').scrollTop = 99999"); shot('v17-entry-mongo-bottom.png')
        pg.evaluate("document.getElementById('closeSheet').click(); const q=document.getElementById('q'); q.value=''; q.dispatchEvent(new Event('input',{bubbles:true}))")
        timed('open recap', "document.getElementById('recapBtn').click()")
        shot('v17-recap.png')
        timed('recap prev chapter', "document.getElementById('rPrev').click()")
        pg.click('.recapitem .rname >> nth=0'); pg.wait_for_selector('#backRecap'); shot('v17-recap-entry.png')
        pg.click('#backRecap'); pg.wait_for_selector('#rPrev'); pg.click('#closeSheet')
        pg.click('#tabs [data-tab=browse]'); pg.wait_for_selector('details.group')
        pg.evaluate("document.querySelectorAll('details.group').forEach(d => d.open = d.dataset.book === '3')")
        shot('v17-browse.png')
        pg.evaluate("document.querySelector('details.group[data-book=\"3\"] [data-minor]').scrollIntoView()"); shot('v17-browse-minor.png')
        b.close()
finally:
    srv.terminate()
