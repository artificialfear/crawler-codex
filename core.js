/* Crawler Codex — pure logic (no DOM). Shared by index.html and tests. */
(function (root) {
  'use strict';

  // A note is visible at a reader position if it comes at or before it.
  // chapter 0 = "somewhere in book N" -> only visible once the reader is PAST book N.
  function noteVisible(note, pos) {
    if (!pos) return false;
    if (note.book < pos.book) return true;
    if (note.book > pos.book) return false;
    if (!note.chapter) return false;
    return note.chapter <= pos.chapter;
  }

  function posKey(n) { return n.book * 1000 + (n.chapter || 0); }

  function fmtPos(n) {
    return n.chapter ? 'Book ' + n.book + ' · Ch ' + n.chapter : 'Book ' + n.book;
  }

  function normalize(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  // Build the reader's view: only entries with at least one visible note,
  // and for each, only its visible notes (sorted by story position).
  function buildView(data, pos) {
    const byEntry = {};
    (data.notes || []).forEach((n) => {
      if (!noteVisible(n, pos)) return;
      (byEntry[n.entryId] = byEntry[n.entryId] || []).push(n);
    });
    const out = [];
    (data.entries || []).forEach((e) => {
      const notes = byEntry[e.id];
      if (!notes) return;
      notes.sort((a, b) => posKey(a) - posKey(b) || String(a.createdAt).localeCompare(String(b.createdAt)));
      const aliases = notes.filter((n) => n.kind === 'alias' && n.text).map((n) => n.text);
      const last = notes.reduce((m, n) => (posKey(n) >= posKey(m) ? n : m), notes[0]);
      out.push({ entry: e, notes, aliases, first: notes[0], last, latest: posKey(last) });
    });
    return out;
  }

  function scoreMatch(view, q) {
    const nq = normalize(q);
    if (!nq) return null;
    const names = [view.entry.name].concat(view.aliases).map(normalize);
    let best = null;
    names.forEach((name) => {
      let s = null;
      if (name === nq) s = 0;
      else if (name.startsWith(nq)) s = 1;
      else if (name.split(' ').some((w) => w.startsWith(nq))) s = 2;
      else if (name.includes(nq)) s = 3;
      else if (nq.length >= 4) {
        // fuzzy: heard-it-in-audio spellings (Katya -> Katia)
        const words = name.split(' ').concat([name]);
        const tol = nq.length >= 7 ? 2 : 1;
        if (words.some((w) => Math.abs(w.length - nq.length) <= tol && lev(w, nq) <= tol)) s = 4;
      }
      if (s !== null && (best === null || s < best)) best = s;
    });
    return best;
  }

  function search(views, q) {
    return views
      .map((v) => ({ v, s: scoreMatch(v, q) }))
      .filter((x) => x.s !== null)
      .sort((a, b) => a.s - b.s || a.v.entry.name.localeCompare(b.v.entry.name))
      .map((x) => Object.assign({ fuzzy: x.s === 4, exact: x.s === 0 }, x.v));
  }

  // Find any entry (visible or not) whose name/alias matches exactly.
  // Used so a quick-add of a name that exists later in the story silently
  // attaches to that entry instead of duplicating it — without revealing anything.
  function findByNameAnywhere(data, name) {
    const nq = normalize(name);
    if (!nq) return null;
    const aliasOwner = {};
    (data.notes || []).forEach((n) => {
      if (n.kind === 'alias' && normalize(n.text) === nq) aliasOwner[n.entryId] = true;
    });
    return (data.entries || []).find((e) => normalize(e.name) === nq || aliasOwner[e.id]) || null;
  }

  // ---- name links inside note text ----
  // Only names/aliases from the reader's VISIBLE entries are linked, so a link
  // can never hint at someone the reader hasn't met yet.
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function makeLinker(views) {
    const terms = new Map(); // lowercased term -> { id, proper }
    views.forEach((v) => {
      [v.entry.name].concat(v.aliases).forEach((t) => {
        t = String(t || '').trim();
        if (t.length < 3) return;
        const key = t.toLowerCase();
        if (!terms.has(key)) terms.set(key, { id: v.entry.id, proper: /^[A-Z]/.test(t) });
      });
    });
    const keys = Array.from(terms.keys()).sort((a, b) => b.length - a.length);
    const re = keys.length
      ? new RegExp('(?<![A-Za-z0-9])(' + keys.map(escRe).join('|') + ')(?![A-Za-z0-9])', 'gi')
      : null;
    // Returns [{text}, {text, entryId}, ...]; each entry linked once per note, never itself.
    // Proper names ("Carl") only match capitalized text; lowercase terms ("loot box") match any case.
    return function linkify(text, selfId) {
      text = String(text || '');
      if (!re) return [{ text }];
      const out = [];
      const used = new Set();
      let last = 0;
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const t = terms.get(m[1].toLowerCase());
        if (!t || t.id === selfId || used.has(t.id)) continue;
        if (t.proper && !/^[A-Z]/.test(m[1])) continue;
        used.add(t.id);
        if (m.index > last) out.push({ text: text.slice(last, m.index) });
        out.push({ text: m[1], entryId: t.id });
        last = m.index + m[1].length;
      }
      if (last < text.length) out.push({ text: text.slice(last) });
      return out;
    };
  }

  // ---- lists ----
  // Notes either person added (not starter data) that the reader is allowed to see, newest first.
  function recentNotes(data, pos, limit) {
    const entries = {};
    (data.entries || []).forEach((e) => { entries[e.id] = e; });
    return (data.notes || [])
      .filter((n) => n.author && n.author !== 'seed' && entries[n.entryId] && noteVisible(n, pos))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit || 40)
      .map((n) => ({ note: n, entry: entries[n.entryId] }));
  }

  // Group visible entries by the book where the reader first met them.
  function groupByFirstBook(views) {
    const groups = {};
    views.forEach((v) => { (groups[v.first.book] = groups[v.first.book] || []).push(v); });
    return Object.keys(groups).map(Number).sort((a, b) => a - b)
      .map((book) => ({ book, views: groups[book].sort((a, b) => a.entry.name.localeCompare(b.entry.name)) }));
  }

  function uid(prefix) {
    return (prefix || 'x') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  // Mirror of the server's op handling, for optimistic local updates.
  function applyOp(data, op) {
    const d = data;
    d.entries = d.entries || []; d.notes = d.notes || []; d.readers = d.readers || [];
    if (op.type === 'upsertEntry') {
      const i = d.entries.findIndex((e) => e.id === op.entry.id);
      if (i >= 0) d.entries[i] = Object.assign({}, d.entries[i], { name: op.entry.name, type: op.entry.type });
      else d.entries.push(Object.assign({}, op.entry));
    } else if (op.type === 'upsertNote') {
      const n = Object.assign({ kind: 'note', verified: false, seed: false }, op.note);
      n.book = Number(n.book) || 1; n.chapter = Number(n.chapter) || 0;
      const i = d.notes.findIndex((x) => x.id === n.id);
      if (i >= 0) d.notes[i] = n; else d.notes.push(n);
    } else if (op.type === 'deleteNote') {
      d.notes = d.notes.filter((n) => n.id !== op.id);
    } else if (op.type === 'deleteEntry') {
      d.notes = d.notes.filter((n) => n.entryId !== op.id);
      d.entries = d.entries.filter((e) => e.id !== op.id);
    } else if (op.type === 'setPosition') {
      const r = d.readers.find((x) => x.name === op.reader);
      if (r) { r.book = op.book; r.chapter = op.chapter; }
      else d.readers.push({ name: op.reader, book: op.book, chapter: op.chapter });
    }
    return d;
  }

  const api = { noteVisible, posKey, fmtPos, normalize, lev, buildView, search, findByNameAnywhere,
    makeLinker, recentNotes, groupByFirstBook, uid, applyOp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Codex = api;
})(this);
