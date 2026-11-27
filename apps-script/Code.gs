/**
 * Crawler Codex — Apps Script backend (v2: incremental sync + import batches)
 * Bound to the "Crawler Codex" Google Sheet (Mat's personal account).
 *
 * Files in this project:
 *   Code.gs  — this file (API + setup)
 *   Seed.gs  — Books 1–4 starter data (SEED_ENTRIES)
 *
 * Setup / upgrade: run setup() from the editor (safe to re-run; it adds any new
 * columns/tabs without touching existing data). Then Deploy > Manage deployments >
 * edit the existing web app > Version: New version > Deploy.
 *
 * API
 *   GET  ?key=PASS[&since=ISO]   -> { ok, full, entries, notes, deleted, readers, books, serverTime }
 *        With `since`, only rows changed after that time (plus deletions) are returned.
 *   POST body (text/plain JSON) { key, since?, ops: [...] } -> same shape + { applied }
 *     op types: upsertEntry, upsertNote, deleteNote, deleteEntry, setPosition,
 *               importBatch { batch, entries[], notes[] }, removeBatch { batch }
 *   Every op carries a client-made id, so retries are safe (upsert by id).
 */

var TABS = {
  entries: { name: 'Entries', cols: ['id', 'name', 'type', 'createdBy', 'createdAt', 'updatedAt', 'batch'] },
  notes:   { name: 'Notes',   cols: ['id', 'entryId', 'book', 'chapter', 'kind', 'text', 'author', 'createdAt', 'verified', 'seed', 'updatedAt', 'batch'] },
  deleted: { name: 'Deleted', cols: ['id', 'kind', 'deletedAt'] },
  readers: { name: 'Readers', cols: ['name', 'book', 'chapter', 'updatedAt'] },
  books:   { name: 'Books',   cols: ['num', 'title'] },
  config:  { name: 'Config',  cols: ['key', 'value'] }
};

var BOOKS = [
  [1, 'Dungeon Crawler Carl'],
  [2, "Carl's Doomsday Scenario"],
  [3, "The Dungeon Anarchist's Cookbook"],
  [4, 'The Gate of the Feral Gods'],
  [5, "The Butcher's Masquerade"],
  [6, 'The Eye of the Bedlam Bride'],
  [7, 'This Inevitable Ruin'],
  [8, 'A Parade of Horribles']
];

var DEFAULT_READERS = [['Mat', 6, 1], ['Emily', 8, 1]];
var ENTRY_TYPES = ['character', 'place', 'group', 'mechanic', 'show', 'item', 'other'];
var NOTE_KINDS = ['note', 'alias', 'mention'];

/* ---------- menu ---------- */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Crawler Codex')
    .addItem('Run setup (safe to re-run)', 'setup')
    .addItem('Show passphrase', 'showPassphrase')
    .addItem('New passphrase', 'resetPassphrase')
    .addToUi();
}

