import json,sys
TYPES={'character','place','group','mechanic','show','item','other'}
r=json.load(open('/home/claude/work/roster/roster.json'))
known={e['name'] for e in r}
p=json.load(open(sys.argv[1])); err=[]
new=p.get('new',{})
for n,v in new.items():
    t=v.get('type') if isinstance(v,dict) else v
    if t not in TYPES: err.append(f'bad type {n}:{t}')
    if n in known: err.append(f'"{n}" is already in roster; remove from new')
    low={k.lower() for k in known}|{a.lower() for e in r for a in e['aliases']}
    if n.lower() in low and n not in known: err.append(f'"{n}" matches a roster name/alias case-insensitively; use the roster name')
names=known|set(new)
for ch in p.get('chapters',[]):
    tag=f"B{ch.get('book')}c{ch.get('chapter')}"
    if not isinstance(ch.get('chapter'),int) or ch['book']!=p['book']: err.append(f'{tag}: bad book/chapter')
    for n in ch.get('seen',[]):
        if n not in names: err.append(f'{tag}: seen "{n}" not in roster/new')
    for n,t in ch.get('notes',{}).items():
        if n not in names: err.append(f'{tag}: note for unknown "{n}"')
        for x in (t if isinstance(t,list) else [t]):
            if not x.strip(): err.append(f'{tag}: empty note {n}')
            if len(x)>320: err.append(f'{tag}: note too long for {n} ({len(x)} chars)')
            if '"' in x or '“' in x: err.append(f'{tag}: note for {n} contains quotes; paraphrase')
        if n not in ch.get('seen',[]): err.append(f'{tag}: {n} has a note but is not in seen')
    for n in ch.get('aliases',{}):
        if n not in names: err.append(f'{tag}: alias for unknown "{n}"')
used={n for ch in p['chapters'] for n in ch.get('seen',[])}
for n in new:
    if n not in used: err.append(f'new entry "{n}" never appears in seen')
print('\n'.join(err) if err else f"OK: {len(p['chapters'])} chapters, {len(new)} new, {sum(len(v) if isinstance(v,list) else 1 for ch in p['chapters'] for v in ch.get('notes',{}).values())} notes")
sys.exit(1 if err else 0)
