import os,re,glob,json
src='/home/claude/tx'; out='/home/claude/work/chapters'; plan={}
for bdir in sorted(glob.glob(src+'/Book0*')):
    b=int(bdir[-2:]); files=sorted(glob.glob(bdir+'/m*.txt'))
    chs=[]; last=0; pending=[]
    for f in files:
        head,_,body=open(f).read().partition('\n')
        m=re.search(r'spoken_chapter (\w+)',head); sc=m.group(1)
        title=re.search(r"title '([^']*)'",head).group(1)
        words=len(body.split())
        if sc!='None':
            n=int(sc); last=n; chs.append([n,f,words])
        else:
            if words<300 or 'Credits' in title: continue  # intro/credits
            if re.match(r"\s*(Thank you for listening|That's the end|Dedication|Acknowledg)", body): continue
            chs.append([last+1,f,words])  # epilogue / post-epilogue bonus
    os.makedirs(f'{out}/B{b}',exist_ok=True)
    agg={}
    for n,f,w in chs:
        agg.setdefault(n,[]).append(open(f).read().partition('\n')[2])
    for n,parts in agg.items():
        open(f'{out}/B{b}/c{n:02d}.txt','w').write(f'# Book {b} Chapter {n}\n'+'\n\n'.join(parts))
    plan[b]={n:sum(len(p.split()) for p in ps) for n,ps in agg.items()}
json.dump(plan,open('plan.json','w'))
for b,p in plan.items(): print(b,len(p),min(p),max(p),sum(p.values()))
