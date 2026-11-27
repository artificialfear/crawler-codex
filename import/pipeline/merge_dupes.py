# python3 merge_dupes.py "Keep Name" "Dup1" ["Dup2"...]: fold duplicate roster entries into one (dupes become aliases)
import json,sys
imp=set(json.load(open('imported_ids.json')))
r=json.load(open('roster/roster.json')); keep=[e for e in r if e['name']==sys.argv[1]][0]
for d in sys.argv[2:]:
    e=[x for x in r if x['name']==d][0]
    assert e['id'] not in imp, f'{d} already imported; fix in the Sheet instead'
    r.remove(e); keep['aliases'] += [d]+[a for a in e['aliases'] if a not in keep['aliases']]
json.dump(r,open('roster/roster.json','w'),indent=1); print('kept',keep['name'],keep['aliases'])
