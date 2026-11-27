# Dungeon Crawler Codex: chapter extraction brief

You are helping fill a spoiler-free companion app for two people listening to the
Dungeon Crawler Carl audiobooks. A reader at Book B, Chapter C sees ONLY notes tagged at
or before (B, C). Your notes for a chapter must therefore contain only what a listener
knows by the END of that chapter. A note that reveals anything from a later chapter or
later book is a spoiler and is the worst possible mistake.

## Your input
- `/home/claude/work/chapters/B{book}/c{NN}.txt`: Whisper transcript of one real chapter
  (epilogues and the bonus "ad"/interstitial material after them are already filed as
  the last chapter number). Read every chapter you're assigned, in order, in full.
- `/home/claude/work/roster/roster.json`: entries already in the app (name, id, type,
  aliases). Reuse these EXACT names. Whisper misspells invented names; map them to the
  roster (e.g. Audette → Odette, Lexus → Lexis, Borent → Borant Corporation,
  Kuatine → Kua-tin, Necrobar → NecroBard). Ignore garbled filler at chapter ends.
- Your ONLY knowledge source is the transcript text you are given. Do NOT use anything
  you remember about the books from training: it will leak later-book information.

## Your output
Write ONE JSON file at the path you are given, then reply with one line:
`done: <path> | chapters X–Y | N new entries | M notes`.

```json
{
  "book": 2,
  "new": {
    "Odette's show": {"type": "show"},
    "Zev": {"type": "character"}
  },
  "chapters": [
    {"book": 2, "chapter": 1,
     "seen": ["Carl", "Princess Donut", "Mordecai", "Mongo"],
     "notes": {
       "Mordecai": "Now an incubus running the third-floor guild hall; hates the tuxedo.",
       "Princess Donut": ["Picks the Former Child Actor class while pretending to choose Artist Alley Mogul.", "..."]
     },
     "aliases": {"Mordecai": ["Mordy"]}
    }
  ]
}
```

- `type` is one of: character, place, group, mechanic, show, item, other.
- Every name in `seen`, `notes` and `aliases` must be either a roster name or a key in
  your `new`. Use the roster's canonical name, never a variant.
- Include every chapter you were assigned, even if quiet.

## What gets an entry (`new`)
Create entries a listener would plausibly want to look up later:
- Named characters who speak, act, or matter to the plot (crawlers, NPCs, show hosts,
  aliens, bosses). Also important unnamed roles that recur ("the AI", a recurring
  announcer) if not already in the roster.
- Places, groups/races/factions, shows, game mechanics/rules, classes/races the party
  picks, and items that matter to the story (signature weapons, key loot, Carl's
  explosives tech if named) or recur.
Be strict with items: gear the party just picks up or sells does NOT get an entry unless
it keeps mattering (used again in later chapters, central to a fight or plot point).
Mention ordinary loot inside the owner's note instead. Same for one-time spells.
SKIP: one-off monsters with no name or plot role, generic loot, spells/skills that are
used once, throwaway jokes, real-world brands/celebrities. Aim for quality over volume:
roughly 1–5 new entries per chapter, fewer in quiet chapters.
Names: the most common full name the text uses. Groups plural ("Goblins").

The roster already holds entries created by earlier helpers for earlier chapters. Reuse
them; never create a second entry for something that's there under another spelling.

## `seen`
Every roster or new entry that actually appears or is meaningfully mentioned in that
chapter (present, speaking, on screen, or discussed by name). This drives "In this
chapter" and "last seen", so be generous and accurate here.

## Notes
- New development only: what this chapter adds about that entry. Don't restate earlier
  notes. The FIRST note for a new entry says who/what it is as known right now.
- 1–2 short sentences, plain words, in our own words. No quotations, no copied phrasing
  from the transcript, no dialogue.
- Facts, not speculation. Tense: present ("Joins the party", "Is revealed to be...").
- Roughly 4–12 notes per chapter. Main party (Carl, Princess Donut, Mongo, Katia Grim,
  Mordecai) only when something genuinely changes: new class/race, big decision, new
  ability or item, relationship shift, injury, level milestone worth knowing.
- Deaths, betrayals and reveals are allowed ONLY in the chapter where they happen.
- `aliases`: other names/titles the text actually uses for an entry, first time each is
  used (e.g. "Donut" for Princess Donut is already filed). Include a bare surname or
  nickname only if the text uses it.

## Validate before you reply
Run: `python3 /home/claude/work/check_part.py <your file>` and fix every error it reports.
