# Player track number -> real chapter, per book, from transcript headers (same rules as split.py).
import re,glob,json,sys
src='/home/claude/tx'; out={}
for bdir in sorted(glob.glob(src+'/Book0*')):
    b=int(bdir[-2:]); files=sorted(glob.glob(bdir+'/m*.txt'))
    rows=[]
    for f in files:
        head,_,body=open(f).read().partition('\n')
        m=int(re.search(r'marker (\d+)',head).group(1)); sc=re.search(r'spoken_chapter (\w+)',head).group(1)
        rows.append((m, None if sc=='None' else int(sc)))
    rows.sort()
    mp=[]; nxt=None
    # unnumbered tracks take the NEXT numbered chapter (intro/dedication/prologue/interlude); trailing ones take the last
    for i,(m,sc) in enumerate(rows):
        if sc is not None: mp.append(sc); continue
        later=[x for _,x in rows[i+1:] if x is not None]
        mp.append(later[0] if later else max(x for _,x in rows if x is not None)+1)
    # trailing credits beyond the epilogue -> epilogue number
    last=max(x for _,x in rows if x is not None)
    mp=[min(x,last+1) for x in mp]
    out[b]=mp
json.dump(out,open('player_map.json','w'))
for b,mp in out.items():
    offs=sorted(set(i+1-c for i,c in enumerate(mp)))
    print(b,len(mp),'tracks; offsets',offs[:6], 'first',mp[:5],'last',mp[-4:])

if len(sys.argv) > 1:   # python3 player_map.py path/to/core.js  -> rewrite the PLAYER_MAP block
    p=sys.argv[1]; s=open(p).read()
    a=s.index('  const PLAYER_MAP = '); e=s.index('  // PLAYER_MAP:END')
    s=s[:a]+'  const PLAYER_MAP = '+json.dumps({int(k):v for k,v in out.items()},separators=(',',':'))+';\n'+s[e:]
    open(p,'w').write(s); print('updated',p)
