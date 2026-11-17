import re,json,sys,subprocess
url=sys.argv[1]; out=sys.argv[2] if len(sys.argv)>2 else None
h=subprocess.run(['curl','-sS','-L','-A','Mozilla/5.0 Chrome/130',url],capture_output=True,text=True).stdout
m=re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',h,re.S)
d=json.loads(m.group(1))['props']['pageProps']
fb=d.get('fallback') or {}
st=next(iter(fb.values()))
info={k:st.get(k) for k in ['id','brandName','name','address','schedule','categories','location','city','logo','backgroundImage','schedules']}
info['url']=url
cats=[]
for c in st.get('corridors',[]):
    prods=[]
    for p in c.get('products',[]):
        prods.append({'name':p.get('name'),'desc':(p.get('description') or '').strip(),'price':p.get('price') or p.get('realPrice'),'img':p.get('image')})
    cats.append({'name':c.get('name'),'products':prods})
info['menu']=cats
if out: json.dump(info,open(out,'w'),ensure_ascii=False,indent=1)
print(json.dumps({k:v for k,v in info.items() if k not in('menu','schedules')},ensure_ascii=False))
for c in cats: print(' #',c['name'],len(c['products']),'|',' ; '.join(f"{p['name']} ${p['price']}" for p in c['products'][:4]))
