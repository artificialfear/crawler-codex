# Crawler Codex — Handoff

Spoiler-safe "who's who" companion for Mat and Emily listening to the Dungeon Crawler Carl audiobooks
(Mat: Smart AudioBook Player on Android, on Book 6; Emily: BookPlayer on iPhone, starting Book 8 — as of 2026-11-26). Each person sets their own
book + chapter; the app only shows entries and notes at or before that spot.

## Live setup (2026-11-26)
- Sheet: https://docs.google.com/spreadsheets/d/1PlADJa8RFrtMzanqXcnaQ1oj7tc_--tXiRdsjNa7Lcc (mathew.t.graham@gmail.com)
- Bound Apps Script project "Crawler Codex" (script id 10ZUM1FBW31tt2wajnbhJx1cPtUBTB37izOrw0ae0Wd4xcOOOHxhxDOad)
- Web app deployment (v1, Execute as Me, Anyone):
  https://script.google.com/macros/s/AKfycbwner_ipHv5miM8Hg28vHxA6MJjKKIkYIJK9wmfSL5-Hfdt2qnW1j-oV49TvYCNb_lDDg/exec
  Updates: Manage deployments → edit this one → New version (never New deployment).
- Passphrase: Sheet → Crawler Codex menu → Show passphrase (not stored in this public repo).
- Installed by pasting files into the Monaco editor via Claude in Chrome (monaco.editor.getModels()[i].setValue).

## Transcription status (2026-11-26 19:50)
- Installed on Mat's PC "cthulhu" (RTX 5070 12 GB, Python 3.14.2, FFmpeg via winget) in
  C:\Users\mathe\Downloads\DCC Books\Crawler Codex\ (Run-Transcriber.bat). large-v3-turbo on CUDA, ~57x realtime.
- All 8 books present (~159 h audio) -> roughly 3 h total. Output: ...\Crawler Codex\transcripts\BookNN\mNNN.txt.
- Fix applied: faster-whisper's PyAV decode broke (open() got unexpected 'metadata_errors'); script now feeds float32 samples.
- Next: read transcripts (device link to the PC, folder "DCC Books" granted) and generate chapter-tagged notes
  for Books 1-8; map marker -> real chapter via spoken_chapter; import as notes (author "codex", verified false).

## Architecture
- `index.html` + `core.js`: static app on GitHub Pages (artificialfear/crawler-codex). No libraries, no CDNs.
- `apps-script/Code.gs` + `Seed.gs`: bound to a Google Sheet on Mat's **personal** Google account.
  Web app deployed "Execute as: Me / Anyone". GET returns everything; POST takes a batch of ops.
- Sheet tabs: Entries, Notes, Readers, Books, Config. **Everything the user sees is a Note**
  (`kind`: note | alias | mention). An entry is visible only if one of its notes is visible.
- Passphrase lives in Script Properties (also shown on Config tab). It's sent with every request.
  Light security only (household use); anyone with URL + passphrase can read/write.
- Phones cache data + an op queue in localStorage, so it works with flaky signal and syncs later.
  Ops carry client ids → retries are idempotent (upsert by id).

## v1.1 UI (2026-11-26)
- Tabs Now/Browse/Recent; pins + open browse groups + achievements are per-device localStorage (cc.pins, cc.open, cc.ach).
- core.makeLinker links only VISIBLE names/aliases (proper names need a capital letter; lowercase aliases match any case).
- core.recentNotes excludes seed + anything past the reader. Font: fonts/VT323 (OFL).
- Art slots: `ART` constant at top of index.html (banner, background, per-type icons in /art). Prompts in art/PROMPTS.md.

## Spoiler rules (core.js `noteVisible`)
- Note visible if (book, chapter) ≤ reader position.
- `chapter 0` = "somewhere in Book N" → visible only once the reader is **past** Book N.
- Notes can't be tagged ahead of the author's own spot (UI clamps).
- Aliases are notes, so a later-book nickname stays hidden too.
- Quick-adding a name that already exists later in the story silently attaches a mention to that
  entry (no duplicate, nothing revealed). Known minor tell: the entry's type/capitalization come
  from whoever created it.
- Never show counts of hidden notes ("3 more later") — that's itself a spoiler.

## Seed
- `Seed.gs`: ~74 entries from Books 1–4 (characters, places, groups, shows, mechanics), all chapter 0,
  all `verified=false`. Written from SuperSummary per-book character lists + general knowledge, in our
  own words. When unsure of the book, tagged the later one. Emily should spot-check and tap ✓.
- setup() only loads the seed if Entries is empty.

## Tests
- `node tests/backend.test.js` — Code.gs with Apps Script mocks.
- `node tests/core.test.js` — spoiler filter, search, ops.
- `python3 tests/ui_test.py` — Playwright on phone sizes against `tests/fake-server.js`
  (serves the app and runs the real Code.gs). Screenshots → tests/shots/ (gitignored).

## Decisions (Mat, 2026-11-26)
- Google Sheet + Apps Script backend. Seed main recurring cast for Books 1–4.
- Scope: characters + places, groups, shows, mechanics, items.
- Low friction is the top priority (Emily has to actually use it while listening).
- Auto-adding characters live via mic was ruled out (background mic blocked on phones, headphones,
  name recognition). Chosen instead: **phase 2 = transcribe the audiobook files on Mat's PC
  (NVIDIA GPU) and build the database from the real text, chapter-tagged.**

## Open items / phase 2
- [x] Sheet created, code installed, setup() run (73 entries / 119 notes), web app deployed, verified from GitHub Pages.
- [ ] Mat/Emily: open setup link on phones, pick names, Add to Home Screen. Emily: check off seed notes.
- [ ] Phase 2 transcription — script ready: `transcribe/codex_transcribe.py` (+ RUN-ON-WINDOWS.md).
      Audio: one .m4b per book with embedded chapter markers; files live on Mat's **Windows PC**
      (the chat-linked computer is his MacBook, and device_bash is a Linux VM without GPU, so Mat runs it natively).
      `chapters` subcommand → chapters_report.txt (waiting on Mat). Then `transcribe` → per-marker txt with
      header incl. `spoken_chapter` (narrator's "Chapter N") to map markers → real chapter numbers.
      Old note: faster-whisper on Mat's PC over his DCC audio files → per-chapter transcripts
      (kept local, never in this repo) → Claude extracts entries/notes chapter by chapter → import via a
      bulk op (add an `importNotes` path or batch upsertNote ops). Needs: file format/folder of the audio,
      how files map to chapters.
- [ ] Possible: Books tab chapter counts to stop the stepper past the last chapter.
