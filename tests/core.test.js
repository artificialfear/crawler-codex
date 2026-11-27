// Spoiler-filter and search tests for core.js. Run: node tests/core.test.js
const assert = require('assert');
const C = require('../core.js');
let passed = 0;
const test = (n, f) => { f(); passed++; console.log('ok -', n); };

const data = {
  entries: [
    { id: 'a', name: 'Zev', type: 'character' },
    { id: 'b', name: 'Late Villain', type: 'character' },
    { id: 'c', name: 'Katia Grim', type: 'character' },
    { id: 'd', name: 'Hidden Twist', type: 'character' }
  ],
  notes: [
    { id: '1', entryId: 'a', book: 1, chapter: 0, kind: 'note', text: 'PR rep' },
    { id: '2', entryId: 'a', book: 7, chapter: 10, kind: 'note', text: 'BIG BOOK 7 SPOILER' },
    { id: '3', entryId: 'b', book: 6, chapter: 3, kind: 'mention', text: '' },
    { id: '4', entryId: 'c', book: 2, chapter: 0, kind: 'note', text: 'doppelganger' },
    { id: '5', entryId: 'c', book: 5, chapter: 20, kind: 'alias', text: 'Secret Name' },
    { id: '6', entryId: 'd', book: 5, chapter: 0, kind: 'note', text: 'book-level note in current book' }
  ]
};

test('chapter rules', () => {
  const mat = { book: 5, chapter: 12 };
  assert.ok(C.noteVisible({ book: 5, chapter: 12 }, mat));
  assert.ok(!C.noteVisible({ book: 5, chapter: 13 }, mat));
  assert.ok(C.noteVisible({ book: 4, chapter: 99 }, mat));
  assert.ok(!C.noteVisible({ book: 6, chapter: 1 }, mat));
  assert.ok(!C.noteVisible({ book: 5, chapter: 0 }, mat), 'book-level note hidden until you finish that book');
  assert.ok(C.noteVisible({ book: 4, chapter: 0 }, mat));
});

test('Mat at B5 Ch12 sees no later info, and no later-only entries', () => {
  const v = C.buildView(data, { book: 5, chapter: 12 });
  const names = v.map((x) => x.entry.name).sort();
  assert.deepStrictEqual(names, ['Katia Grim', 'Zev']);
  const zev = v.find((x) => x.entry.name === 'Zev');
  assert.ok(!zev.notes.some((n) => /SPOILER/.test(n.text)));
  const katia = v.find((x) => x.entry.name === 'Katia Grim');
  assert.deepStrictEqual(katia.aliases, [], 'future alias not shown');
  assert.strictEqual(C.search(v, 'secret').length, 0, 'future alias not searchable');
});

test('Emily at B7 Ch10 sees everything except the current-book book-level note rule', () => {
  const v = C.buildView(data, { book: 7, chapter: 10 });
  assert.strictEqual(v.length, 4);
  assert.ok(v.find((x) => x.entry.name === 'Zev').notes.some((n) => /SPOILER/.test(n.text)));
});

test('search: prefix, word, fuzzy audio spelling', () => {
  const v = C.buildView(data, { book: 7, chapter: 10 });
  assert.strictEqual(C.search(v, 'zev')[0].exact, true);
  assert.strictEqual(C.search(v, 'grim')[0].entry.id, 'c');
  const f = C.search(v, 'Katya');
  assert.strictEqual(f[0].entry.id, 'c'); assert.ok(f[0].fuzzy);
  assert.strictEqual(C.search(v, 'xq').length, 0);
});

test('findByNameAnywhere finds hidden entries for silent merge', () => {
  assert.strictEqual(C.findByNameAnywhere(data, 'late villain').id, 'b');
  assert.strictEqual(C.findByNameAnywhere(data, 'Secret Name').id, 'c');
  assert.strictEqual(C.findByNameAnywhere(data, 'nobody'), null);
});

test('applyOp mirrors server ops', () => {
  const d = JSON.parse(JSON.stringify(data)); d.readers = [];
  C.applyOp(d, { type: 'upsertNote', note: { id: '9', entryId: 'a', book: '5', chapter: '3', text: 'x' } });
  assert.strictEqual(d.notes.find((n) => n.id === '9').book, 5);
  C.applyOp(d, { type: 'deleteEntry', id: 'a' });
  assert.ok(!d.notes.some((n) => n.entryId === 'a'));
  C.applyOp(d, { type: 'setPosition', reader: 'Mat', book: 5, chapter: 2 });
  assert.strictEqual(d.readers[0].chapter, 2);
});

console.log(`\n${passed} core tests passed`);
