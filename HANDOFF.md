# Crawler Codex — Handoff

Spoiler-safe "who's who" companion for Mat and Emily listening to the Dungeon Crawler Carl audiobooks
(Mat: Smart AudioBook Player on Android; Emily: BookPlayer on iPhone). Each person sets their own
book + chapter; the app only shows entries and notes at or before that spot.

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
- [ ] Mat: create Sheet, paste Code.gs + Seed.gs, run setup(), deploy, enter URL + passphrase, send setup link to Emily.
- [ ] Phase 2 transcription: faster-whisper on Mat's PC over his DCC audio files → per-chapter transcripts
      (kept local, never in this repo) → Claude extracts entries/notes chapter by chapter → import via a
      bulk op (add an `importNotes` path or batch upsertNote ops). Needs: file format/folder of the audio,
      how files map to chapters.
- [ ] Possible: Books tab chapter counts to stop the stepper past the last chapter.