/* ---------- setup ---------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (k) { ensureTab_(ss, TABS[k]); });

  var books = ss.getSheetByName(TABS.books.name);
  if (books.getLastRow() < 2) {
    books.getRange(2, 1, BOOKS.length, 2).setValues(BOOKS);
  }

  var readers = ss.getSheetByName(TABS.readers.name);
  if (readers.getLastRow() < 2) {
    var now = new Date().toISOString();
    readers.getRange(2, 1, DEFAULT_READERS.length, 4)
      .setValues(DEFAULT_READERS.map(function (r) { return [r[0], r[1], r[2], now]; }));
  }

  var entries = ss.getSheetByName(TABS.entries.name);
  var seeded = 0;
  if (entries.getLastRow() < 2 && typeof SEED_ENTRIES !== 'undefined') {
    seeded = loadSeed_(ss);
  }

  var props = PropertiesService.getScriptProperties();
  var pass = props.getProperty('PASSPHRASE');
  if (!pass) {
    pass = makePassphrase_();
    props.setProperty('PASSPHRASE', pass);
  }
  writeConfig_(ss, 'passphrase', pass);

  Logger.log('Crawler Codex ready. Seeded entries: ' + seeded + '. Passphrase: ' + pass);
  return { seeded: seeded, passphrase: pass };
}

function showPassphrase() {
  var pass = PropertiesService.getScriptProperties().getProperty('PASSPHRASE') || '(none — run setup)';
  SpreadsheetApp.getUi().alert('Crawler Codex passphrase:\n\n' + pass);
}

function resetPassphrase() {
  var pass = makePassphrase_();
  PropertiesService.getScriptProperties().setProperty('PASSPHRASE', pass);
  writeConfig_(SpreadsheetApp.getActiveSpreadsheet(), 'passphrase', pass);
  SpreadsheetApp.getUi().alert('New passphrase:\n\n' + pass + '\n\nUpdate it in the app Settings on both phones.');
}

// Creates the tab if missing; writes the header row. Columns are only ever
// appended, so re-running on an older sheet adds new columns without moving data.
function ensureTab_(ss, tab) {
  var sh = ss.getSheetByName(tab.name);
  if (!sh) sh = ss.insertSheet(tab.name);
  sh.getRange(1, 1, 1, tab.cols.length).setValues([tab.cols]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

function writeConfig_(ss, key, value) {
  var sh = ss.getSheetByName(TABS.config.name);
  var rows = readRows_(sh, TABS.config.cols);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      sh.getRange(i + 2, 2).setValue(value);
      return;
    }
  }
  sh.appendRow([key, value]);
}

function makePassphrase_() {
  var words = ['crawler', 'donut', 'goblin', 'stairwell', 'lootbox', 'saferoom', 'tinkerer',
               'mongo', 'explosive', 'boss', 'floor', 'achievement', 'sponsor', 'potion'];
  var pick = function () { return words[Math.floor(Math.random() * words.length)]; };
  return pick() + '-' + pick() + '-' + (100 + Math.floor(Math.random() * 900));
}

function loadSeed_(ss) {
  var now = new Date().toISOString();
  var entryRows = [];
  var noteRows = [];
  SEED_ENTRIES.forEach(function (e) {
    var id = 'seed-' + slug_(e.name);
    entryRows.push([id, e.name, e.type, 'seed', now, now, 'seed']);
    (e.notes || []).forEach(function (n, j) {
      noteRows.push([id + '-n' + j, id, n.book, n.chapter || 0, n.kind || 'note',
                     n.text, 'seed', now, false, true, now, 'seed']);
    });
  });
  appendRows_(ss.getSheetByName(TABS.entries.name), entryRows, TABS.entries.cols.length);
  appendRows_(ss.getSheetByName(TABS.notes.name), noteRows, TABS.notes.cols.length);
  return entryRows.length;
}

function slug_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function appendRows_(sh, rows, width) {
  if (!rows.length) return;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, width).setValues(rows);
}

/* ---------- web app ---------- */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!checkKey_(p.key)) return json_({ ok: false, error: 'bad-key' });
  return json_(readAll_(p.since));
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, error: 'bad-json' });
  }
  if (!checkKey_(body.key)) return json_({ ok: false, error: 'bad-key' });

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var applied = applyOps_(body.ops || []);
    var out = readAll_(body.since);
    out.applied = applied;
    return json_(out);
  } finally {
    lock.releaseLock();
  }
}

function checkKey_(key) {
  var pass = PropertiesService.getScriptProperties().getProperty('PASSPHRASE');
  return !!pass && String(key || '').trim().toLowerCase() === pass.toLowerCase();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isoOf_(v) { return v instanceof Date ? v.toISOString() : String(v || ''); }

// since: ISO string. Missing/blank -> full snapshot.
function readAll_(since) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var serverTime = new Date().toISOString(); // captured BEFORE reading so nothing slips between syncs
  var full = !since;
  var changed = function (r) { return full || isoOf_(r.updatedAt) > since; };
  return {
    ok: true,
    full: full,
    entries: readRows_(ss.getSheetByName(TABS.entries.name), TABS.entries.cols).filter(changed),
    notes: readRows_(ss.getSheetByName(TABS.notes.name), TABS.notes.cols).filter(changed).map(function (n) {
      n.book = Number(n.book) || 0;
      n.chapter = Number(n.chapter) || 0;
      n.verified = n.verified === true || String(n.verified).toUpperCase() === 'TRUE';
      n.seed = n.seed === true || String(n.seed).toUpperCase() === 'TRUE';
      return n;
    }),
    deleted: full ? [] : readRows_(ss.getSheetByName(TABS.deleted.name), TABS.deleted.cols)
      .filter(function (d) { return isoOf_(d.deletedAt) > since; })
      .map(function (d) { return { id: String(d.id), kind: d.kind }; }),
    readers: readRows_(ss.getSheetByName(TABS.readers.name), TABS.readers.cols).map(function (r) {
      r.book = Number(r.book) || 1;
      r.chapter = Number(r.chapter) || 1;
      return r;
    }),
    books: readRows_(ss.getSheetByName(TABS.books.name), TABS.books.cols).map(function (b) {
      b.num = Number(b.num);
      return b;
    }),
    serverTime: serverTime
  };
}

