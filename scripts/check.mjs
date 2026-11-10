import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',`${name}.json`),'utf8'));
const events=['foundations','modern','context'].flatMap(read);
const atlas=read('atlas'),curation=read('curation'),media=read('media');
const ids=new Set(),categories=new Set(['foundations','text','image','video','audio','3d','tools','industry','safety']);
const source=s=>{assert.ok(s.title);assert.equal(new URL(s.url).protocol,'https:');};
for(const e of events){
  assert.match(e.id,/^[a-z0-9-]+$/);assert.ok(!ids.has(e.id),`duplicate: ${e.id}`);ids.add(e.id);
  assert.match(e.date,/^\d{4}(-\d{2})?(-\d{2})?$/);assert.ok(e.date<='2026-10-24');
  assert.ok(categories.has(e.category));
  for(const key of ['title','subtitle','summary','why','mechanism','org'])assert.ok(e[key]?.trim(),`${e.id}: ${key}`);
  assert.ok(e.artifact?.label);assert.ok(e.artifact.lines.length>=3);assert.ok(e.sources.length);e.sources.forEach(source);
}
for(const e of events)for(const id of e.related||[])assert.ok(ids.has(id),`${e.id} related ${id}`);
assert.equal(new Set(curation.featuredIds).size,curation.featuredIds.length);
curation.featuredIds.forEach(id=>assert.ok(ids.has(id),`featured missing: ${id}`));
curation.featuredIds.forEach(id=>assert.ok(media[id],`主展览缺少对应资料: ${id}`));
for(const [id,m] of Object.entries(media)){
  assert.ok(ids.has(id));assert.ok(['image','video','embed','audio'].includes(m.type));
  for(const key of ['src','alt','caption','sourceTitle','sourceUrl','credit','date'])assert.ok(m[key],`${id}: ${key}`);
  assert.equal(new URL(m.sourceUrl).protocol,'https:');
  if(m.type==='embed'){assert.ok(['player.vimeo.com','www.youtube-nocookie.com'].includes(new URL(m.src).hostname));assert.ok(m.poster);}
  for(const src of [m.type==='embed'?null:m.src,m.poster,m.originalSrc].filter(Boolean)){assert.ok(src.startsWith('./assets/'));assert.ok(fs.statSync(path.join(root,src)).size>100);}
  if(m.type==='audio'){
    assert.ok(m.samples?.length>1);
    for(const sample of m.samples){assert.ok(sample.label);assert.ok(sample.src.startsWith('./assets/'));assert.ok(sample.durationSeconds>0);assert.match(sample.mime,/^audio\//);assert.equal(new URL(sample.sourceUrl).protocol,'https:');assert.ok(fs.statSync(path.join(root,sample.src)).size>100);}
  }
  if(m.panels){
    assert.equal(m.type,'image');assert.equal(m.imageSize.length,2);assert.ok(m.panels.length>=1);
    for(const panel of m.panels){
      assert.ok(panel.alt);if(m.panels.length>1)assert.ok(panel.label);assert.equal(panel.crop.length,4);
      const [x,y,w,h]=panel.crop;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=m.imageSize[0]&&y+h<=m.imageSize[1]);
    }
  }
  if(m.pages){
    assert.ok(m.pages.length>1,`${id}: reader needs multiple pages`);
    for(const page of m.pages){
      assert.ok(page.label&&page.alt);assert.ok(page.src.startsWith('./assets/'));
      assert.ok(fs.statSync(path.join(root,page.src)).size>100);
    }
  }
  if(m.explore)assert.ok(m.panels?.length>3,`${id}: comparison needs multiple results`);
}
for(const c of atlas.concepts){assert.ok(c.term&&c.definition&&c.pitfall);c.sources.forEach(source);}
for(const p of atlas.platforms){assert.ok(p.name&&p.company&&p.note);assert.equal(new URL(p.url).protocol,'https:');}
for(const name of ['LibTV','TapNow'])assert.ok(atlas.platforms.some(p=>p.name.toLowerCase().includes(name.toLowerCase())));
assert.ok(atlas.platforms.some(p=>p.name.includes('即梦')));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.includes('<title>AIGC Artifacts｜档案</title>'));
assert.ok(html.includes('./assets/favicon.png'));
assert.ok(!html.includes('data-tab="workflows"'));assert.ok(!html.includes('id="position"'));assert.ok(!html.includes('生成纪'));
const totalMediaBytes=Object.values(media).reduce((total,m)=>total+(m.type==='embed'?0:fs.statSync(path.join(root,m.src)).size),0);
console.log(JSON.stringify({result:'passed',events:events.length,featured:curation.featuredIds.length,concepts:atlas.concepts.length,platforms:atlas.platforms.length,media:Object.keys(media).length,mediaMiB:Math.round(totalMediaBytes/1048576*10)/10},null,2));
