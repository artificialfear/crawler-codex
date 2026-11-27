"""Turn a compact chapter spec (JSON) into an importBatch payload.
Spec format (one file per batch, kept OUT of the public repo: import/batches/ is gitignored):
{
  "batch": "b1-pilot",
  "existing": {"Carl": "seed-carl", ...},          # names already in the codex -> entry id
  "new": {"Mrs. Parsons": "character", ...},        # new entries -> type
  "chapters": [
    {"book": 1, "chapter": 1,
     "seen": ["Carl", "Princess Donut", ...],       # everyone who appears -> one sighting each
     "notes": {"Carl": "short note in our own words", ...},
     "aliases": {"Beatrice": ["B"]}}
  ]
}
Every note/sighting id is deterministic, so re-importing the same spec adds nothing."""
import json, re, sys

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def build(spec):
    batch = spec['batch']
    ids = dict(spec.get('existing', {}))
    entries = []
    for name, typ in spec.get('new', {}).items():
        eid = 'imp-' + slug(name)
        ids[name] = eid
        entries.append({'id': eid, 'name': name, 'type': typ})
    notes = []
    for ch in spec['chapters']:
        b, c = ch['book'], ch['chapter']
        tag = f'b{b}c{c}'
        def eid(name):
            if name not in ids:
                raise SystemExit(f'Unknown name in {tag}: {name!r} (add it to "existing" or "new")')
            return ids[name]
        seen = list(dict.fromkeys(ch.get('seen', []) + list(ch.get('notes', {})) + list(ch.get('aliases', {}))))
        for name in seen:
            notes.append({'id': f'imp-{tag}-{slug(name)}-seen', 'entryId': eid(name), 'book': b, 'chapter': c, 'kind': 'mention', 'text': ''})
        for name, text in ch.get('notes', {}).items():
            texts = text if isinstance(text, list) else [text]
            for i, t in enumerate(texts):
                notes.append({'id': f'imp-{tag}-{slug(name)}-n{i}', 'entryId': eid(name), 'book': b, 'chapter': c, 'kind': 'note', 'text': t})
        for name, als in ch.get('aliases', {}).items():
            for a in als:
                notes.append({'id': f'imp-{tag}-{slug(name)}-a-{slug(a)}', 'entryId': eid(name), 'book': b, 'chapter': c, 'kind': 'alias', 'text': a})
    for n in notes:
        if n['book'] < 1 or n['chapter'] < 1:
            raise SystemExit('every imported note needs a real book and chapter')
    return {'type': 'importBatch', 'batch': batch, 'entries': entries, 'notes': notes}

if __name__ == '__main__':
    spec = json.load(open(sys.argv[1]))
    out = build(spec)
    json.dump(out, open(sys.argv[2], 'w'), indent=1)
    print(f"{out['batch']}: {len(out['entries'])} new entries, "
          f"{sum(n['kind']=='mention' for n in out['notes'])} sightings, "
          f"{sum(n['kind']=='note' for n in out['notes'])} notes, {sum(n['kind']=='alias' for n in out['notes'])} aliases")
