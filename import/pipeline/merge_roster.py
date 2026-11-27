# Add new entries from finished parts to the roster (dedupe by normalized name/alias). Prints collisions for review.
import json,glob,re,sys
norm=lambda s:re.sub(r'^(the )','',re.sub(r'[^a-z0-9 ]','',s.lower())).strip()
slug=lambda s:re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
r=json.load(open('roster/roster.json')); idx={}
for e in r:
    for n in [e['name']]+e['aliases']: idx.setdefault(norm(n),e)
added=0
for f in sorted(glob.glob('parts/*.json')):
    p=json.load(open(f))
    al={}
    for ch in p['chapters']:
        for n,a in ch.get('aliases',{}).items(): al.setdefault(n,[]).extend(a)
    for n,v in p.get('new',{}).items():
        t=v['type'] if isinstance(v,dict) else v
        e=idx.get(norm(n))
        if e:
            if e['name']!=n: print(f'merge: {f}: "{n}" -> "{e["name"]}"')
            continue
        e={'name':n,'id':'imp-'+slug(n),'type':t,'aliases':[],'from':f}; r.append(e); added+=1
        idx[norm(n)]=e
    for n,a in al.items():
        e=idx.get(norm(n))
        if e:
            for x in a:
                if x not in e['aliases'] and x!=e['name']: e['aliases'].append(x); idx.setdefault(norm(x),e)
json.dump(r,open('roster/roster.json','w'),indent=1)
print('added',added,'total',len(r))
