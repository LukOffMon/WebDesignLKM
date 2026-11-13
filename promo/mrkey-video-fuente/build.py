import json
t=json.load(open('timing.json'))
s=open('anim.html').read().replace('__TIMING__',json.dumps([{k:v for k,v in x.items() if k in('id','start','dur','text')} for x in t],ensure_ascii=False))
open('built.html','w').write(s)
