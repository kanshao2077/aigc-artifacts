from pathlib import Path
import json
from PIL import Image
root=Path(__file__).resolve().parent.parent
p=root/'data/media.json'; media=json.loads(p.read_text());before=after=0;count=0
for m in media.values():
 if m['type']!='image' or not m['src'].endswith('.png'):continue
 src=root/m['src']; out=src.with_name(src.stem+'-lossless.webp')
 with Image.open(src) as im: im.save(out,'WEBP',lossless=True,method=6)
 if out.stat().st_size>=src.stat().st_size:out.unlink();continue
 before+=src.stat().st_size;after+=out.stat().st_size;count+=1
 m.setdefault('originalSrc',m['src']);m['src']='./'+str(out.relative_to(root))
p.write_text(json.dumps(media,ensure_ascii=False,indent=2)+'\n')
print(dict(images=count,beforeBytes=before,afterBytes=after))
