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

## Transcript import (pilot done 2026-11-26)
- import/build_batch.py turns a chapter spec into an importBatch op (deterministic ids: imp-b{B}c{C}-{slug}-seen|n{i}|a-{alias}).
  Specs/payloads live in import/batches/ (gitignored — keep notes off the public repo).
- Pilot batch `b1-pilot` (Book 1 ch 1–3: 13 entries, 34 sightings, 28 notes) imported via POST from a browser tab.
- Whisper quirks: misspells invented names (Borent→Borant, Kuatine→Kua-tin); hallucinated filler at some chapter ends.
- Scale: ~1.5M words across 8 books; ~5k tokens per chapter to read. Needs batching across sessions/helpers.
- Undo an import: POST {type:'removeBatch', batch:'b1-pilot'}.

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

## Sync v2 (1.5.0)
- Sheet columns added (append-only): Entries.updatedAt/batch, Notes.updatedAt/batch; new Deleted tab (tombstones).
- GET ?since=ISO returns only changed rows + deletions; client stores data in IndexedDB ('crawler-codex'/'kv'/'data').
- adopt(): full -> replace; delta -> deletions first, then upserts (so undo-after-delete survives).
- importBatch {batch, entries, notes} bulk appends (author 'codex'); removeBatch {batch} undoes it, keeping entries people annotated.
- sw.js: page network-first (4 s), assets cache-first (content-hashed URLs). Page posts its loaded assets to the worker on first visit.

## Cache busting
- All asset URLs in index.html carry ?v=<content hash>. After changing ANY asset (core.js, art, fonts, icons, manifest) run `python3 tools/stamp.py`. tests/ui_test.py fails on stale stamps.

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


## Audiobook import (Nov 27, 2026)
- All 8 books imported from Whisper transcripts: batches `b1-pilot` (Book 1 ch 1–3), `b1`…`b8`.
  Sheet now holds 1,056 entries, ~18,700 notes (about 1,450 written notes, the rest sightings + aliases).
- Pipeline and the extraction brief: `import/pipeline/` (see its README). Batch files stay gitignored.
- Future books (9+): same process once the PC finishes transcribing; Book 8 must only be imported up to Emily's needs
  (every note is spoiler-gated by chapter anyway).
- Whisper misspellings were kept as aliases where helpers filed them (e.g. Zarina Signet) — harmless, helps search.

## v1.7.0 (Nov 27, 2026)
- core.js: chaptersSeen, isMinor (codex-only and ≤2 chapters), sortViews, recapChapters, chapterRecap, coSeen (shared/sqrt(total), ≥2 shared), fmtRanges, notesByBook.
- Browse sort saved in localStorage `cc.sort`. Minor toggles are per session.
- Entry book groups: open = current book or last-noted book, unless the reader tapped a summary (state.openNoteBooks). Don't use the details 'toggle' event to track this, because it also fires on render.
- Recap sheet: state.recap; entry opened from a recap sets state.backTo for the ◂ Recap button.
- tests/perf_test.py loads the real (gitignored) batches into the fake server; 4× CPU throttle, all actions under ~200 ms. Full download is ~2.7 MB.

## v1.8.0
- core.js PLAYER_MAP (track → real chapter per book), generated by `import/pipeline/player_map.py` from the transcript headers. Unnumbered tracks (intro, dedication, prologue, interludes) map to the NEXT numbered chapter; trailing tracks map to the epilogue. Rerun with `python3 player_map.py /path/to/core.js` after Books 7–8 finish, then restamp.
- Book 6 offset is 3 (intro + dedication + prologue). Mat's spot was corrected from 6/10 to 6/8 on Nov 27.
- split.py now also skips Dedication/Acknowledgements/"That's the end" tracks.
- build_book/merge_roster: exact entry names now win over aliases (an alias "Rend" on Surrendalgor had swallowed the separate entry Rend).
- Nov 27: merged duplicate entry Juergen into Jürgen (imp-j-rgen) by re-pointing its b7 notes and deleting imp-juergen.