function readRows_(sh, cols) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var values = sh.getRange(2, 1, last - 1, cols.length).getValues();
  var out = [];
  values.forEach(function (row) {
    if (row[0] === '' || row[0] === null) return;
    var o = {};
    cols.forEach(function (c, i) {
      var v = row[i];
      o[c] = (v instanceof Date) ? v.toISOString() : v;
    });
    out.push(o);
  });
  return out;
}

/* ---------- ops ---------- */

function applyOps_(ops) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var applied = [];
  ops.forEach(function (op) {
    try {
      var info = null;
      switch (op.type) {
        case 'upsertEntry': upsertEntry_(ss, op); break;
        case 'upsertNote': upsertNote_(ss, op); break;
        case 'deleteNote': deleteById_(ss, TABS.notes, op.id, 'note'); break;
        case 'deleteEntry': deleteEntry_(ss, op.id); break;
        case 'setPosition': setPosition_(ss, op); break;
        case 'importBatch': info = importBatch_(ss, op); break;
        case 'removeBatch': info = removeBatch_(ss, op.batch); break;
        default: throw new Error('unknown op ' + op.type);
      }
      applied.push({ opId: op.opId, ok: true, info: info });
    } catch (err) {
      applied.push({ opId: op.opId, ok: false, error: String(err.message || err) });
    }
  });
  return applied;
}

function cleanText_(s, max) {
  return String(s == null ? '' : s).replace(/[\r\n]+/g, ' ').trim().slice(0, max || 1000);
}

function findRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function entryRow_(e, now) {
  var type = ENTRY_TYPES.indexOf(e.type) >= 0 ? e.type : 'character';
  return [e.id, cleanText_(e.name, 120), type, cleanText_(e.createdBy, 40), e.createdAt || now, now, cleanText_(e.batch, 60)];
}

function noteRow_(n, now) {
  var book = Math.max(1, Math.min(99, parseInt(n.book, 10) || 1));
  var chapter = Math.max(0, Math.min(999, parseInt(n.chapter, 10) || 0));
  var kind = NOTE_KINDS.indexOf(n.kind) >= 0 ? n.kind : 'note';
  return [n.id, n.entryId, book, chapter, kind, cleanText_(n.text), cleanText_(n.author, 40),
          n.createdAt || now, !!n.verified, !!n.seed, now, cleanText_(n.batch, 60)];
}

function upsertEntry_(ss, op) {
  var e = op.entry || {};
  if (!e.id || !cleanText_(e.name)) throw new Error('entry needs id and name');
  var now = new Date().toISOString();
  var sh = ss.getSheetByName(TABS.entries.name);
  var row = findRow_(sh, e.id);
  if (row > 0) {
    var cur = sh.getRange(row, 1, 1, TABS.entries.cols.length).getValues()[0];
    var vals = entryRow_({ id: e.id, name: e.name, type: e.type, createdBy: cur[3], createdAt: isoOf_(cur[4]), batch: cur[6] }, now);
    sh.getRange(row, 1, 1, vals.length).setValues([vals]);
  } else {
    var v = entryRow_(e, now);
    sh.getRange(sh.getLastRow() + 1, 1, 1, v.length).setValues([v]);
  }
}

function upsertNote_(ss, op) {
  var n = op.note || {};
  if (!n.id || !n.entryId) throw new Error('note needs id and entryId');
  var now = new Date().toISOString();
  var sh = ss.getSheetByName(TABS.notes.name);
  var row = findRow_(sh, n.id);
  var values = noteRow_(n, now);
  if (row > 0) {
    var curBatch = sh.getRange(row, 12).getValue();
    if (!values[11] && curBatch) values[11] = curBatch; // keep import batch tag on edits
    sh.getRange(row, 1, 1, values.length).setValues([values]);
  } else {
    sh.getRange(sh.getLastRow() + 1, 1, 1, values.length).setValues([values]);
  }
}

function tombstones_(ss, items) {
  if (!items.length) return;
  var now = new Date().toISOString();
  appendRows_(ss.getSheetByName(TABS.deleted.name), items.map(function (x) { return [x.id, x.kind, now]; }), 3);
}

