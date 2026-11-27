// Tests for apps-script/Code.gs + Seed.gs using mocks that mimic real Apps Script.
// Run: node tests/backend.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function makeSheet(name) {
  const rows = []; // 2D array, row 0 = sheet row 1
  const sh = {
    name,
    rows,
    getLastRow: () => rows.length,
    getRange(r, c, nr = 1, nc = 1) {
      return {
        setValues(vals) {
          assert.strictEqual(vals.length, nr, `${name}: setValues row count`);
          vals.forEach((v, i) => {
            assert.strictEqual(v.length, nc, `${name}: setValues col count`);
            while (rows.length < r + i) rows.push([]);
            v.forEach((x, j) => { rows[r - 1 + i][c - 1 + j] = x; });
          });
          return this;
        },
        setValue(v) { while (rows.length < r) rows.push([]); rows[r - 1][c - 1] = v; return this; },
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = rows[r - 1 + i] || [];
            const o = [];
            for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]);
            out.push(o);
          }
          return out;
        },
        setFontWeight() { return this; }
      };
    },
    appendRow(v) { rows.push(v.slice()); },
    deleteRow(r) { rows.splice(r - 1, 1); },
    setFrozenRows() {}
  };
  return sh;
}

function load() {
  const sheets = {};
  const props = {};
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = makeSheet(n))
  };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => ({ alert() {}, createMenu() { return { addItem() { return this; }, addToUi() {} }; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s) => ({ text: s, setMimeType() { return this; } })
    },
    Logger: { log() {} },
    console, Date, JSON, Math, String, Number, Object, Array, Error, parseInt
  };
  vm.createContext(ctx);
  for (const f of ['Seed.gs', 'Code.gs']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', f), 'utf8'), ctx, { filename: f });
  }
  return { ctx, sheets, props };
}

const get = (ctx, key) => JSON.parse(ctx.doGet({ parameter: { key } }).text);
const post = (ctx, body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text);

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }

test('setup builds tabs, books, readers, seed and passphrase', () => {
  const { ctx, sheets, props } = load();
  const r = ctx.setup();
  assert.ok(props.PASSPHRASE && r.passphrase === props.PASSPHRASE);
  ['Entries', 'Notes', 'Readers', 'Books', 'Config'].forEach((t) => assert.ok(sheets[t], t));
  assert.strictEqual(sheets.Books.rows.length, 9);
  assert.ok(r.seeded > 50, 'seeded ' + r.seeded);
  // re-run does not duplicate
  ctx.setup();
  assert.strictEqual(sheets.Entries.rows.length, r.seeded + 1);
  assert.strictEqual(sheets.Readers.rows.length, 3);
});

test('seed never goes past Book 4 and every note is chapter 0, unverified', () => {
  const { ctx } = load();
  const pass = ctx.setup().passphrase;
  const data = get(ctx, pass);
  assert.ok(data.notes.length > 100);
  data.notes.forEach((n) => {
    assert.ok(n.book >= 1 && n.book <= 4, 'book ' + n.book);
    assert.strictEqual(n.chapter, 0);
    assert.strictEqual(n.verified, false);
    assert.strictEqual(n.seed, true);
  });
  const ids = new Set(data.entries.map((e) => e.id));
  assert.strictEqual(ids.size, data.entries.length, 'unique entry ids');
  data.notes.forEach((n) => assert.ok(ids.has(n.entryId)));
});

test('wrong key is rejected on GET and POST', () => {
  const { ctx } = load();
  ctx.setup();
  assert.strictEqual(get(ctx, 'nope').ok, false);
  assert.strictEqual(post(ctx, { key: 'nope', ops: [] }).ok, false);
});

test('ops: upsert entry/note, retry is idempotent, edit, delete', () => {
  const { ctx, sheets } = load();
  const key = ctx.setup().passphrase;
  const before = sheets.Notes.rows.length;
  const ops = [
    { opId: 'a', type: 'upsertEntry', entry: { id: 'e1', name: 'Test Goblin', type: 'character', createdBy: 'Mat' } },
    { opId: 'b', type: 'upsertNote', note: { id: 'n1', entryId: 'e1', book: 5, chapter: 12, kind: 'mention', text: '', author: 'Mat' } }
  ];
  let out = post(ctx, { key, ops });
  assert.ok(out.ok && out.applied.every((a) => a.ok));
  out = post(ctx, { key, ops }); // retry
  assert.strictEqual(sheets.Notes.rows.length, before + 1);
  assert.strictEqual(out.entries.filter((e) => e.id === 'e1').length, 1);
  out = post(ctx, { key, ops: [{ opId: 'c', type: 'upsertNote', note: { id: 'n1', entryId: 'e1', book: 5, chapter: 12, text: 'Sells bombs\nfloor 6', author: 'Mat', verified: true } }] });
  const n1 = out.notes.find((n) => n.id === 'n1');
  assert.strictEqual(n1.text, 'Sells bombs floor 6');
  assert.strictEqual(n1.kind, 'note');
  assert.strictEqual(n1.verified, true);
  out = post(ctx, { key, ops: [{ opId: 'd', type: 'deleteEntry', id: 'e1' }] });
  assert.ok(!out.entries.some((e) => e.id === 'e1'));
  assert.ok(!out.notes.some((n) => n.entryId === 'e1'));
  assert.strictEqual(sheets.Notes.rows.length, before);
});

test('setPosition updates reader and clamps values', () => {
  const { ctx } = load();
  const key = ctx.setup().passphrase;
  let out = post(ctx, { key, ops: [{ opId: 'p', type: 'setPosition', reader: 'Mat', book: 5, chapter: 23 }] });
  const mat = out.readers.find((r) => r.name === 'Mat');
  assert.strictEqual(mat.book, 5); assert.strictEqual(mat.chapter, 23);
  out = post(ctx, { key, ops: [{ opId: 'q', type: 'setPosition', reader: 'Emily', book: 7, chapter: 0 }] });
  assert.strictEqual(out.readers.find((r) => r.name === 'Emily').chapter, 1);
});

test('bad op reports error without blocking others', () => {
  const { ctx } = load();
  const key = ctx.setup().passphrase;
  const out = post(ctx, { key, ops: [
    { opId: 'x', type: 'nonsense' },
    { opId: 'y', type: 'upsertEntry', entry: { id: 'e9', name: 'Ok', type: 'weird' } }
  ] });
  assert.strictEqual(out.applied[0].ok, false);
  assert.strictEqual(out.applied[1].ok, true);
  assert.strictEqual(out.entries.find((e) => e.id === 'e9').type, 'character');
});

console.log(`\n${passed} backend tests passed`);
