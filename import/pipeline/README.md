# Audiobook → Codex import pipeline

Working dir is `/home/claude/work` (outside the repo; transcripts and generated notes never get committed).

1. Stage `transcripts/BookNN` from the PC, extract to `/home/claude/tx`, run `split.py` → `chapters/B{n}/cNN.txt`
   (real chapter = spoken "Chapter N"; epilogue and post-epilogue bonus = last+1; intro/credits dropped).
2. `roster/roster.json` = every entry already in the Sheet (name, id, type, aliases). `roster.base.json` = what existed before the run.
3. Helpers each take ~5–9 chapters, follow `AGENT_BRIEF.md`, write `parts/B{n}_w{k}.json`, validate with `check_part.py`.
   Run in waves (chunk k of every book in parallel); run `merge_roster.py` between waves so later helpers reuse earlier names.
4. `leakcheck.py` flags note words that never appear in the transcript up to that chapter (mostly spelling noise; read the list).
5. For each book in order: `build_book.py N` → `import/batches/bN.spec.json`, then `build_batch.py` → `bN.json`;
   `imported_ids.json` tracks which entries earlier batches already created.
6. Upload: the workspace and PC can't reach script.google.com, so attach the bN.json files to a file input injected
   into the app tab in Chrome (file_upload), then POST each as an `importBatch` op from that tab. Undo = `removeBatch`.