function deleteById_(ss, tab, id, kind) {
  var sh = ss.getSheetByName(tab.name);
  var row = findRow_(sh, id);
  if (row > 0) sh.deleteRow(row);
  tombstones_(ss, [{ id: id, kind: kind }]);
}

// Rewrites a sheet keeping only rows that pass `keep`, in one write. Returns removed ids.
function filterSheet_(sh, width, keep) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, width).getValues();
  var kept = [], removed = [];
  rows.forEach(function (r) { (keep(r) ? kept : removed).push(r); });
  if (!removed.length) return [];
  sh.getRange(2, 1, rows.length, width).clearContent();
  if (kept.length) sh.getRange(2, 1, kept.length, width).setValues(kept);
  return removed.map(function (r) { return String(r[0]); });
}

function deleteEntry_(ss, id) {
  var noteIds = filterSheet_(ss.getSheetByName(TABS.notes.name), TABS.notes.cols.length,
    function (r) { return String(r[1]) !== String(id); });
  filterSheet_(ss.getSheetByName(TABS.entries.name), TABS.entries.cols.length,
    function (r) { return String(r[0]) !== String(id); });
  tombstones_(ss, noteIds.map(function (x) { return { id: x, kind: 'note' }; }).concat([{ id: id, kind: 'entry' }]));
}

// Bulk-append a whole import in two writes. New entries only; notes may point at
// existing entries (the importer matches names first). Ids already present are skipped.
function importBatch_(ss, op) {
  var batch = cleanText_(op.batch, 60);
  if (!batch) throw new Error('importBatch needs batch');
  var now = new Date().toISOString();
  var es = ss.getSheetByName(TABS.entries.name), ns = ss.getSheetByName(TABS.notes.name);
  var haveE = {}, haveN = {};
  readRows_(es, ['id']).forEach(function (r) { haveE[String(r.id)] = 1; });
  readRows_(ns, ['id']).forEach(function (r) { haveN[String(r.id)] = 1; });
  var eRows = (op.entries || []).filter(function (e) { return e.id && e.name && !haveE[e.id]; })
    .map(function (e) { e.batch = batch; e.createdBy = e.createdBy || 'codex'; return entryRow_(e, now); });
  var nRows = (op.notes || []).filter(function (n) { return n.id && n.entryId && !haveN[n.id]; })
    .map(function (n) { n.batch = batch; n.author = n.author || 'codex'; return noteRow_(n, now); });
  appendRows_(es, eRows, TABS.entries.cols.length);
  appendRows_(ns, nRows, TABS.notes.cols.length);
  return { entries: eRows.length, notes: nRows.length };
}

// Undo an import: removes every note and entry tagged with this batch.
// Entries that people have since added their own notes to are kept (only the batch notes go).
function removeBatch_(ss, batch) {
  batch = cleanText_(batch, 60);
  if (!batch || batch === 'seed') throw new Error('bad batch');
  var ns = ss.getSheetByName(TABS.notes.name), es = ss.getSheetByName(TABS.entries.name);
  var noteIds = filterSheet_(ns, TABS.notes.cols.length, function (r) { return String(r[11]) !== batch; });
  var stillUsed = {};
  readRows_(ns, TABS.notes.cols).forEach(function (n) { stillUsed[String(n.entryId)] = 1; });
  var entryIds = filterSheet_(es, TABS.entries.cols.length,
    function (r) { return String(r[6]) !== batch || stillUsed[String(r[0])]; });
  tombstones_(ss, noteIds.map(function (x) { return { id: x, kind: 'note' }; })
    .concat(entryIds.map(function (x) { return { id: x, kind: 'entry' }; })));
  return { notes: noteIds.length, entries: entryIds.length };
}

function setPosition_(ss, op) {
  var name = cleanText_(op.reader, 40);
  if (!name) throw new Error('reader required');
  var book = Math.max(1, Math.min(99, parseInt(op.book, 10) || 1));
  var chapter = Math.max(1, Math.min(999, parseInt(op.chapter, 10) || 1));
  var sh = ss.getSheetByName(TABS.readers.name);
  var row = findRow_(sh, name);
  var now = new Date().toISOString();
  if (row > 0) sh.getRange(row, 2, 1, 3).setValues([[book, chapter, now]]);
  else sh.appendRow([name, book, chapter, now]);
}
