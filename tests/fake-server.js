// Serves the app AND runs the real Code.gs/Seed.gs behind a fake /exec endpoint,
// so UI tests exercise the true backend logic. Usage: node tests/fake-server.js 8765
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const port = Number(process.argv[2] || 8765);

// --- minimal Apps Script mocks (same shape as backend.test.js) ---
function makeSheet() {
  const rows = [];
  return {
    getLastRow: () => rows.length,
    getRange(r, c, nr = 1, nc = 1) {
      return {
        setValues(vals) { vals.forEach((v, i) => { while (rows.length < r + i) rows.push([]); v.forEach((x, j) => { rows[r - 1 + i][c - 1 + j] = x; }); }); return this; },
        setValue(v) { while (rows.length < r) rows.push([]); rows[r - 1][c - 1] = v; return this; },
        getValues() { const o = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; const x = []; for (let j = 0; j < nc; j++) x.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); o.push(x); } return o; },
        setFontWeight() { return this; }
      };
    },
    appendRow(v) { rows.push(v.slice()); }, deleteRow(r) { rows.splice(r - 1, 1); }, setFrozenRows() {}
  };
}
const sheets = {}, props = { PASSPHRASE: 'test-pass' };
const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = makeSheet()) };
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => ({}) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ text: s, setMimeType() { return this; } }) },
  Logger: { log() {} }, console, Date, JSON, Math, String, Number, Object, Array, Error, parseInt
};
vm.createContext(ctx);
['Seed.gs', 'Code.gs'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, 'apps-script', f), 'utf8'), ctx));
ctx.setup();

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const cors = { 'Access-Control-Allow-Origin': '*' };
  if (url.pathname === '/exec') {
    if (req.method === 'GET') {
      const out = ctx.doGet({ parameter: Object.fromEntries(url.searchParams) });
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(out.text); return;
    }
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', () => {
      const out = ctx.doPost({ postData: { contents: body } });
      res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors)); res.end(out.text);
    });
    return;
  }
  const file = path.join(root, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log('fake server on', port));
