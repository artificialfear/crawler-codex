/**
 * Crawler Codex — Apps Script backend
 * Bound to the "Crawler Codex" Google Sheet (Mat's personal account).
 *
 * Files in this project:
 *   Code.gs  — this file (API + setup)
 *   Seed.gs  — Books 1–4 starter data (SEED_ENTRIES)
 *
 * First-time setup:
 *   1. Run setup() once from the editor. It builds the tabs, loads the seed,
 *      and writes a passphrase to the execution log (also on the Config tab).
 *   2. Deploy > New deployment > Web app > Execute as: Me, Who has access: Anyone.
 *   3. Paste the /exec URL and passphrase into the app's Settings.
 *
 * API
 *   GET  ?key=PASS                       -> { ok, entries, notes, readers, books }
 *   POST body (text/plain JSON) { key, ops: [...] } -> { ok, applied }
 *     op types: upsertEntry, upsertNote, deleteNote, deleteEntry, setPosition
 *   Every op carries a client-made id, so retries are safe (upsert by id).
 */

var TABS = {
  entries: { name: 'Entries', cols: ['id', 'name', 'type', 'createdBy', 'createdAt'] },
  notes:   { name: 'Notes',   cols: ['id', 'entryId', 'book', 'chapter', 'kind', 'text', 'author', 'createdAt', 'verified', 'seed'] },
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

var DEFAULT_READERS = [['Mat', 5, 1], ['Emily', 7, 1]];
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
  SEED_ENTRIES.forEach(function (e, i) {
    var id = 'seed-' + slug_(e.name);
    entryRows.push([id, e.name, e.type, 'seed', now]);
    (e.notes || []).forEach(function (n, j) {
      noteRows.push([id + '-n' + j, id, n.book, n.chapter || 0, n.kind || 'note',
                     n.text, 'seed', now, false, true]);
    });
  });
  var es = ss.getSheetByName(TABS.entries.name);
  var ns = ss.getSheetByName(TABS.notes.name);
  if (entryRows.length) es.getRange(2, 1, entryRows.length, TABS.entries.cols.length).setValues(entryRows);
  if (noteRows.length) ns.getRange(2, 1, noteRows.length, TABS.notes.cols.length).setValues(noteRows);
  return entryRows.length;
}

function slug_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* ---------- web app ---------- */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!checkKey_(p.key)) return json_({ ok: false, error: 'bad-key' });
  return json_(readAll_());
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
  lock.waitLock(20000);
  try {
    var applied = applyOps_(body.ops || []);
    var out = readAll_();
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

function readAll_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    ok: true,
    entries: readRows_(ss.getSheetByName(TABS.entries.name), TABS.entries.cols),
    notes: readRows_(ss.getSheetByName(TABS.notes.name), TABS.notes.cols).map(function (n) {
      n.book = Number(n.book) || 0;
      n.chapter = Number(n.chapter) || 0;
      n.verified = n.verified === true || String(n.verified).toUpperCase() === 'TRUE';
      n.seed = n.seed === true || String(n.seed).toUpperCase() === 'TRUE';
      return n;
    }),
    readers: readRows_(ss.getSheetByName(TABS.readers.name), TABS.readers.cols).map(function (r) {
      r.book = Number(r.book) || 1;
      r.chapter = Number(r.chapter) || 1;
      return r;
    }),
    books: readRows_(ss.getSheetByName(TABS.books.name), TABS.books.cols).map(function (b) {
      b.num = Number(b.num);
      return b;
    }),
    serverTime: new Date().toISOString()
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
      switch (op.type) {
        case 'upsertEntry': upsertEntry_(ss, op); break;
        case 'upsertNote': upsertNote_(ss, op); break;
        case 'deleteNote': deleteById_(ss.getSheetByName(TABS.notes.name), op.id); break;
        case 'deleteEntry': deleteEntry_(ss, op.id); break;
        case 'setPosition': setPosition_(ss, op); break;
        default: throw new Error('unknown op ' + op.type);
      }
      applied.push({ opId: op.opId, ok: true });
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

function upsertEntry_(ss, op) {
  var e = op.entry || {};
  if (!e.id || !cleanText_(e.name)) throw new Error('entry needs id and name');
  var type = ENTRY_TYPES.indexOf(e.type) >= 0 ? e.type : 'character';
  var sh = ss.getSheetByName(TABS.entries.name);
  var row = findRow_(sh, e.id);
  if (row > 0) {
    sh.getRange(row, 2, 1, 2).setValues([[cleanText_(e.name, 120), type]]);
  } else {
    sh.appendRow([e.id, cleanText_(e.name, 120), type, cleanText_(e.createdBy, 40), e.createdAt || new Date().toISOString()]);
  }
}

function upsertNote_(ss, op) {
  var n = op.note || {};
  if (!n.id || !n.entryId) throw new Error('note needs id and entryId');
  var book = Math.max(1, Math.min(99, parseInt(n.book, 10) || 1));
  var chapter = Math.max(0, Math.min(999, parseInt(n.chapter, 10) || 0));
  var kind = NOTE_KINDS.indexOf(n.kind) >= 0 ? n.kind : 'note';
  var sh = ss.getSheetByName(TABS.notes.name);
  var row = findRow_(sh, n.id);
  var values = [n.id, n.entryId, book, chapter, kind, cleanText_(n.text), cleanText_(n.author, 40),
                n.createdAt || new Date().toISOString(), !!n.verified, !!n.seed];
  if (row > 0) {
    sh.getRange(row, 1, 1, values.length).setValues([values]);
  } else {
    sh.appendRow(values);
  }
}

function deleteById_(sh, id) {
  var row = findRow_(sh, id);
  if (row > 0) sh.deleteRow(row);
}

function deleteEntry_(ss, id) {
  var ns = ss.getSheetByName(TABS.notes.name);
  var last = ns.getLastRow();
  if (last >= 2) {
    var vals = ns.getRange(2, 2, last - 1, 1).getValues();
    for (var i = vals.length - 1; i >= 0; i--) {
      if (String(vals[i][0]) === String(id)) ns.deleteRow(i + 2);
    }
  }
  deleteById_(ss.getSheetByName(TABS.entries.name), id);
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
