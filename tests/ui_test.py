"""End-to-end UI test on phone-sized screens against the real backend logic.
Run: python3 tests/ui_test.py   (starts tests/fake-server.js itself)
Screenshots land in tests/shots/.
"""
import base64, json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'shots')
os.makedirs(SHOTS, exist_ok=True)
PORT = 8765
BASE = f'http://localhost:{PORT}'
fails = []

def check(cond, msg):
    print(('ok - ' if cond else 'FAIL - ') + msg)
    if not cond: fails.append(msg)

srv = subprocess.Popen(['node', os.path.join(ROOT, 'tests', 'fake-server.js'), str(PORT)], stdout=subprocess.PIPE)
srv.stdout.readline()
setup = base64.b64encode(json.dumps({'u': f'{BASE}/exec', 'k': 'test-pass'}).encode()).decode()

try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chromium')
        errors = []

        def phone(theme='dark', w=390, h=844):
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('dialog', lambda d: d.dismiss())
            return ctx, pg

        # ---- Emily: setup link, pick name, she's at B7 ----
        ectx, em = phone()
        em.goto(f'{BASE}/#setup={setup}')
        em.wait_for_selector('[data-me="Emily"]')
        check('setup=' not in em.url, 'setup hash stripped from URL')
        em.screenshot(path=f'{SHOTS}/01-who.png')
        em.click('[data-me="Emily"]')
        em.wait_for_selector('#posBig')
        check(em.inner_text('#posBig') == 'B7 · Ch 1', 'Emily starts at B7 Ch1')
        # set Emily to B7 Ch 10
        em.click('#posBtn'); em.fill('#cnum', '10'); em.dispatch_event('#cnum', 'change'); em.click('#closeSheet')
        check(em.inner_text('#posBig') == 'B7 · Ch 10', 'position set via sheet')
        # Emily adds a Book 7 character + spoiler note
        em.fill('#q', 'Spoiler Sam')
        em.click('#addBtn')
        em.wait_for_selector('#newNote')
        em.fill('#newNote', 'BOOK SEVEN REVEAL about Sam')
        em.click('#saveNote')
        em.wait_for_selector('text=BOOK SEVEN REVEAL')
        em.screenshot(path=f'{SHOTS}/02-entry-new.png')
        # Emily adds a later note to Zev (seed Book 1 entry)
        em.click('#closeSheet')
        em.fill('#q', 'zev'); em.press('#q', 'Enter')
        em.wait_for_selector('#newNote')
        em.fill('#newNote', 'ZEV LATE-BOOK SECRET')
        em.click('#saveNote')
        em.wait_for_selector('text=ZEV LATE-BOOK SECRET')
        # verify a seed note
        em.click('.verify >> nth=0')
        em.wait_for_selector('text=✓ checked')
        em.click('#closeSheet')
        em.wait_for_function('document.getElementById("sync").className === "sync"', timeout=5000)

        # ---- Mat: same link, B5 ----
        mctx, mat = phone()
        mat.goto(f'{BASE}/#setup={setup}')
        mat.click('[data-me="Mat"]')
        mat.wait_for_selector('#posBig')
        check(mat.inner_text('#posBig') == 'B5 · Ch 1', 'Mat starts at B5 Ch1')
        mat.click('#nextCh'); mat.click('#nextCh')
        check(mat.inner_text('#posBig') == 'B5 · Ch 3', 'Next chapter button')
        mat.screenshot(path=f'{SHOTS}/03-home-mat.png')
        body = mat.inner_text('#main')
        check('Spoiler Sam' not in body, 'Mat does not see Emily\'s Book 7 entry')
        mat.fill('#q', 'Spoiler')
        check('Spoiler Sam' not in mat.inner_text('#main'), 'Book 7 entry not searchable for Mat')
        # Zev: sees seed note, not Emily's secret; seed shows verified
        mat.fill('#q', 'zev'); mat.press('#q', 'Enter')
        mat.wait_for_selector('.sheet.open')
        sheet = mat.inner_text('#sheetBody')
        check('LATE-BOOK SECRET' not in sheet, 'Emily\'s later Zev note hidden from Mat')
        check('PR/communications' in sheet, 'seed note visible to Mat')
        mat.screenshot(path=f'{SHOTS}/04-entry-zev-mat.png', full_page=False)
        mat.click('#closeSheet')
        # fuzzy match
        mat.fill('#q', 'Katya')
        mat.wait_for_selector('text=Close spelling match')
        check('Katia Grim' in mat.inner_text('#main'), 'fuzzy spelling finds Katia Grim')
        mat.screenshot(path=f'{SHOTS}/05-fuzzy.png')
        # quick-add a name Mat types that Emily already created later -> silent merge, no reveal
        mat.fill('#q', 'Spoiler Sam'); mat.press('#q', 'Enter')
        mat.wait_for_selector('.sheet.open')
        sheet = mat.inner_text('#sheetBody')
        check('BOOK SEVEN REVEAL' not in sheet, 'silent merge shows no later notes')
        mat.click('#closeSheet')
        mat.wait_for_function('document.getElementById("sync").className === "sync"', timeout=5000)
        # light mode
        mat.click('#settingsBtn'); mat.click('#sTheme'); mat.click('#closeSheet')
        mat.fill('#q', '')
        mat.dispatch_event('#q', 'input')
        mat.screenshot(path=f'{SHOTS}/06-home-light.png')

        # Emily reloads: still exactly one Spoiler Sam
        em.reload(); em.wait_for_selector('#posBig')
        em.fill('#q', 'Spoiler Sam')
        cards = em.locator('[data-entry]').count()
        check(cards == 1, f'no duplicate entry after merge (got {cards})')
        em.click('[data-entry]')
        check('Mentioned: B5 · Ch 3 (Mat)' in em.inner_text('#sheetBody'), 'Emily sees Mat\'s mention')

        # small phone width
        sctx, sm = phone(w=360, h=740)
        sm.goto(f'{BASE}/#setup={setup}'); sm.click('[data-me="Mat"]'); sm.wait_for_selector('#posBig')
        sm.screenshot(path=f'{SHOTS}/07-small-phone.png')
        ow = sm.evaluate('document.documentElement.scrollWidth')
        check(ow <= 360, f'no horizontal overflow at 360px (scrollWidth {ow})')

        check(not errors, 'no page errors: ' + '; '.join(errors))
        b.close()
finally:
    srv.terminate()

print(f'\n{len(fails)} failure(s)')
sys.exit(1 if fails else 0)
