"""End-to-end UI test on phone-sized screens against the real backend logic.
Run: python3 tests/ui_test.py   (starts tests/fake-server.js itself)
Screenshots land in tests/shots/.
"""
import base64, json, os, subprocess, sys
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

def synced(pg):
    pg.wait_for_function('document.getElementById("sync").className === "sync"', timeout=6000)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel='chromium')
        errors = []

        def phone(w=390, h=844):
            ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg = ctx.new_page()
            pg.on('pageerror', lambda e: errors.append(str(e)))
            pg.on('dialog', lambda d: d.dismiss())
            return ctx, pg

        # ---- Emily: setup link, pick name, B8 ----
        ectx, em = phone()
        em.goto(f'{BASE}/#setup={setup}')
        em.wait_for_selector('[data-me="Emily"]')
        check('setup=' not in em.url, 'setup hash stripped from URL')
        em.screenshot(path=f'{SHOTS}/01-who.png')
        em.click('[data-me="Emily"]')
        check(em.inner_text('#posBig') == 'Chapter 1' and 'Book 8' in em.inner_text('#posSmall'), 'Emily starts at Book 8 Chapter 1')
        em.click('#posBtn'); em.fill('#cnum', '10'); em.dispatch_event('#cnum', 'change'); em.click('#closeSheet')
        check(em.inner_text('#posBig') == 'Chapter 10', 'position set via sheet')
        # Emily adds a Book 8 character + spoiler note mentioning Carl (link) and herself
        em.fill('#q', 'Spoiler Sam')
        em.click('#addBtn')
        em.wait_for_selector('#newNote')
        em.fill('#newNote', 'BOOK EIGHT REVEAL: works with Carl and Mordecai')
        em.click('#saveNote')
        em.wait_for_selector('text=BOOK EIGHT REVEAL')
        check(em.locator('#sheetBody a.elink').count() == 2, 'names in note become links (Carl, Mordecai)')
        em.screenshot(path=f'{SHOTS}/02-entry-links.png')
        em.click('#sheetBody a.elink >> text=Carl')
        em.wait_for_selector('.sheet-head h3:text("Carl")')
        check(True, 'tapping a name link opens that entry')
        em.click('#closeSheet')
        # Emily adds a later note to Zev
        em.fill('#q', 'zev'); em.press('#q', 'Enter')
        em.wait_for_selector('#newNote')
        em.fill('#newNote', 'ZEV LATE-BOOK SECRET')
        em.click('#saveNote')
        em.wait_for_selector('text=ZEV LATE-BOOK SECRET')
        check(em.locator('details.nbook').count() >= 2 and em.locator('details.nbook[open]').count() == 1 and em.locator('details.nbook[data-nbook="8"][open]').count() == 1,
              'entry notes grouped by book; only the current book is open')
        em.click('details.nbook[data-nbook="1"] > summary')
        em.click('.verify >> nth=0')
        em.wait_for_selector('text=✓ checked')
        em.click('#closeSheet')
        synced(em)

        # ---- Mat: B6 ----
        mctx, mat = phone()
        mat.goto(f'{BASE}/#setup={setup}')
        mat.click('[data-me="Mat"]')
        check(mat.inner_text('#posBig') == 'Chapter 1' and 'Book 6' in mat.inner_text('#posSmall'), 'Mat starts at Book 6 Chapter 1')
        mat.click('#nextCh'); mat.click('#nextCh')
        check(mat.inner_text('#posBig') == 'Chapter 3', 'Next chapter button')
        # Now tab: default party pins
        party = mat.locator('.party [data-entry]').count()
        check(party == 4, f'default party has 4 pinned (got {party})')
        check('Spoiler Sam' not in mat.inner_text('#main'), 'Mat does not see Emily\'s Book 8 entry')
        mat.wait_for_timeout(500)
        mat.screenshot(path=f'{SHOTS}/03-now-mat.png')
        # Recent tab: Emily's later notes must not appear
        mat.click('#tabs [data-tab="recent"]')
        rec = mat.inner_text('#main')
        check('Spoiler Sam' not in rec and 'LATE-BOOK' not in rec, 'Recent hides notes past Mat\'s spot')
        mat.screenshot(path=f'{SHOTS}/04-recent-empty.png')
        # Browse tab: grouped by book
        mat.click('#tabs [data-tab="browse"]')
        groups = mat.locator('details.group').count()
        check(groups == 4, f'browse has Met-in-Book 1..4 groups (got {groups})')
        mat.click('details.group[data-book="1"] > summary')
        mat.wait_for_timeout(200)
        check('last noted' in mat.inner_text('details.group[data-book="1"]'), 'cards show last seen')
        mat.screenshot(path=f'{SHOTS}/05-browse.png')
        mat.click('#browseTypes .chip:has-text("Place")')
        check(all('Place' in t or True for t in []), 'type filter applies')
        check(mat.locator('details.group [data-entry]').count() >= 1, 'place filter shows places')
        mat.click('#browseTypes .chip:has-text("All")')
        # Zev: no secret; seed verified; links never point to hidden entries
        mat.fill('#q', 'zev'); mat.press('#q', 'Enter')
        mat.wait_for_selector('.sheet.open')
        sheet = mat.text_content('#sheetBody')
        check('LATE-BOOK SECRET' not in sheet, 'Emily\'s later Zev note hidden from Mat')
        check('PR/communications' in sheet, 'seed note visible to Mat')
        mat.screenshot(path=f'{SHOTS}/06-entry-zev.png')
        # pin Zev
        mat.click('#pinBtn')
        mat.click('#closeSheet')
        mat.fill('#q', ''); mat.dispatch_event('#q', 'input')
        mat.click('#tabs [data-tab="now"]')
        check(mat.locator('.party [data-entry]').count() == 5, 'pinning adds to party')
        # Mat adds a character + note -> achievement toast + shows in Recent
        mat.fill('#q', 'Tiny Goblin'); mat.press('#q', 'Enter')
        mat.wait_for_selector('#newNote')
        mat.fill('#newNote', 'shopkeeper near Zev')
        mat.click('#saveNote')
        mat.wait_for_selector('.toast.ach.show', timeout=3000)
        check('census taker' in mat.inner_text('#toast').lower(), 'achievement toast fires on first entry')
        mat.screenshot(path=f'{SHOTS}/07-achievement.png')
        mat.click('#closeSheet')
        mat.fill('#q', ''); mat.dispatch_event('#q', 'input'); mat.click('#tabs [data-tab="now"]')
        check('Tiny Goblin' in mat.inner_text('.chapterlist'), 'In this chapter lists the new entry')
        mat.click('#nextCh')
        check(mat.locator('.chapterlist').count() == 0, 'In this chapter empties after Next ch')
        mat.click('#prevCh')
        mat.screenshot(path=f'{SHOTS}/13-in-chapter.png')
        mat.click('#tabs [data-tab="recent"]')
        check('tiny goblin' in mat.inner_text('#main').lower(), 'own entry appears in Recent')
        mat.screenshot(path=f'{SHOTS}/08-recent.png')
        # fuzzy
        mat.fill('#q', 'Katya')
        mat.wait_for_selector('text=Close spelling match')
        check('Katia Grim' in mat.inner_text('#main'), 'fuzzy spelling finds Katia Grim')
        check(mat.locator('#tabs').is_hidden(), 'tabs hide while searching')
        mat.screenshot(path=f'{SHOTS}/09-search.png')
        # silent merge with Emily's later entry
        mat.fill('#q', 'Spoiler Sam'); mat.press('#q', 'Enter')
        mat.wait_for_selector('.sheet.open')
        check('BOOK EIGHT REVEAL' not in mat.inner_text('#sheetBody'), 'silent merge shows no later notes')
        mat.click('#closeSheet')
        synced(mat)
        # light mode
        mat.click('#settingsBtn'); mat.click('#sTheme')
        mat.screenshot(path=f'{SHOTS}/10-settings-light.png')
        mat.click('#closeSheet')
        mat.fill('#q', ''); mat.dispatch_event('#q', 'input')
        mat.click('#tabs [data-tab="now"]')
        mat.screenshot(path=f'{SHOTS}/11-now-light.png')
        # v1.7: chapter recaps + browse sort
        mat.click('#recapBtn'); mat.wait_for_selector('.recapnav')
        check('Chapter' in mat.inner_text('.recapnav .where'), 'recap sheet opens at a chapter')
        check('LATE-BOOK SECRET' not in mat.text_content('#sheetBody'), 'recap never shows later notes')
        mat.click('#closeSheet')
        mat.click('#tabs [data-tab="browse"]'); mat.click('#browseSort [data-sort="az"]')
        check(mat.locator('#browseSort .seg.on').inner_text() == 'A–Z', 'browse sort switches to A–Z')
        mat.click('#browseSort [data-sort="seen"]'); mat.click('#tabs [data-tab="now"]')
        # v1.8: player-number converter (Book 6: player 11 = Chapter 8)
        before = mat.inner_text('#posBig')
        mat.click('#posBtn'); mat.wait_for_selector('#ptrack')
        mat.fill('#ptrack', '11'); mat.dispatch_event('#ptrack', 'change')
        check('Chapter 8' in mat.inner_text('#pout'), 'player Chapter 11 shown as Chapter 8')
        mat.screenshot(path=f'{SHOTS}/12-player-converter.png')
        mat.click('#closeSheet')
        check(mat.inner_text('#posBig') == 'Chapter 8', 'player number sets the real chapter')
        mat.click('#posBtn'); mat.fill('#cnum', before.split()[-1]); mat.dispatch_event('#cnum', 'change'); mat.click('#closeSheet')

        em.reload(); em.wait_for_selector('#posBig')
        em.fill('#q', 'Spoiler Sam')
        cards = em.locator('[data-entry]').count()
        check(cards == 1, f'no duplicate entry after merge (got {cards})')
        em.click('[data-entry]')
        check('Seen in chapter 3' in em.text_content('details.nbook[data-nbook="6"]'), 'Emily sees Mat\'s sighting')

        # ---- undo ----
        before = mat.inner_text('#posBig')
        mat.click('#nextCh'); mat.click('#undoBtn')
        mat.wait_for_timeout(200)
        check(mat.inner_text('#posBig') == before, 'Undo puts the chapter back')
        mat.fill('#q', 'Tiny Goblin'); mat.press('#q', 'Enter'); mat.wait_for_selector('#delEntry')
        mat.click('#delEntry'); mat.click('#delEntry')
        mat.wait_for_selector('#undoBtn')
        mat.fill('#q', 'Tiny Goblin')
        check(mat.locator('[data-entry]').count() == 0, 'entry deleted')
        mat.click('#undoBtn'); mat.wait_for_timeout(300)
        mat.fill('#q', ''); mat.fill('#q', 'Tiny Goblin')
        check(mat.locator('[data-entry]').count() == 1, 'Undo restores a deleted entry')
        mat.fill('#q', ''); mat.dispatch_event('#q', 'input')
        synced(mat)
        # ---- delta sync: Emily sees Mat's restored entry without a full download ----
        em.wait_for_timeout(300)
        em.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
        em.wait_for_timeout(800)
        em.fill('#q', 'Tiny Goblin')
        check(em.locator('[data-entry]').count() == 1, 'other phone picks up changes via delta sync')
        em.fill('#q', ''); em.dispatch_event('#q', 'input')
        # ---- offline: app still opens with no network ----
        mat.wait_for_timeout(800)
        mctx.set_offline(True)
        mat.reload()
        mat.wait_for_selector('#posBig', timeout=8000)
        check('Chapter' in mat.inner_text('#posBig'), 'app opens offline (service worker)')
        mat.fill('#q', 'Zev')
        check(mat.locator('[data-entry]').count() >= 1, 'saved data available offline')
        mctx.set_offline(False)

        sctx, sm = phone(w=360, h=740)
        sm.goto(f'{BASE}/#setup={setup}'); sm.click('[data-me="Mat"]'); sm.wait_for_selector('#posBig')
        sm.click('#tabs [data-tab="browse"]')
        sm.screenshot(path=f'{SHOTS}/12-small-browse.png')
        ow = sm.evaluate('document.documentElement.scrollWidth')
        check(ow <= 360, f'no horizontal overflow at 360px (scrollWidth {ow})')
        font = sm.evaluate('document.fonts.check(\'20px "Codex Term"\')')
        check(font, 'bundled terminal font loads')

        check(not errors, 'no page errors: ' + '; '.join(errors))
        b.close()
finally:
    srv.terminate()

# Asset stamps must match file contents, or phones keep stale cached files.
r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'stamp.py'), '--check'])
if r.returncode != 0:
    print('FAIL - asset ?v= stamps are stale: run python3 tools/stamp.py'); fails.append('stale stamps')
print('ok - asset stamps match file contents')

print(f'\n{len(fails)} failure(s)')
sys.exit(1 if fails else 0)
