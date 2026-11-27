# Flag notes containing capitalized words that never appear in the transcripts up to (and including) that chapter.
import json,glob,re,sys
txt={}
for f in glob.glob('chapters/B*/c*.txt'):
    b,c=map(int,re.findall(r'B(\d)/c(\d+)',f)[0]); txt[(b,c)]=open(f).read().lower()
keys=sorted(txt)
def upto(b,c): return ' '.join(txt[k] for k in keys if k<=(b,c))
cache={}; flags=0
roster=json.load(open('roster/roster.json')); rnames=' '.join(e['name'].lower()+' '+' '.join(a.lower() for a in e['aliases']) for e in roster)
for f in sorted(glob.glob('parts/*.json')):
    for ch in json.load(open(f))['chapters']:
        k=(ch['book'],ch['chapter']); t=cache.setdefault(k,upto(*k))
        for n,v in ch.get('notes',{}).items():
            for s in (v if isinstance(v,list) else [v]):
                words=set(re.findall(r"\b[A-Z][a-zA-Z'\-]{2,}",s))-{'The','Carl','Donut','Has','Is','Gets','Now','After','When','His','Her','She','They','Their','Its','Says','Learns','Becomes'}
                bad=[w for w in words if w.lower().rstrip("'s") not in t and w.lower() not in t]
                if bad: flags+=1; print(f'{f} B{k[0]}c{k[1]} {n}: {bad} :: {s}')
print('flags',flags,file=sys.stderr)
