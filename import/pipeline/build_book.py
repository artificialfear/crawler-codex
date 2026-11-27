# Combine all parts for one book into a build_batch spec, mapping every name to its canonical roster entry.
import json,glob,re,sys
b=int(sys.argv[1]); imported=set(json.load(open('imported_ids.json'))) if glob.glob('imported_ids.json') else set()
norm=lambda s:re.sub(r'^(the )','',re.sub(r'[^a-z0-9 ]','',s.lower())).strip()
r=json.load(open('roster/roster.json')); idx={}
for e in r: idx.setdefault(norm(e['name']),e)          # exact names win over aliases
for e in r:
    for n in e['aliases']: idx.setdefault(norm(n),e)
base={e['id'] for e in json.load(open('roster/roster.base.json'))}
imported|=base
canon=lambda n: idx[norm(n)]['name']
chapters=[]; used=set()
for f in sorted(glob.glob(f'parts/B{b}_w*.json')):
    for ch in json.load(open(f))['chapters']:
        c={'book':b,'chapter':ch['chapter'],'seen':list(dict.fromkeys(canon(n) for n in ch.get('seen',[]))),'notes':{},'aliases':{}}
        for n,t in ch.get('notes',{}).items():
            c['notes'].setdefault(canon(n),[]).extend(t if isinstance(t,list) else [t])
        for n,a in ch.get('aliases',{}).items():
            k=canon(n); c['aliases'].setdefault(k,[]); c['aliases'][k]+= [x for x in a if x!=k and x not in c['aliases'][k]]
        c['aliases']={k:v for k,v in c['aliases'].items() if v}
        used|=set(c['seen'])|set(c['notes'])|set(c['aliases']); chapters.append(c)
chapters.sort(key=lambda c:c['chapter'])
byname={e['name']:e for e in r}
spec={'batch':f'b{b}','existing':{},'new':{},'chapters':chapters}
for n in sorted(used):
    e=byname[n]
    if e['id'] in imported: spec['existing'][n]=e['id']
    else: spec['new'][n]=e['type']
json.dump(spec,open(f'/home/claude/crawler-codex/import/batches/b{b}.spec.json','w'),indent=1)
print(f'book {b}: {len(chapters)} chapters, {len(spec["new"])} new, {len(spec["existing"])} existing; chapters {[c["chapter"] for c in chapters][:3]}..{chapters[-1]["chapter"]}')
